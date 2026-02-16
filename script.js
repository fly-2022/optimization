let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isDragging = false;
let dragMode = null;

const table = document.getElementById("rosterTable");
const manningSummary = document.getElementById("manningSummary");

function range(prefix, start, end) {
  let arr = [];
  for (let i = start; i <= end; i++) arr.push(prefix + i);
  return arr;
}

const zones = {
  arrival: [
    { name: "Zone 1", counters: range("AC", 1, 10) },
    { name: "Zone 2", counters: range("AC", 11, 20) },
    { name: "Zone 3", counters: range("AC", 21, 30) },
    { name: "Zone 4", counters: range("AC", 31, 40) },
    { name: "BIKES", counters: ["AM41", "AM43"] }
  ],
  departure: [
    { name: "Zone 1", counters: range("DC", 1, 8) },
    { name: "Zone 2", counters: range("DC", 9, 19) },
    { name: "Zone 3", counters: range("DC", 20, 29) },
    { name: "Zone 4", counters: range("DC", 30, 36) },
    { name: "BIKES", counters: ["DM37A", "DM37C"] }
  ]
};

function generateTimeSlots() {
  let slots = [];
  let start = currentShift === "morning" ? 10 : 22;
  let totalSlots = 48;

  for (let i = 0; i < totalSlots; i++) {
    let hour = (start + Math.floor(i / 4)) % 24;
    let min = (i % 4) * 15;
    slots.push(
      String(hour).padStart(2, "0") +
      String(min).padStart(2, "0")
    );
  }
  return slots;
}

function renderTable() {
  table.innerHTML = "";
  const slots = generateTimeSlots();

  zones[currentMode].forEach(zone => {

    let zoneHeader = document.createElement("tr");
    let zh = document.createElement("td");
    zh.colSpan = slots.length + 1;
    zh.className = "zone-header";
    zh.innerText = zone.name;
    zoneHeader.appendChild(zh);
    table.appendChild(zoneHeader);

    zone.counters.forEach(counter => {
      let row = document.createElement("tr");

      let label = document.createElement("td");
      label.className = "label-cell";
      label.innerText = counter;
      row.appendChild(label);

      slots.forEach((t, index) => {
        let cell = document.createElement("td");
        cell.dataset.zone = zone.name;
        cell.dataset.index = index;
        attachCellEvents(cell);
        row.appendChild(cell);
      });

      table.appendChild(row);
    });

  });

  renderManningSummary();
}

function attachCellEvents(cell) {
  cell.addEventListener("pointerdown", e => {
    isDragging = true;
    dragMode = cell.classList.contains("active") ? "remove" : "add";
    toggleCell(cell);
  });

  cell.addEventListener("pointerenter", e => {
    if (isDragging) toggleCell(cell);
  });

  cell.addEventListener("pointerup", () => isDragging = false);
  cell.addEventListener("pointerleave", () => isDragging = false);

  cell.addEventListener("click", () => {
    toggleCell(cell);
  });
}

function toggleCell(cell) {
  if (dragMode === "remove" || cell.classList.contains("active")) {
    cell.classList.remove("active");
    cell.style.background = "";
  } else {
    cell.classList.add("active");
    cell.style.background = currentColor;
  }
  renderManningSummary();
}

function renderManningSummary() {
  manningSummary.innerHTML = "";
  const slots = generateTimeSlots();

  let header = document.createElement("tr");
  ["Time", "Cars/Bikes", "Zone1/2/3/4"].forEach(text => {
    let th = document.createElement("th");
    th.innerText = text;
    header.appendChild(th);
  });
  manningSummary.appendChild(header);

  slots.forEach((time, index) => {
    let car = 0;
    let bike = 0;
    let z = { "Zone 1": 0, "Zone 2": 0, "Zone 3": 0, "Zone 4": 0 };

    document.querySelectorAll(`#rosterTable td.active[data-index="${index}"]`)
      .forEach(td => {
        let zone = td.dataset.zone;
        if (zone === "BIKES") bike++;
        else {
          car++;
          if (z[zone] !== undefined) z[zone]++;
        }
      });

    let row = document.createElement("tr");
    row.innerHTML = `
      <td>${time}</td>
      <td>${String(car).padStart(2,"0")}/${String(bike).padStart(2,"0")}</td>
      <td>${z["Zone 1"]}/${z["Zone 2"]}/${z["Zone 3"]}/${z["Zone 4"]}</td>
    `;
    manningSummary.appendChild(row);
  });
}

/* Segmented Buttons */

document.getElementById("arrivalBtn").onclick = function() {
  currentMode = "arrival";
  currentColor = "#4CAF50";
  document.getElementById("modeHighlight").style.transform = "translateX(0%)";
  renderTable();
};

document.getElementById("departureBtn").onclick = function() {
  currentMode = "departure";
  currentColor = "#FF9800";
  document.getElementById("modeHighlight").style.transform = "translateX(100%)";
  renderTable();
};

document.getElementById("morningBtn").onclick = function() {
  currentShift = "morning";
  document.getElementById("shiftHighlight").style.transform = "translateX(0%)";
  renderTable();
};

document.getElementById("nightBtn").onclick = function() {
  currentShift = "night";
  document.getElementById("shiftHighlight").style.transform = "translateX(100%)";
  renderTable();
};

document.getElementById("clearGridBtn").onclick = function() {
  document.querySelectorAll("#rosterTable td.active").forEach(td => {
    td.classList.remove("active");
    td.style.background = "";
  });
  renderManningSummary();
};

renderTable();
