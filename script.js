/* ================= EXCEL MAIN TEMPLATE SYSTEM ================= */

let excelWorkbook = null;
let excelData = {};
let historyStack = []; // ✅ moved outside DOMContentLoaded

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

function range(prefix, start, end) { let arr = []; for (let i = start; i <= end; i++) arr.push(prefix + i); return arr; }

// ---------------- COLOR PICKER -----------------
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        currentColor = btn.dataset.color;
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
    });
});

// ==================== FIXED generateTimeSlots() MATCHING EXCEL ====================
function generateTimeSlots() {
    const slots = [];
    let hour, minute, endHour, endMinute;

    if (currentShift === "morning") {
        hour = 10; minute = 0;
        endHour = 22; endMinute = 0;
        endMinute -= 15;
        if (endMinute < 0) { endHour -= 1; endMinute += 60; }
    } else { // night shift
        hour = 22; minute = 0;
        endHour = 10; endMinute = 0;
    }

    while (true) {
        const hhmm = String(hour).padStart(2, "0") + String(minute).padStart(2, "0");
        slots.push(hhmm);

        minute += 15;
        if (minute >= 60) { hour += 1; minute -= 60; }
        if (hour >= 24) hour -= 24;

        if (currentShift === "morning") {
            if (hour > endHour || (hour === endHour && minute > endMinute)) break;
        } else { // night
            if (hour === endHour && minute === endMinute) break; // ✅ ensures last slot 10:00 included
        }
    }

    return slots;
}

// ==============================================================

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

// -------------------- Event Delegation --------------------
table.addEventListener("pointerdown", e => {
    const cell = e.target.closest(".counter-cell");
    if (!cell) return;
    isDragging = true;
    dragMode = cell.classList.contains("active") ? "remove" : "add";
    toggleCell(cell);
});

table.addEventListener("pointerenter", e => {
    if (!isDragging) return;
    const cell = e.target.closest(".counter-cell");
    if (!cell) return;
    toggleCell(cell);
});

table.addEventListener("pointerup", () => isDragging = false);

table.addEventListener("click", e => {
    const cell = e.target.closest(".counter-cell");
    if (!cell) return;
    if (!isDragging) toggleCell(cell);
});

document.addEventListener("pointerup", () => isDragging = false);

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

function updateGrandTotal() { }

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

// -------------------- Excel Template / Manual Buttons --------------------
// ✅ in applyMainTemplate(): map to nearest slot if not found
// ... rest of your code unchanged ...
function applyMainTemplate(officerCount) {
    if (!excelWorkbook) { alert("Excel template not loaded."); return; }
    const sheetName = `${currentMode} ${currentShift}`.toLowerCase();
    const sheetData = excelData[sheetName];
    if (!sheetData) { alert("No sheet found for " + sheetName); return; }

    const times = generateTimeSlots();

    for (let officer = 1; officer <= officerCount; officer++) {
        const officerRows = sheetData.filter(row => parseInt(row.Officer) === officer);
        officerRows.forEach(row => {
            const counter = row.Counter;
            function normalizeExcelTime(value) {
                if (!value) return "";
                let str = value.toString().trim();
                if (str.includes(":")) { str = str.substring(0, 5); return str.replace(":", ""); }
                return str.padStart(4, "0");
            }
            const start = normalizeExcelTime(row.Start);
            const end = normalizeExcelTime(row.End);
            let startIndex = times.findIndex(t => t === start);
            let endIndex = times.findIndex(t => t === end);

            // ✅ fallback to nearest slots if not found
            if (startIndex === -1) startIndex = times.findIndex(t => parseInt(t) >= parseInt(start));
            if (endIndex === -1) { endIndex = times.findIndex(t => parseInt(t) >= parseInt(end)); if (endIndex === -1) endIndex = times.length; }

            if (startIndex === -1 || endIndex === -1) return;

            for (let t = startIndex; t < endIndex; t++) {
                let allCells = [...document.querySelectorAll(`.counter-cell[data-time="${t}"]`)];
                allCells.forEach(cell => {
                    const rowCounter = cell.parentElement.firstChild.innerText;
                    if (rowCounter === counter) {
                        cell.classList.add("active");
                        cell.style.background = currentColor;
                    }
                });
            }
        });
    }
    updateAll();
}

// ---------------- SEGMENTED BUTTONS -----------------
function setMode(mode) { currentMode = mode; currentColor = mode === "arrival" ? "#4CAF50" : "#FF9800"; renderTable(); }
function setShift(shift) { currentShift = shift; renderTable(); }

arrivalBtn.onclick = () => setMode("arrival");
departureBtn.onclick = () => setMode("departure");
morningBtn.onclick = () => setShift("morning");
nightBtn.onclick = () => setShift("night");

renderTable();
