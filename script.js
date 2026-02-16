// ----------------- STATE -----------------
let currentMode = "arrival";
let currentShift = "morning";
let currentColor = null;

let isDragging = false;
let dragMode = "apply";
let lastCell = null;

// ----------------- ZONES -----------------
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

function range(prefix, start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(prefix + i);
  return arr;
}

// ----------------- TIME SLOTS -----------------
function generateTimeSlots() {
  const slots = [];
  const startHour = currentShift === "morning" ? 10 : 22;
  for (let i = 0; i < 48; i++) {
    const hour = (startHour + Math.floor(i / 4)) % 24;
    const minute = (i % 4) * 15;
    slots.push(String(hour).padStart(2, "0") + String(minute).padStart(2, "0"));
  }
  return slots;
}

// ----------------- RENDER TABLE -----------------
function renderTable() {
  const container = document.getElementById("tableContainer");
  container.innerHTML = "";
  const slots = generateTimeSlots();

  zones[currentMode].forEach(zone => {

    // Zone header
    const zoneTitle = document.createElement("h3");
    zoneTitle.innerText = zone.name;
    container.appendChild(zoneTitle);

    const table = document.createElement("table");

    // Time row above counters
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th")); // empty top-left cell
    slots.forEach(slot => {
      const th = document.createElement("th");
      th.innerText = slot;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Counters
    zone.counters.forEach(counter => {
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.innerText = counter;
      row.appendChild(label);

      slots.forEach(() => {
        const cell = document.createElement("td");
        attachCellEvents(cell);
        row.appendChild(cell);
      });

      table.appendChild(row);
    });

    container.appendChild(table);
  });
}

// ----------------- CELL EVENTS -----------------
function attachCellEvents(cell) {
  // Start drag
  cell.addEventListener("pointerdown", e => {
    isDragging = true;
    lastCell = cell;
    dragMode = cell.style.backgroundColor ? "remove" : "apply";
    applyCell(cell);
  });

  // Click/tap for single cell
  cell.addEventListener("click", e => {
    if (!isDragging) {
      dragMode = cell.style.backgroundColor ? "remove" : "apply";
      applyCell(cell);
    }
  });
}

// ----------------- APPLY CELL -----------------
function applyCell(cell) {
  const color = currentColor || getModeColor();
  if (dragMode === "apply") {
    cell.style.background = color;
    cell.classList.add("active-cell");
  } else {
    cell.style.background = "";
    cell.classList.remove("active-cell");
  }
}

// ----------------- GLOBAL DRAG -----------------
window.addEventListener("pointermove", e => {
  if (!isDragging) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el && el.tagName === "TD" && el !== lastCell) {
    applyCell(el);
    lastCell = el;
  }
});

window.addEventListener("pointerup", () => {
  isDragging = false;
  lastCell = null;
});

// ----------------- MODE COLOR -----------------
function getModeColor() {
  if (currentMode === "arrival") return "#4CAF50";
  if (currentMode === "departure") return "#FF9800";
  return "#dddddd";
}

// ----------------- SEGMENTED CONTROLS -----------------
function initSegmented() {
  document.querySelectorAll(".segmented").forEach(group => {
    const buttons = group.querySelectorAll(".seg-btn");
    const bg = group.querySelector(".segmented-bg");

    buttons.forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        bg.style.transform = `translateX(${idx * 100}%)`;

        // Update current mode / shift
        if (btn.dataset.type) currentMode = btn.dataset.type;
        if (btn.dataset.shift) currentShift = btn.dataset.shift;
        renderTable();
      });
    });
  });
}

// ----------------- COLOR PICKER -----------------
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    currentColor = btn.dataset.color;
  });
});

// ----------------- CLEAR GRID -----------------
document.getElementById("clearGrid").addEventListener("click", () => {
  document.querySelectorAll("td").forEach(cell => {
    cell.style.background = "";
    cell.classList.remove("active-cell");
  });
});

// ----------------- INIT -----------------
currentColor = "#4CAF50";
initSegmented();
renderTable();
