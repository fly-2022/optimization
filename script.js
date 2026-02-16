let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isDragging = false;
let dragMode = "add";

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
const manningSummaryEl = document.getElementById("manningSummary");

const modeHighlight = document.getElementById("modeHighlight");
const shiftHighlight = document.getElementById("shiftHighlight");

const arrivalBtn = document.getElementById("arrivalBtn");
const departureBtn = document.getElementById("departureBtn");
const morningBtn = document.getElementById("morningBtn");
const nightBtn = document.getElementById("nightBtn");

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
        { name: "Zone 2", counters: range("DC", 9, 18) },
        { name: "Zone 3", counters: range("DC", 19, 28) },
        { name: "Zone 4", counters: range("DC", 29, 36) },
        { name: "BIKES", counters: ["DM37A", "DM37C"] }
    ]
};

function range(prefix, start, end) { let arr = []; for (let i = start; i <= end; i++)arr.push(prefix + i); return arr; }

// ---------------- COLOR PICKER -----------------
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        currentColor = btn.dataset.color;
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
    });
});

// ---------------- CLEAR GRID -----------------
document.getElementById("clearGridBtn").addEventListener("click", () => {
    document.querySelectorAll("#rosterTable td").forEach(td => {
        td.style.background = "";
        td.classList.remove("active");
    });
    updateSummary();
    updateManningSummary();
});

function generateTimeSlots() {
    let slots = [];
    let start = currentShift === "morning" ? 10 : 22;
    for (let i = 0; i < 48; i++) {
        let total = start * 60 + i * 15;
        let hour = Math.floor((total % 1440) / 60);
        let minute = total % 60;
        slots.push(String(hour).padStart(2, "0") + String(minute).padStart(2, "0"));
    }
    return slots;
}

function renderTable() {
    table.innerHTML = "";
    const times = generateTimeSlots();

    zones[currentMode].forEach(zone => {
        let zoneRow = document.createElement("tr");
        let zoneCell = document.createElement("td");
        zoneCell.colSpan = times.length + 1;
        zoneCell.className = "zone-header";
        zoneCell.innerText = zone.name;
        zoneRow.appendChild(zoneCell);
        table.appendChild(zoneRow);

        let timeRow = document.createElement("tr");
        timeRow.className = "time-header";
        timeRow.innerHTML = "<th></th>";
        times.forEach(t => {
            let th = document.createElement("th");
            th.innerText = t;
            timeRow.appendChild(th);
        });
        table.appendChild(timeRow);

        zone.counters.forEach(counter => {
            let row = document.createElement("tr");
            let label = document.createElement("td");
            label.innerText = counter;
            row.appendChild(label);

            times.forEach((t, i) => {
                let cell = document.createElement("td");
                cell.className = "counter-cell";
                cell.dataset.zone = zone.name;
                cell.dataset.time = i;
                attachCellEvents(cell);
                row.appendChild(cell);
            });
            table.appendChild(row);
        });

        let subtotalRow = document.createElement("tr");
        subtotalRow.className = "subtotal-row";
        let subtotalLabel = document.createElement("td");
        subtotalLabel.innerText = "Subtotal";
        subtotalRow.appendChild(subtotalLabel);

        times.forEach((t, i) => {
            let td = document.createElement("td");
            td.className = "subtotal-cell";
            td.dataset.zone = zone.name;
            td.dataset.time = i;
            subtotalRow.appendChild(td);
        });
        table.appendChild(subtotalRow);
    });

    updateAll();
}

function attachCellEvents(cell) {
    cell.addEventListener("pointerdown", e => {
        isDragging = true;
        dragMode = cell.classList.contains("active") ? "remove" : "add";
        toggleCell(cell);
    });
    cell.addEventListener("pointerenter", () => {
        if (isDragging) toggleCell(cell);
    });
    cell.addEventListener("pointerup", () => isDragging = false);
    cell.addEventListener("click", () => {
        if (!isDragging) toggleCell(cell);
    });
}

function toggleCell(cell) {
    if (dragMode === "add") {
        cell.style.background = currentColor;
        cell.classList.add("active");
    } else {
        cell.style.background = "";
        cell.classList.remove("active");
    }
    updateAll();
}

document.addEventListener("pointerup", () => isDragging = false);

function updateAll() {
    updateSubtotals();
    updateGrandTotal();
    updateManningSummary();
}

function updateSubtotals() {
    document.querySelectorAll(".subtotal-cell").forEach(td => {
        let zone = td.dataset.zone;
        let time = td.dataset.time;
        let cells = [...document.querySelectorAll(`.counter-cell[data-zone="${zone}"][data-time="${time}"]`)];
        let sum = cells.filter(c => c.classList.contains("active")).length;
        td.innerText = sum;
    });
}

function updateGrandTotal() {
}

function updateManningSummary() {
    const times = generateTimeSlots();
    let text = "";
    times.forEach((time, i) => {
        let totalCars = 0;
        let zoneBreakdown = [];
        zones[currentMode].forEach(zone => {
            if (zone.name === "BIKES") return;
            let cells = [...document.querySelectorAll(`.counter-cell[data-zone="${zone.name}"][data-time="${i}"]`)];
            let count = cells.filter(c => c.classList.contains("active")).length;
            totalCars += count;
            zoneBreakdown.push(count);
        });
        let bikeCells = [...document.querySelectorAll(`.counter-cell[data-zone="BIKES"][data-time="${i}"]`)];
        let bikeCount = bikeCells.filter(c => c.classList.contains("active")).length;
        text += `${time}: ${String(totalCars).padStart(2, "0")}/${String(bikeCount).padStart(2, "0")}\n${zoneBreakdown.join("/")}\n\n`;
    });
    manningSummary.textContent = text;
}

document.getElementById("copySummaryBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(manningSummary.textContent).then(() => {
        let btn = document.getElementById("copySummaryBtn");
        btn.classList.add("copied");
        btn.innerText = "Copied ✓";
        setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerText = "Copy Manning Summary";
        }, 2000);
    });
});

document.getElementById("clearGridBtn").addEventListener("click", () => {
    document.querySelectorAll(".counter-cell").forEach(c => {
        c.style.background = "";
        c.classList.remove("active");
    });
    updateAll();
});

document.getElementById("arrivalBtn").onclick = () => {
    currentMode = "arrival";
    currentColor = "#4CAF50";
    renderTable();
};
document.getElementById("departureBtn").onclick = () => {
    currentMode = "departure";
    currentColor = "#FF9800";
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

document.querySelectorAll(".color-btn").forEach(btn => {
    btn.onclick = () => {
        currentColor = btn.dataset.color;
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
    };
});

renderTable();

// ---------------- SEGMENTED BUTTONS -----------------
function setMode(mode) {
    currentMode = mode;
    if (mode === "arrival") {
        currentColor = "#4CAF50";
        modeHighlight.style.transform = "translateX(0%)";
        modeHighlight.style.background = "#4CAF50";
        arrivalBtn.classList.add("active"); departureBtn.classList.remove("active");
    } else {
        currentColor = "#FF9800";
        modeHighlight.style.transform = "translateX(100%)";
        modeHighlight.style.background = "#FF9800";
        departureBtn.classList.add("active"); arrivalBtn.classList.remove("active");
    }
    renderTable();
}

function setShift(shift) {
    currentShift = shift;
    if (shift === "morning") {
        shiftHighlight.style.transform = "translateX(0%)";
        shiftHighlight.style.background = "#b0bec5";
        morningBtn.classList.add("active"); nightBtn.classList.remove("active");
    } else {
        shiftHighlight.style.transform = "translateX(100%)";
        shiftHighlight.style.background = "#9e9e9e";
        nightBtn.classList.add("active"); morningBtn.classList.remove("active");
    }
    renderTable();
}

arrivalBtn.onclick = () => setMode("arrival");
departureBtn.onclick = () => setMode("departure");
morningBtn.onclick = () => setShift("morning");
nightBtn.onclick = () => setShift("night");

/* ---------------- INIT ---------------- */
setMode("arrival");
setShift("morning");