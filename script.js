const container = document.getElementById("tableContainer");

const times = ["0800","0900","1000","1100","1200","1300"];
const zones = ["Zone 1","Zone 2","Zone 3","Zone 4","Bikes"];

let currentColor = "#4CAF50";
let isDragging = false;
let dragMode = "apply";
let lastCell = null;

/* ===== Segmented Controls ===== */
document.querySelectorAll(".segmented").forEach(group => {
  const buttons = group.querySelectorAll(".seg-btn");
  const bg = group.querySelector(".segmented-bg");

  buttons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      bg.style.transform = `translateX(${index * 100}%)`;
    });
  });
});

/* ===== Color Picker ===== */
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    currentColor = btn.dataset.color;
  });
});

/* ===== Table Render ===== */
function renderTable() {
  container.innerHTML = "";

  zones.forEach(zone => {

    const zoneTitle = document.createElement("h3");
    zoneTitle.innerText = zone;
    container.appendChild(zoneTitle);

    const table = document.createElement("table");
    const header = document.createElement("tr");

    times.forEach(time => {
      const th = document.createElement("th");
      th.innerText = time;
      header.appendChild(th);
    });

    table.appendChild(header);

    const row = document.createElement("tr");

    times.forEach(() => {
      const cell = document.createElement("td");

      cell.addEventListener("pointerdown", (e) => {
        isDragging = true;
        dragMode = cell.classList.contains("active-cell") ? "remove" : "apply";
        applyCell(cell);
        lastCell = cell;
      });

      row.appendChild(cell);
    });

    table.appendChild(row);
    container.appendChild(table);
  });
}

function applyCell(cell) {
  if (dragMode === "remove") {
    cell.style.background = "";
    cell.classList.remove("active-cell");
  } else {
    cell.style.background = currentColor;
    cell.classList.add("active-cell");
  }
}

/* ===== Drag System (Mobile + Desktop) ===== */
window.addEventListener("pointermove", (e) => {
  if (!isDragging) return;

  const element = document.elementFromPoint(e.clientX, e.clientY);

  if (element && element.tagName === "TD" && element !== lastCell) {
    applyCell(element);
    lastCell = element;
  }
});

window.addEventListener("pointerup", () => {
  isDragging = false;
  lastCell = null;
});

/* ===== Clear Grid ===== */
document.getElementById("clearGrid").addEventListener("click", () => {
  document.querySelectorAll("td").forEach(cell => {
    cell.style.background = "";
    cell.classList.remove("active-cell");
  });
});

renderTable();
