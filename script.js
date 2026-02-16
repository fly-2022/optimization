let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";

let isDragging = false;
let dragMode = "apply";

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");

/* ================= SEGMENTED CONTROL ================= */

document.querySelectorAll(".segmented").forEach(segment => {
  const buttons = segment.querySelectorAll(".segment-btn");
  const highlight = segment.querySelector(".segment-highlight");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      highlight.style.transform = `translateX(${btn.dataset.index * 100}%)`;
    });
  });
});

/* ================= COLOR PICKER ================= */

document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentColor = btn.dataset.color;
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});
document.querySelector(".color-btn").classList.add("selected");

/* ================= CLEAR ================= */

document.getElementById("clearGridBtn").addEventListener("click", () => {
  document.querySelectorAll("#rosterTable td").forEach(td => {
    td.style.backgroundColor = "";
    td.classList.remove("active-cell");
  });
});

/* ================= DATA ================= */

const zones = {
  arrival: [
    { name: "Zone 1", counters: range("AC", 1, 10) },
    { name: "Zone 2", counters: range("AC", 11, 20) }
  ],
  departure: [
    { name: "Zone 1", counters: range("DC", 1, 8) },
    { name: "Zone 2", counters: range("DC", 9, 19) }
  ]
};

function range(p, s, e) {
  let arr = [];
  for (let i = s; i <= e; i++) arr.push(p + i);
  return arr;
}

function generateTimeSlots() {
  const slots = [];
  const start = currentShift === "morning" ? 10 : 22;
  for (let i = 0; i < 48; i++) {
    const hour = (start + Math.floor(i / 4)) % 24;
    const minute = (i % 4) * 15;
    slots.push(String(hour).padStart(2, "0") + String(minute).padStart(2, "0"));
  }
  return slots;
}

/* ================= RENDER TABLE ================= */

function renderTable() {
  table.innerHTML = "";
  const timeSlots = generateTimeSlots();

  zones[currentMode].forEach(zone => {

    // Repeat time header above every zone
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th"));
    timeSlots.forEach(t => {
      const th = document.createElement("th");
      th.innerText = t;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Zone label
    const zoneRow = document.createElement("tr");
    const zoneCell = document.createElement("td");
    zoneCell.innerText = zone.name;
    zoneCell.colSpan = timeSlots.length + 1;
    zoneRow.classList.add("zone-row");
    zoneRow.appendChild(zoneCell);
    table.appendChild(zoneRow);

    zone.counters.forEach(counter => {
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.innerText = counter;
      row.appendChild(label);

      timeSlots.forEach(() => {
        const cell = document.createElement("td");

        cell.addEventListener("pointerdown", () => {
          isDragging = true;
          dragMode = cell.classList.contains("active-cell") ? "remove" : "apply";
          applyColor(cell);
        });

        cell.addEventListener("pointerenter", () => {
          if (isDragging) applyColor(cell);
        });

        cell.addEventListener("click", () => {
          if (!isDragging) applyColor(cell);
        });

        row.appendChild(cell);
      });

      table.appendChild(row);
    });
  });

  updateSummary();
}

window.addEventListener("pointerup", () => isDragging = false);

function applyColor(cell) {
  if (dragMode === "apply") {
    cell.style.backgroundColor = currentColor;
    cell.classList.add("active-cell");
  } else {
    cell.style.backgroundColor = "";
    cell.classList.remove("active-cell");
  }
  updateSummary();
}

/* ================= SUMMARY ================= */

function updateSummary() {
  const count = document.querySelectorAll(".active-cell").length;
  summary.innerHTML = `
    Mode: <b>${currentMode}</b> |
    Shift: <b>${currentShift}</b> |
    Selected: <b>${count}</b>
  `;
}

/* ================= MODE BUTTONS ================= */

document.getElementById("arrivalBtn").onclick = () => {
  currentMode = "arrival";
  currentColor = "#4CAF50";
  renderTable();
};

document.getElementById("departureBtn").onclick = () => {
  currentMode = "departure";
  currentColor = "#ff9800";
  renderTable();
};

document.getElementById("morningBtn").onclick = () => {
  currentShift = "morning";
  renderTable();
};

document.getElementById("nightBtn").onclick = () => {
  currentShift = "night";
  renderTable();
};

/* ================= INIT ================= */

renderTable();
