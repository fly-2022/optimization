const grid = document.getElementById("grid");
const clearBtn = document.getElementById("clearBtn");
const colorButtons = document.querySelectorAll(".color-btn");

let currentColor = "#4CAF50";
let isDragging = false;
let dragMode = "add";

/* ============================= */
/* CREATE GRID */
/* ============================= */

for (let i = 0; i < 140; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  grid.appendChild(cell);
}

/* ============================= */
/* SEGMENT CONTROL LOGIC */
/* ============================= */

document.querySelectorAll(".segmented").forEach(segment => {
  const buttons = segment.querySelectorAll(".segment-btn");
  const highlight = segment.querySelector(".segment-highlight");

  buttons.forEach((btn, index) => {
    btn.addEventListener("click", () => {

      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      highlight.style.transform = `translateX(${index * 100}%)`;

      // Arrival / Departure default color
      if (btn.dataset.value === "arrival") {
        currentColor = "#4CAF50";
      }
      if (btn.dataset.value === "departure") {
        currentColor = "#FFA500";
      }
    });
  });
});

/* ============================= */
/* COLOR PICKER */
/* ============================= */

colorButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentColor = btn.dataset.color;
  });
});

/* ============================= */
/* GRID INTERACTION */
/* ============================= */

function applyColor(cell) {
  if (dragMode === "add") {
    cell.style.background = currentColor;
    cell.classList.add("active-cell");
  } else {
    cell.style.background = "white";
    cell.classList.remove("active-cell");
  }
}

grid.addEventListener("pointerdown", e => {
  if (!e.target.classList.contains("cell")) return;
  isDragging = true;

  if (e.target.classList.contains("active-cell")) {
    dragMode = "remove";
  } else {
    dragMode = "add";
  }

  applyColor(e.target);
});

grid.addEventListener("pointerover", e => {
  if (!isDragging) return;
  if (!e.target.classList.contains("cell")) return;
  applyColor(e.target);
});

window.addEventListener("pointerup", () => {
  isDragging = false;
});

/* ============================= */
/* CLEAR GRID */
/* ============================= */

clearBtn.addEventListener("click", () => {
  document.querySelectorAll(".cell").forEach(cell => {
    cell.style.background = "white";
    cell.classList.remove("active-cell");
  });
});
