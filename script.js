// -----------------------------
// GLOBAL STATE
// -----------------------------
let currentMode = "arrival";
let currentShift = "morning";
let isMouseDown = false; // for drag selection
let dragMode = true;      // track whether we're activating or deactivating cells

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");

// -----------------------------
// ZONE CONFIGURATION
// -----------------------------
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
    { name: "Zone 4", counters: range("DC", 29, 36) },
    { name: "BIKES", counters: ["DM37A", "DM37C"] }
  ]
};

// -----------------------------
// HELPER: RANGE GENERATOR
// -----------------------------
function range(prefix, start, end) {
  let arr = [];
  for (let i = start; i <= end; i++) arr.push(prefix + i);
  return arr;
}

// -----------------------------
// GENERATE TIME SLOTS
// -----------------------------
function generateTimeSlots() {
  let slots = [];
  let startHour = currentShift === "morning" ? 10 : 22;
  let totalSlots = 48; // 12 hours × 4 (15-min intervals)
  for (let i = 0; i < totalSlots; i++) {
    let hour = (startHour + Math.floor(i / 4)) % 24;
    let minute = (i % 4) * 15;
    slots.push(String(hour).padStart(2, "0") + String(minute).padStart(2, "0"));
  }
  return slots;
}

// -----------------------------
// RENDER TABLE
// -----------------------------
function renderTable() {
  table.innerHTML = "";
  const timeSlots = generateTimeSlots();

  // Header row
  let headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th"));
  timeSlots.forEach(time => {
    let th = document.createElement("th");
    th.innerText = time;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Body rows
  zones[currentMode].forEach(zone => {
    let zoneRow = document.createElement("tr");
    let zoneCell = document.createElement("td");
    zoneCell.innerText = zone.name;
    zoneCell.colSpan = timeSlots.length + 1;
    zoneCell.style.backgroundColor = "#eeeeee";
    zoneCell.style.fontWeight = "bold";
    zoneRow.appendChild(zoneCell);
    table.appendChild(zoneRow);

    zone.counters.forEach(counter => {
      let row = document.createElement("tr");
      let label = document.createElement("td");
      label.innerText = counter;
      label.style.fontWeight = "bold";
      row.appendChild(label);

      timeSlots.forEach(() => {
        let cell = document.createElement("td");

        // Toggle cell individually
        cell.addEventListener("mousedown", (e) => {
          isMouseDown = true;
          dragMode = !cell.classList.contains("active");
          cell.classList.toggle("active", dragMode);
          updateSummary();
          e.preventDefault(); // prevent text selection
        });

        cell.addEventListener("mouseover", () => {
          if (isMouseDown) {
            cell.classList.toggle("active", dragMode);
            updateSummary();
          }
        });

        cell.addEventListener("mouseup", () => { isMouseDown = false; });

        row.appendChild(cell);
      });

      table.appendChild(row);
    });
  });

  updateSummary();
}

// -----------------------------
// UPDATE SUMMARY
// -----------------------------
function updateSummary() {
  let activeCells = document.querySelectorAll("td.active").length;
  summary.innerHTML =
    `Current Mode: <b>${currentMode.toUpperCase()}</b> |
     Current Shift: <b>${currentShift.toUpperCase()}</b> |
     Total Manning Slots Selected: <b>${activeCells}</b>`;
}

// -----------------------------
// UPDATE BUTTONS & HIGHLIGHT
// -----------------------------
function updateButtons() {
  document.getElementById("arrivalBtn").className = "mode-btn";
  document.getElementById("departureBtn").className = "mode-btn";
  document.getElementById("morningBtn").className = "shift-btn";
  document.getElementById("nightBtn").className = "shift-btn";

  if (currentMode === "arrival") document.getElementById("arrivalBtn").classList.add("active-arrival");
  else document.getElementById("departureBtn").classList.add("active-departure");

  if (currentShift === "morning") document.getElementById("morningBtn").classList.add("active-morning");
  else document.getElementById("nightBtn").classList.add("active-night");

  updateHighlight();
}

// -----------------------------
// SLIDING HIGHLIGHT
// -----------------------------
function updateHighlight() {
  const modeHighlight = document.querySelector(".mode-highlight");
  const shiftHighlight = document.querySelector(".shift-highlight");

  if (currentMode === "arrival") {
    modeHighlight.style.left = "0%";
    modeHighlight.style.backgroundColor = "#4CAF50";
  } else {
    modeHighlight.style.left = "50%";
    modeHighlight.style.backgroundColor = "#ff9800";
  }

  if (currentShift === "morning") {
    shiftHighlight.style.left = "0%";
    shiftHighlight.style.backgroundColor = "#b0bec5";
  } else {
    shiftHighlight.style.left = "50%";
    shiftHighlight.style.backgroundColor = "#ddd";
  }
}

// -----------------------------
// BUTTON EVENT LISTENERS
// -----------------------------
document.getElementById("arrivalBtn").onclick = () => { currentMode = "arrival"; updateButtons(); renderTable(); };
document.getElementById("departureBtn").onclick = () => { currentMode = "departure"; updateButtons(); renderTable(); };
document.getElementById("morningBtn").onclick = () => { currentShift = "morning"; updateButtons(); renderTable(); };
document.getElementById("nightBtn").onclick = () => { currentShift = "night"; updateButtons(); renderTable(); };

// -----------------------------
// INITIAL LOAD
// -----------------------------
updateButtons();
renderTable();

// End mouse drag
document.addEventListener("mouseup", () => { isMouseDown = false; });
