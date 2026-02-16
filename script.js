let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isDragging = false;
let dragAction = "add";

const table = document.getElementById("rosterTable");
const summaryBox = document.getElementById("manningSummary");

/* ---------------- ZONES ---------------- */
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

/* ---------------- TIME ---------------- */
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

/* ---------------- RENDER TABLE ---------------- */
function renderTable() {
  table.innerHTML = "";
  const times = generateTimeSlots();
  let grandTotals = Array(48).fill(0);

  zones[currentMode].forEach(zone => {

    // Zone header
    let zRow = document.createElement("tr");
    let zCell = document.createElement("td");
    zCell.colSpan = times.length + 1;
    zCell.className = "zone-header";
    zCell.innerText = zone.name;
    zRow.appendChild(zCell);
    table.appendChild(zRow);

    // Time row
    let timeRow = document.createElement("tr");
    let blank = document.createElement("td");
    blank.innerText = "Time";
    timeRow.appendChild(blank);

    times.forEach(t => {
      let th = document.createElement("th");
      th.innerText = t;
      timeRow.appendChild(th);
    });
    table.appendChild(timeRow);

    let zoneTotals = Array(48).fill(0);

    zone.counters.forEach(counter => {
      let row = document.createElement("tr");
      let label = document.createElement("td");
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

    // Subtotal row
    let subtotalRow = document.createElement("tr");
    let subtotalLabel = document.createElement("td");
    subtotalLabel.innerText = "Subtotal";
    subtotalLabel.style.fontWeight = "bold";
    subtotalRow.appendChild(subtotalLabel);

    times.forEach((t, index) => {
      let td = document.createElement("td");
      td.className = "zone-subtotal";
      td.dataset.zone = zone.name;
      td.dataset.index = index;
      subtotalRow.appendChild(td);
    });

    table.appendChild(subtotalRow);
  });

  // Grand total row
  let gRow = document.createElement("tr");
  let gLabel = document.createElement("td");
  gLabel.innerText = "GRAND TOTAL";
  gLabel.style.fontWeight = "bold";
  gRow.appendChild(gLabel);

  times.forEach((t, index) => {
    let td = document.createElement("td");
    td.className = "grand-total";
    td.dataset.index = index;
    gRow.appendChild(td);
  });

  table.appendChild(gRow);

  updateSummary();
}

/* ---------------- CELL EVENTS ---------------- */
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

/* ---------------- UPDATE TOTALS + TEXT SUMMARY ---------------- */
function updateSummary() {

  const times = generateTimeSlots();
  let textOutput = "";

  times.forEach((time, index) => {

    let car = 0, bike = 0;
    let z1 = 0, z2 = 0, z3 = 0, z4 = 0;

    document.querySelectorAll(`td.active[data-index="${index}"]`).forEach(td => {

      if (td.dataset.zone === "BIKES") {
        bike++;
      } else {
        car++;
        if (td.dataset.zone === "Zone 1") z1++;
        if (td.dataset.zone === "Zone 2") z2++;
        if (td.dataset.zone === "Zone 3") z3++;
        if (td.dataset.zone === "Zone 4") z4++;
      }
    });

    // Update zone subtotal
    document.querySelectorAll(`.zone-subtotal[data-index="${index}"]`)
      .forEach(td => td.innerText = car + bike);

    // Update grand total
    document.querySelectorAll(`.grand-total[data-index="${index}"]`)
      .forEach(td => td.innerText = car + bike);

    // TEXT FORMAT (WhatsApp)
    textOutput += `${time}: ${String(car).padStart(2,"0")}/${String(bike).padStart(2,"0")}\n`;
    textOutput += `${z1}/${z2}/${z3}/${z4}\n\n`;
  });

  summaryBox.innerHTML = `<pre>${textOutput}</pre>`;
}

/* ---------------- BUTTONS ---------------- */
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
  document.querySelectorAll("td.active").forEach(td => {
    td.classList.remove("active");
    td.style.background = "";
  });
  updateSummary();
};

renderTable();
