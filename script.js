/* ================= EXCEL MAIN TEMPLATE SYSTEM ================= */

let excelWorkbook = null;
let excelData = {};


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

// ================= FIXED generateTimeSlots() =================
function generateTimeSlots() {
    const slots = [];
    let startHour, startMinute, endHour, endMinute;

    if (currentShift === "morning") {
        startHour = 10; startMinute = 0;
        endHour = 21; endMinute = 45;
    } else { // night shift
        startHour = 22; startMinute = 0;
        endHour = 9; endMinute = 45; // next day
    }

    let hour = startHour;
    let minute = startMinute;

    while (true) {
        const hhmm = String(hour).padStart(2, "0") + String(minute).padStart(2, "0");
        slots.push(hhmm);

        // increment 15 min
        minute += 15;
        if (minute >= 60) {
            hour += 1;
            minute -= 60;
        }

        // wrap hour past midnight
        if (hour >= 24) hour -= 24;

        // stop condition
        if (currentShift === "morning") {
            if (hour > endHour || (hour === endHour && minute > endMinute)) break;
        } else { // night
            // stop when we reach endHour:endMinute next day
            if (hour === endHour && minute > endMinute) break;
        }
    }

    return slots;
}
// ==============================================================


function renderTable() {
    historyStack = [];
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

async function loadExcelTemplate() {
    try {
        const response = await fetch("ROSTER.xlsx");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        excelWorkbook = XLSX.read(arrayBuffer, { type: "array" });

        excelWorkbook.SheetNames.forEach(sheetName => {
            const sheet = excelWorkbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);
            excelData[sheetName.toLowerCase()] = json;
        });

        console.log("Excel template loaded:", Object.keys(excelData));
    } catch (err) {
        console.error("Excel loading failed:", err);
        alert("Failed to load Excel. Check filename, location, and local server.");
    }
}



/* ================= MANPOWER SYSTEM ================= */

document.addEventListener("DOMContentLoaded", function () {

    loadExcelTemplate();

    let manpowerType = "main";
    let historyStack = [];

    const sosFields = document.getElementById("sosFields");
    const otFields = document.getElementById("otFields");
    const addBtn = document.getElementById("addOfficerBtn");
    const removeBtn = document.getElementById("removeOfficerBtn");
    const undoBtn = document.getElementById("undoBtn");

    if (!addBtn || !removeBtn || !undoBtn) {
        console.error("Manpower buttons not found in HTML.");
        return;
    }

    document.querySelectorAll(".mp-type").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".mp-type").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            manpowerType = btn.dataset.type;

            sosFields.style.display = manpowerType === "sos" ? "block" : "none";
            otFields.style.display = manpowerType === "ot" ? "block" : "none";
        });
    });

    function saveState() {
        const state = [];
        document.querySelectorAll(".counter-cell").forEach(cell => {
            state.push({
                zone: cell.dataset.zone,
                time: cell.dataset.time,
                active: cell.classList.contains("active"),
                color: cell.style.background
            });
        });
        historyStack.push(state);
    }

    function restoreState(state) {
        document.querySelectorAll(".counter-cell").forEach(cell => {
            const found = state.find(s =>
                s.zone === cell.dataset.zone &&
                s.time === cell.dataset.time
            );
            if (found && found.active) {
                cell.classList.add("active");
                cell.style.background = found.color;
            } else {
                cell.classList.remove("active");
                cell.style.background = "";
            }
        });
        updateAll();
    }

    function applyMainTemplate(officerCount) {

        if (!excelWorkbook) {
            alert("Excel template not loaded.");
            return;
        }

        const sheetName = `${currentMode} ${currentShift}`.toLowerCase();

        const sheetData = excelData[sheetName];

        if (!sheetData) {
            alert("No sheet found for " + sheetName);
            return;
        }

        const times = generateTimeSlots();

        for (let officer = 1; officer <= officerCount; officer++) {

            const officerRows = sheetData.filter(row =>
                parseInt(row.Officer) === officer
            );

            officerRows.forEach(row => {

                const counter = row.Counter;
                const start = row.Start.replace(":", "");
                const end = row.End.replace(":", "");

                let startIndex = times.findIndex(t => t === start);
                let endIndex = times.findIndex(t => t === end);

                if (startIndex === -1 || endIndex === -1) return;

                for (let t = startIndex; t < endIndex; t++) {

                    let allCells = [...document.querySelectorAll(
                        `.counter-cell[data-time="${t}"]`
                    )];

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


    function addOfficersGlobal(count, startTime, endTime) {
        const times = generateTimeSlots();
        let startIndex = times.findIndex(t => t === startTime);
        let endIndex = times.findIndex(t => t === endTime);

        if (startIndex === -1 || endIndex === -1) {
            alert("Time range outside current shift grid.");
            return;
        }

        for (let t = startIndex; t < endIndex; t++) {

            // 1️⃣ Step: Compute max allowed per zone (50%)
            const zoneLimits = {};
            zones[currentMode].forEach(zone => {
                if (zone.name === "BIKES") return;
                const total = zone.counters.length;
                zoneLimits[zone.name] = Math.ceil(total / 2); // at least 50% manning
            });

            let remainingToAdd = count;

            // 2️⃣ First pass: fill zones to 50% if below
            zones[currentMode].forEach(zone => {
                if (zone.name === "BIKES") return;

                const emptyCells = getEmptyCellsBackFirst(zone.name, t);
                const activeCount = [...document.querySelectorAll(`.counter-cell[data-zone="${zone.name}"][data-time="${t}"]`)]
                    .filter(c => c.classList.contains("active")).length;

                const needed = Math.min(zoneLimits[zone.name] - activeCount, emptyCells.length, remainingToAdd);
                for (let i = 0; i < needed; i++) {
                    const cell = emptyCells[i];
                    cell.classList.add("active");
                    cell.style.background = currentColor;
                }
                remainingToAdd -= needed;
            });

            // 3️⃣ Second pass: fill any remaining slots in back-first order
            if (remainingToAdd > 0) {
                zones[currentMode].forEach(zone => {
                    if (zone.name === "BIKES") return;

                    const emptyCells = getEmptyCellsBackFirst(zone.name, t);
                    const toAdd = Math.min(emptyCells.length, remainingToAdd);

                    for (let i = 0; i < toAdd; i++) {
                        const cell = emptyCells[i];
                        cell.classList.add("active");
                        cell.style.background = currentColor;
                    }

                    remainingToAdd -= toAdd;
                });
            }
        }

        updateAll();
    }


    addBtn.addEventListener("click", () => {

        const count = parseInt(document.getElementById("officerCount").value);
        if (!count || count <= 0) return;

        saveState();

        if (manpowerType === "sos") {
            const start = document.getElementById("sosStart").value;
            const end = document.getElementById("sosEnd").value;
            if (!start || !end) {
                alert("Please enter SOS start and end time");
                return;
            }
            addOfficersGlobal(count, start.replace(":", ""), end.replace(":", ""));
        }

        if (manpowerType === "ot") {
            const slot = document.getElementById("otSlot").value;
            const [start, end] = slot.split("-");
            addOfficersGlobal(count, start, end);
        }

        if (manpowerType === "main") {
            applyMainTemplate(count);
        }

    });

    removeBtn.addEventListener("click", () => {

        const count = parseInt(document.getElementById("officerCount").value);
        if (!count || count <= 0) return;

        saveState();

        const times = generateTimeSlots();

        times.forEach((time, tIndex) => {

            let allCells = [];

            zones[currentMode].forEach(zone => {
                if (zone.name === "BIKES") return;

                let cells = [...document.querySelectorAll(
                    `.counter-cell[data-zone="${zone.name}"][data-time="${tIndex}"]`
                )];

                allCells = allCells.concat(cells);
            });

            let activeCells = allCells.filter(c => c.classList.contains("active"));

            for (let i = 0; i < count && activeCells.length > 0; i++) {
                let last = activeCells.pop();
                last.classList.remove("active");
                last.style.background = "";
            }

        });

        updateAll();
    });

    undoBtn.addEventListener("click", () => {
        if (historyStack.length === 0) return;
        const prev = historyStack.pop();
        restoreState(prev);
    });

});

function getEmptyCellsBackFirst(zoneName, timeIndex) {
    const cells = [...document.querySelectorAll(`.counter-cell[data-zone="${zoneName}"][data-time="${timeIndex}"]`)];
    // filter inactive cells
    let emptyCells = cells.filter(c => !c.classList.contains("active"));
    // sort by counter name descending (AC10 → AC1)
    emptyCells.sort((a, b) => {
        const numA = parseInt(a.parentElement.firstChild.innerText.replace(/\D/g, ''));
        const numB = parseInt(b.parentElement.firstChild.innerText.replace(/\D/g, ''));
        return numB - numA;
    });
    return emptyCells;

}
