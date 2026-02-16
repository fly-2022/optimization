let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isDragging = false;
let dragAction = "add";

const table = document.getElementById("rosterTable");
const summaryTable = document.getElementById("manningSummary");

/* ZONES EXACTLY AS YOUR ORIGINAL */
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

/* TIME */
function generateTimeSlots() {
  let slots = [];
  let start = currentShift === "morning" ? 10 : 22;

  for (let i = 0; i < 48; i++) {
    let hour = (start + Math.floor(i / 4)) % 24;
    let min = (i % 4) * 15;
    slots.push(String(hour).padStart(2, "0") + String(min).padStart(2, "0"));
  }
  return slots;
}

/* RENDER GRID */
function renderTable() {
  table.innerHTML = "";
  const times = generateTimeSlots();

  zones[currentMode].forEach(zone => {

    // Zone header
    let zRow = document.createElement("tr");
    let zCell = document.createElement("td");
    zCell.colSpan = times.length + 1;
    zCell.className = "zone-header";
    zCell.innerText = zone.name;
    zRow.appendChild(zCell);
    table.appendChild(zRow);

    // Time row BELOW zone
    let timeRow = document.createElement("tr");
    let blank = document.createElement("td");
    blank.className = "label-cell";
    blank.innerText = "Time";
    timeRow.appendChild(blank);

    times.forEach(t => {
      let th = document.createElement("th");
      th.innerText = t;
      timeRow.appendChild(th);
    });

    table.appendChild(timeRow);

    zone.counters.forEach(counter => {
      let row = document.createElement("tr");
      let label = document.createElement("td");
      label.className = "label-cell";
      label.innerText = counter;
      row.appendChild(label);

      times.forEach((t, index) => {
        let cell = document.createElement("td");
        cell.dataset.zone = zone.name;
        cell.dataset.index = index;
        attachEvents(cell);
        row.appendChild(cell);
      });

      table.appendChild(row);
    });
  });

  updateSummary();
}

/* CELL EVENTS */
function attachEvents(cell) {
  cell.addEventListener("pointerdown", () => {
    isDragging = true;
    dragAction = cell.classList.contains("active") ? "remove" : "add";
    toggle(cell);
  });

  cell.addEventListener("pointerenter", () => {
    if (isDragging) toggle(cell);
  });

  cell.addEventListener("pointerup", () => isDragging = false);

  cell.addEventListener("click", () => toggle(cell));
}

function toggle(cell) {
  if (dragAction === "remove") {
    cell.classList.remove("active");
    cell.style.background = "";
  } else {
    cell.classList.add("active");
    cell.style.background = currentColor;
  }
  updateSummary();
}

/* MANNING SUMMARY */
function updateSummary() {
  summaryTable.innerHTML = "";
  const times = generateTimeSlots();

  times.forEach((time, index) => {

    let car = 0;
    let bike = 0;
    let z1 = 0, z2 = 0, z3 = 0, z4 = 0;

    document.querySelectorAll(`#rosterTable td.active[data-index="${index}"]`)
      .forEach(td => {
        if (td.dataset.zone === "BIKES") bike++;
        else {
          car++;
          if (td.dataset.zone === "Zone 1") z1++;
          if (td.dataset.zone === "Zone 2") z2++;
          if (td.dataset.zone === "Zone 3") z3++;
          if (td.dataset.zone === "Zone 4") z4++;
        }
      });

    let row1 = document.createElement("tr");
    row1.innerHTML = `<td><b>${time}</b></td><td>${car}/${bike}</td>`;
    summaryTable.appendChild(row1);

    let row2 = document.createElement("tr");
    row2.innerHTML = `<td colspan="2">${z1}/${z2}/${z3}/${z4}</td>`;
    summaryTable.appendChild(row2);
  });
}

/* COLOR PICKER */
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.onclick = () => {
    currentColor = btn.dataset.color;
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  };
});

/* SEGMENTED */
document.getElementById("arrivalBtn").onclick = () => {
  currentMode = "arrival";
  currentColor = "#4CAF50";
  document.getElementById("modeHighlight").style.transform = "translateX(0%)";
  renderTable();
};

document.getElementById("departureBtn").onclick = () => {
  currentMode = "departure";
  currentColor = "#FF9800";
  document.getElementById("modeHighlight").style.transform = "translateX(100%)";
  renderTable();
};

document.getElementById("morningBtn").onclick = () => {
  currentShift = "morning";
  document.getElementById("shiftHighlight").style.transform = "translateX(0%)";
  renderTable();
};

document.getElementById("nightBtn").onclick = () => {
  currentShift = "night";
  document.getElementById("shiftHighlight").style.transform = "translateX(100%)";
  renderTable();
};

document.getElementById("clearGridBtn").onclick = () => {
  document.querySelectorAll("#rosterTable td.active").forEach(td => {
    td.classList.remove("active");
    td.style.background = "";
  });
  updateSummary();
};

renderTable();
