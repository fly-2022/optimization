/* ================= EXCEL MAIN TEMPLATE SYSTEM ================= */

let excelWorkbook = null;
let excelData = {};
let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isDragging = false;
let dragMode = "add";
let tableEventsAttached = false;
let otGlobalCounter = 1;
let sosGlobalCounter = 1;

function resetDragState() {
    isDragging = false;
    dragMode = "add";
}

const cellStates = {
    "arrival_morning": {},
    "arrival_night": {},
    "departure_morning": {},
    "departure_night": {}
};

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

function range(prefix, start, end) {
    let arr = [];
    for (let i = start; i <= end; i++) arr.push(prefix + i);
    return arr;
}

/* ---------------- COLOR PICKER ----------------- */
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        currentColor = btn.dataset.color;
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
    });
});

function generateTimeSlots() {
    const slots = [];
    let start, end;

    if (currentShift === "morning") {
        start = 10 * 60;
        end = 22 * 60;
    } else {
        start = 22 * 60;
        end = (24 + 10) * 60;
    }

    for (let time = start; time < end; time += 15) {
        let minutes = time % (24 * 60);
        let hh = Math.floor(minutes / 60);
        let mm = minutes % 60;
        let hhmm = String(hh).padStart(2, "0") + String(mm).padStart(2, "0");
        slots.push(hhmm);
    }

    return slots;
}

/* ==================== renderTableOnce ==================== */
function renderTableOnce() {
    table.innerHTML = "";
    tableEventsAttached = false;
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
                cell.dataset.counter = counter;
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
}

/* ==================== Table Event Handling ==================== */
function attachTableEvents() {
    if (tableEventsAttached) return;

    table.addEventListener("pointerdown", e => {
        const cell = e.target.closest(".counter-cell");
        if (!cell) return;
        isDragging = true;
        dragMode = cell.classList.contains("active") ? "remove" : "add";
        toggleCell(cell);
    });

    table.addEventListener("pointerover", e => {
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

    tableEventsAttached = true;
    restoreCellStates();
}

/* ==================== Save / Restore Cell States ==================== */
function saveCellStates() {
    const key = `${currentMode}_${currentShift}`;
    cellStates[key] = {};
    document.querySelectorAll(".counter-cell").forEach(cell => {
        const id = `${cell.dataset.zone}_${cell.dataset.counter}_${cell.dataset.time}`;
        cellStates[key][id] = {
            active: cell.classList.contains("active"),
            color: cell.style.background,
            officer: cell.dataset.officer || ""
        };
    });
}

function restoreCellStates() {
    const key = `${currentMode}_${currentShift}`;
    const state = cellStates[key] || {};
    document.querySelectorAll(".counter-cell").forEach(cell => {
        const id = `${cell.dataset.zone}_${cell.dataset.counter}_${cell.dataset.time}`;
        if (state[id] && state[id].active) {
            cell.classList.add("active");
            cell.style.background = state[id].color;
            cell.dataset.officer = state[id].officer || "";
        } else {
            cell.classList.remove("active");
            cell.style.background = "";
            cell.dataset.officer = "";
        }
    });
    updateAll();
}

/* ---------------- Cell Toggle & Update ----------------- */
function toggleCell(cell) {
    if (dragMode === "add") {
        cell.style.background = currentColor;
        cell.classList.add("active");
    } else {
        cell.style.background = "";
        cell.classList.remove("active");
        cell.dataset.officer = "";
    }
    updateAll();
}

function updateAll() {
    updateSubtotals();
    updateGrandTotal();
    updateManningSummary();
    updateMainRoster();
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

/* ---------------- Button Event Listeners ----------------- */
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

function updateMainRoster() {
    const tbody = document.querySelector("#mainRosterTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const times = generateTimeSlots();
    const officerMap = {};

    document.querySelectorAll('.counter-cell.active[data-type="main"]').forEach(cell => {
        const officer = cell.dataset.officer;
        const time = parseInt(cell.dataset.time);
        const zone = cell.dataset.zone;
        const counter = cell.dataset.counter;
        if (!officer) return;
        if (!officerMap[officer]) officerMap[officer] = [];
        officerMap[officer].push({ time, zone, counter });
    });

    Object.keys(officerMap).sort((a, b) => parseInt(a) - parseInt(b)).forEach(officer => {
        const records = officerMap[officer].sort((a, b) => a.time - b.time);
        if (!records.length) return;

        let start = records[0].time;
        let prev = records[0].time;
        let currentZone = records[0].zone;
        let currentCounter = records[0].counter;

        for (let i = 1; i <= records.length; i++) {
            const isBreak =
                i === records.length ||
                records[i].time !== prev + 1 ||
                records[i].zone !== currentZone ||
                records[i].counter !== currentCounter;

            if (isBreak) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${officer}</td>
                    <td>${currentZone} ${currentCounter}</td>
                    <td>${formatTime(times[start])}</td>
                    <td>${formatTime(times[prev + 1] || times[prev])}</td>
                `;
                tbody.appendChild(row);

                if (i < records.length) {
                    start = records[i].time;
                    currentZone = records[i].zone;
                    currentCounter = records[i].counter;
                }
            }

            if (i < records.length) prev = records[i].time;
        }
    });
}

function formatTime(hhmm) {
    if (!hhmm) return "";
    return hhmm.slice(0, 2) + ":" + hhmm.slice(2);
}

/* ==================== OT Roster Table ==================== */
function updateOTRosterTable() {
    const tbody = document.querySelector("#otRosterTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const times = generateTimeSlots();
    const officerMap = {};

    document.querySelectorAll('.counter-cell.active[data-type="ot"]').forEach(cell => {
        const officer = cell.dataset.officer;
        const time = parseInt(cell.dataset.time);
        const zone = cell.dataset.zone;
        const counter = cell.dataset.counter;
        if (!officer) return;
        if (!officerMap[officer]) officerMap[officer] = [];
        officerMap[officer].push({ time, zone, counter });
    });

    const officers = Object.keys(officerMap).sort((a, b) =>
        parseInt(a.replace("OT", "")) - parseInt(b.replace("OT", ""))
    );

    officers.forEach(officer => {
        const records = officerMap[officer].sort((a, b) => a.time - b.time);
        if (!records.length) return;

        let start = records[0].time;
        let prev = records[0].time;
        let currentZone = records[0].zone;
        let currentCounter = records[0].counter;

        for (let i = 1; i <= records.length; i++) {
            const isBreak =
                i === records.length ||
                records[i].time !== prev + 1 ||
                records[i].zone !== currentZone ||
                records[i].counter !== currentCounter;

            if (isBreak) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${officer}</td>
                    <td>${currentZone} ${currentCounter}</td>
                    <td>${formatTime(times[start])}</td>
                    <td>${formatTime(times[prev + 1] || times[prev])}</td>
                `;
                tbody.appendChild(row);

                // Insert Break row if gap exists to next record
                if (i < records.length && records[i].time > prev + 1) {
                    const breakRow = document.createElement("tr");
                    breakRow.classList.add("break-row");
                    breakRow.innerHTML = `
                        <td>${officer}</td>
                        <td>Break</td>
                        <td>${formatTime(times[prev + 1])}</td>
                        <td>${formatTime(times[records[i].time])}</td>
                    `;
                    tbody.appendChild(breakRow);
                }

                if (i < records.length) {
                    start = records[i].time;
                    currentZone = records[i].zone;
                    currentCounter = records[i].counter;
                }
            }

            if (i < records.length) prev = records[i].time;
        }
    });
}

function formatHHMM(time) {
    time = parseInt(time);
    const hh = String(Math.floor(time / 100)).padStart(2, "0");
    const mm = String(time % 100).padStart(2, "0");
    return `${hh}:${mm}`;
}

function updateSOSRoster(startTime, endTime) {
    const tbody = document.querySelector("#sosRosterTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const times = generateTimeSlots();
    const startIndex = times.findIndex(t => t === startTime);
    const endIndex = times.findIndex(t => t === endTime);
    if (startIndex === -1 || endIndex === -1) return;

    const officerMap = {};

    document.querySelectorAll('.counter-cell.active[data-type="sos"]').forEach(cell => {
        const officer = cell.dataset.officer;
        const time = parseInt(cell.dataset.time);
        const zone = cell.dataset.zone;
        const counter = cell.dataset.counter;
        if (!officer) return;
        if (time < startIndex || time >= endIndex) return;
        if (!officerMap[officer]) officerMap[officer] = [];
        officerMap[officer].push({ time, zone, counter });
    });

    Object.keys(officerMap).sort((a, b) => parseInt(a) - parseInt(b)).forEach(officer => {
        const records = officerMap[officer].sort((a, b) => a.time - b.time);
        if (!records.length) return;

        let start = records[0].time;
        let prev = records[0].time;
        let currentZone = records[0].zone;
        let currentCounter = records[0].counter;

        for (let i = 1; i <= records.length; i++) {
            const isBreak =
                i === records.length ||
                records[i].time !== prev + 1 ||
                records[i].zone !== currentZone ||
                records[i].counter !== currentCounter;

            if (isBreak) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${officer}</td>
                    <td>${currentZone} ${currentCounter}</td>
                    <td>${formatTime(times[start])}</td>
                    <td>${formatTime(times[prev + 1] || times[prev])}</td>
                `;
                tbody.appendChild(row);

                if (i < records.length) {
                    start = records[i].time;
                    currentZone = records[i].zone;
                    currentCounter = records[i].counter;
                }
            }

            if (i < records.length) prev = records[i].time;
        }
    });
}

/* ---------------- Mode & Shift Segmented Buttons ----------------- */
const renderedTables = {
    "arrival_morning": false,
    "arrival_night": false,
    "departure_morning": false,
    "departure_night": false
};

function setMode(mode) {
    resetDragState();
    saveCellStates();
    currentMode = mode;

    if (mode === "arrival") {
        currentColor = "#4CAF50";
        modeHighlight.style.transform = "translateX(0%)";
        modeHighlight.style.background = "#4CAF50";
        arrivalBtn.classList.add("active");
        departureBtn.classList.remove("active");
    } else {
        currentColor = "#FF9800";
        modeHighlight.style.transform = "translateX(100%)";
        modeHighlight.style.background = "#FF9800";
        departureBtn.classList.add("active");
        arrivalBtn.classList.remove("active");
    }

    isDragging = false;
    dragMode = "add";
    renderTableOnce();
}

function setShift(shift) {
    resetDragState();
    saveCellStates();
    currentShift = shift;

    if (shift === "morning") {
        shiftHighlight.style.transform = "translateX(0%)";
        shiftHighlight.style.background = "#b0bec5";
        morningBtn.classList.add("active");
        nightBtn.classList.remove("active");
    } else {
        shiftHighlight.style.transform = "translateX(100%)";
        shiftHighlight.style.background = "#9e9e9e";
        nightBtn.classList.add("active");
        morningBtn.classList.remove("active");
    }

    if (currentMode === "arrival") {
        currentColor = "#4CAF50";
    } else {
        currentColor = "#FF9800";
    }

    isDragging = false;
    dragMode = "add";
    renderTableOnce();
}

arrivalBtn.onclick = () => setMode("arrival");
departureBtn.onclick = () => setMode("departure");
morningBtn.onclick = () => setShift("morning");
nightBtn.onclick = () => setShift("night");

/* ---------------- INIT ---------------- */
setMode("arrival");
setShift("morning");

/* ---------------- Excel Template Loading ---------------- */
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
    attachTableEvents();
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

    /* -------------------- Select Manpower Type -------------------- */
    document.querySelectorAll(".mp-type").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".mp-type").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            manpowerType = btn.dataset.type;
            sosFields.style.display = manpowerType === "sos" ? "block" : "none";
            otFields.style.display = manpowerType === "ot" ? "block" : "none";
        });
    });

    /* -------------------- Save / Restore State -------------------- */
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
            const found = state.find(s => s.zone === cell.dataset.zone && s.time === cell.dataset.time);
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

    /* -------------------- Main Template Assignment -------------------- */
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
            const officerRows = sheetData.filter(row => parseInt(row.Officer) === officer);

            officerRows.forEach(row => {
                const counter = row.Counter;

                function normalizeExcelTime(value) {
                    if (!value) return "";
                    let str = value.toString().trim();
                    if (str.includes(":")) {
                        str = str.substring(0, 5);
                        return str.replace(":", "");
                    }
                    return str.padStart(4, "0");
                }

                const start = normalizeExcelTime(row.Start);
                const end = normalizeExcelTime(row.End);

                let startIndex = times.findIndex(t => t === start);
                let endIndex = times.findIndex(t => t === end);

                if (endIndex === -1) {
                    if ((currentShift === "morning" && end === "2200") ||
                        (currentShift === "night" && end === "1000")) {
                        endIndex = times.length;
                    }
                }

                if (startIndex === -1 || endIndex === -1) return;

                for (let t = startIndex; t < endIndex; t++) {
                    let allCells = [...document.querySelectorAll(`.counter-cell[data-time="${t}"]`)];
                    allCells.forEach(cell => {
                        const rowCounter = cell.parentElement.firstChild.innerText;
                        if (rowCounter === counter) {
                            cell.classList.add("active");
                            cell.style.background = currentColor;
                            cell.dataset.officer = officer;
                            cell.dataset.type = "main";
                        }
                    });
                }
            });
        }

        // Every 4th Officer Special Period
        if ((currentMode === "arrival" || currentMode === "departure") && currentShift === "morning") {
            const specialStart = "2030";
            const specialEnd = times[times.length - 1];
            const startIndex = times.findIndex(t => t === specialStart);
            const endIndex = times.findIndex(t => t === specialEnd);

            if (startIndex !== -1 && endIndex !== -1) {
                const officersToAssign = Math.floor(officerCount / 4);
                let assignedOfficers = 0;

                for (let officer = 1; officer <= officerCount; officer++) {
                    if (officer % 4 !== 0) continue;
                    if (assignedOfficers >= officersToAssign) break;

                    let assigned = false;
                    const candidateZones = zones[currentMode].filter(z => z.name !== "BIKES");
                    const zoneOccupancy = candidateZones.map(zone => {
                        let occupiedCount = 0;
                        for (let t = startIndex; t <= endIndex; t++) {
                            const activeCells = [...document.querySelectorAll(`.counter-cell[data-zone="${zone.name}"][data-time="${t}"]`)]
                                .filter(c => c.classList.contains("active"));
                            occupiedCount += activeCells.length;
                        }
                        const totalSlots = zone.counters.length * (endIndex - startIndex + 1);
                        return { zone, occupiedCount, totalSlots, ratio: occupiedCount / totalSlots };
                    });

                    zoneOccupancy.sort((a, b) => a.ratio - b.ratio);

                    for (let z = 0; z < zoneOccupancy.length; z++) {
                        const zone = zoneOccupancy[z].zone;
                        const counters = [...zone.counters].reverse();

                        for (let c = 0; c < counters.length; c++) {
                            const counter = counters[c];
                            let isFree = true;

                            for (let t = startIndex; t <= endIndex; t++) {
                                const allCells = [...document.querySelectorAll(`.counter-cell[data-zone="${zone.name}"][data-time="${t}"]`)]
                                    .filter(cell => cell.parentElement.firstChild.innerText === counter);
                                if (!allCells.length || allCells[0].classList.contains("active")) {
                                    isFree = false;
                                    break;
                                }
                            }

                            if (isFree) {
                                for (let t = startIndex; t <= endIndex; t++) {
                                    const cell = [...document.querySelectorAll(`.counter-cell[data-zone="${zone.name}"][data-time="${t}"]`)]
                                        .filter(c => c.parentElement.firstChild.innerText === counter)[0];
                                    cell.classList.add("active");
                                    cell.style.background = currentColor;
                                    cell.dataset.officer = officer;
                                    cell.dataset.type = "main";
                                }
                                assigned = true;
                                assignedOfficers++;
                                break;
                            }
                        }
                        if (assigned) break;
                    }
                }
            }
        }
        updateAll();
    }

    /* -------------------- OT Shift Validation -------------------- */
    function isOTWithinShift(otStart, otEnd) {
        if (currentShift === "morning") {
            return (otStart === "1100" && otEnd === "1600") ||
                (otStart === "1600" && otEnd === "2100");
        } else if (currentShift === "night") {
            return otStart === "0600" && otEnd === "1100";
        }
        return false;
    }

    /* ================== OT ALLOCATION ==================
     *
     * Chain-handoff groups of 3 [A(+90), B(+135), C(+180)]:
     *   A: X(block1) → Y(block2)    Y = CONTINUOUS (B fills then A)
     *   B: Y(block1) → Z(block2)    Z = CONTINUOUS (C fills then B)
     *   C: Z(block1) → X(block2)    X = gap counter (front, acceptable)
     *
     * Each counter is only checked against its OWN required time windows:
     *   Y must be free: [sIdx→BK1] and [BKE0→end]
     *   Z must be free: [sIdx→BK2] and [BKE1→end]
     *   X must be free: [sIdx→BK0] and [BKE2→end]
     * This lets OT use counters that main officers vacate mid-shift.
     *
     * Selection per group (re-evaluated live after every fill):
     *   Y = highest free back counter in least-manned zone  (50% rule)
     *   Z = highest free back counter overall for Z-windows
     *   X = lowest free front counter overall for X-windows (gap falls here)
     * ================================================== */

    function allocateOTOfficers(count, otStart, otEnd) {
        const times = generateTimeSlots();

        let startIndex = times.findIndex(t => t === otStart);
        let endIndex = times.findIndex(t => t === otEnd);
        if (startIndex === -1) { alert("OT start time outside current shift."); return; }
        if (endIndex === -1) endIndex = times.length;

        const releaseSlots = 30 / 15;
        const effectiveEnd = Math.max(startIndex, endIndex - releaseSlots);
        const breakSlots = 45 / 15;

        function addMins(timeStr, mins) {
            const h = parseInt(timeStr.slice(0, 2)), m = parseInt(timeStr.slice(2));
            const tot = h * 60 + m + mins;
            return String(Math.floor(tot / 60)).padStart(2, "0") + String(tot % 60).padStart(2, "0");
        }
        // Determine how many chain breaks fit in the window.
        // Each group needs: startIndex → BK[n] (front) + BKE[n] → effectiveEnd (back).
        // Only count a break as usable if there's at least 1 slot of back block after it.
        const BK = [90, 135, 180].map(m => {
            const idx = times.findIndex(t => t === addMins(otStart, m));
            return idx === -1 ? effectiveEnd : idx;
        });
        const BKE = BK.map(b => b + breakSlots);
        // Number of usable breaks: how many BKE[n] < effectiveEnd
        const numBreaks = BKE.filter(b => b < effectiveEnd).length;  // 0, 1, 2, or 3
        const gapWinStart = numBreaks > 0 ? BK[0] : startIndex;
        const gapWinEnd = numBreaks > 0 ? BKE[numBreaks - 1] : startIndex;

        function blockFree(zone, counter, from, to) {
            for (let t = from; t < to; t++) {
                const cell = document.querySelector(
                    `.counter-cell[data-zone="${zone}"][data-time="${t}"][data-counter="${counter}"]`
                );
                if (!cell || cell.classList.contains("active")) return false;
            }
            return true;
        }

        function fillBlock(zone, counter, from, to, label) {
            for (let t = from; t < to; t++) {
                const cell = document.querySelector(
                    `.counter-cell[data-zone="${zone}"][data-time="${t}"][data-counter="${counter}"]`
                );
                if (!cell || cell.classList.contains("active")) continue;
                cell.classList.add("active");
                cell.style.background = currentColor;
                cell.dataset.officer = label;
                cell.dataset.type = "ot";
            }
        }

        const nonBikeZones = zones[currentMode].filter(z => z.name !== "BIKES");

        function manning(zoneName) {
            const z = zones[currentMode].find(z => z.name === zoneName);
            if (!z || !z.counters.length) return 1;
            return document.querySelectorAll(
                `.counter-cell.active[data-zone="${zoneName}"][data-time="${startIndex}"]`
            ).length / z.counters.length;
        }

        // Counters that are NOT yet active at OT start (not current main officers)
        // AND free for at least one back block. Sorted descending (back-counters first).
        function fullyFreeDesc(zoneName) {
            const z = zones[currentMode].find(z => z.name === zoneName);
            if (!z) return [];
            return z.counters.filter(c => {
                // Exclude main-type counters still on shift at OT start
                const cellAtStart = document.querySelector(
                    `.counter-cell[data-zone="${zoneName}"][data-time="${startIndex}"][data-counter="${c}"]`
                );
                if (cellAtStart && cellAtStart.classList.contains("active") &&
                    cellAtStart.dataset.type === "main") return false;
                // For full windows: must be free for at least one back block
                if (numBreaks >= 3) {
                    return blockFree(zoneName, c, BKE[0], effectiveEnd) ||
                        blockFree(zoneName, c, BKE[1], effectiveEnd) ||
                        blockFree(zoneName, c, BKE[2], effectiveEnd);
                }
                // For short windows: just needs any free slot in the window
                return blockFree(zoneName, c, startIndex, effectiveEnd);
            }).sort((a, b) =>
                (parseInt(b.replace(/\D/g, "")) || 0) - (parseInt(a.replace(/\D/g, "")) || 0)
            );
        }

        // ── equal zone quotas ─────────────────────────────────────────────────
        const zoneQuota = {};
        {
            const n = nonBikeZones.length;
            const base = Math.floor(count / n);
            const rem = count - base * n;
            nonBikeZones.forEach(z => zoneQuota[z.name] = base);
            [...nonBikeZones]
                .sort((a, b) => fullyFreeDesc(b.name).length - fullyFreeDesc(a.name).length)
                .slice(0, rem)
                .forEach(z => zoneQuota[z.name]++);
        }

        // ── pre-select pool per zone ──────────────────────────────────────────
        // Take the top `quota` back-counters (highest cNum = closest to main).
        // Within this pool:
        //   X = lowest counter in pool (front-most of the selected group → gets the gap)
        //   Y/Z = higher counters (back-most → continuous, closer to main)
        // This ensures OT fills from the back (adjacent to main) inward.
        const zonePool = {};
        nonBikeZones.forEach(z => {
            zonePool[z.name] = fullyFreeDesc(z.name).slice(0, zoneQuota[z.name]);
        });

        // ── max gaps per zone ─────────────────────────────────────────────────
        // max_gaps = min_main_during_gap + quota - minRequired
        // Prevents any zone from dropping below 50% during 1730-1945.
        const maxGaps = {}, gapsUsed = {};
        nonBikeZones.forEach(z => {
            const minRequired = Math.ceil(z.counters.length / 2);
            let minMainDuringGap = z.counters.length;
            for (let t = gapWinStart; t < gapWinEnd; t++) {
                const active = document.querySelectorAll(
                    `.counter-cell.active[data-zone="${z.name}"][data-time="${t}"]`
                ).length;
                if (active < minMainDuringGap) minMainDuringGap = active;
            }
            maxGaps[z.name] = Math.max(0, minMainDuringGap + zoneQuota[z.name] - minRequired);
            gapsUsed[z.name] = 0;
        });

        // ── available pool (consumed as counters are assigned) ────────────────
        const available = {};
        nonBikeZones.forEach(z => { available[z.name] = [...zonePool[z.name]]; });

        function useCounter(zoneName, counter) {
            available[zoneName] = available[zoneName].filter(c => c !== counter);
        }

        // ── main loop ─────────────────────────────────────────────────────────
        // Group size = numBreaks (3 for full window, 2 for medium, 1 for short, 0 = solo)
        const groupSize = Math.max(1, numBreaks); // at least 1 per iteration
        let i = 0;
        while (i < count) {
            const remaining = count - i;
            const labelA = "OT" + (otGlobalCounter++);

            if (remaining >= 3 && numBreaks >= 3) {
                const labelB = "OT" + (otGlobalCounter++);
                const labelC = "OT" + (otGlobalCounter++);
                i += 3;

                const availZones = nonBikeZones
                    .filter(z => available[z.name].length > 0)
                    .sort((a, b) => manning(a.name) - manning(b.name));
                if (availZones.length < 3) break;
                const top3 = availZones.slice(0, 3);

                // X zone: first in top3 with gap budget; X counter = LOWEST in its pool
                let xZone = null, xCounter = null;
                for (const z of top3) {
                    if (gapsUsed[z.name] >= maxGaps[z.name]) continue;
                    const xC = available[z.name]
                        .filter(c => blockFree(z.name, c, BKE[2], effectiveEnd))
                        .sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0))[0];
                    if (xC) { xZone = z; xCounter = xC; break; }
                }
                if (!xZone) {
                    xZone = top3[0];
                    xCounter = available[xZone.name]
                        .sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0))[0];
                }

                const yzZones = top3.filter(z => z !== xZone);

                // Y counter: HIGHEST in pool free for Y back block
                const yZone = yzZones[0];
                const yCounter = available[yZone.name]
                    .filter(c => blockFree(yZone.name, c, BKE[0], effectiveEnd))
                    .sort((a, b) => (parseInt(b.replace(/\D/g, "")) || 0) - (parseInt(a.replace(/\D/g, "")) || 0))[0];

                // Z counter: HIGHEST in pool free for Z back block
                const zZone = yzZones[1];
                const zCounter = available[zZone.name]
                    .filter(c => blockFree(zZone.name, c, BKE[1], effectiveEnd))
                    .sort((a, b) => (parseInt(b.replace(/\D/g, "")) || 0) - (parseInt(a.replace(/\D/g, "")) || 0))[0];

                if (!xCounter || !yCounter || !zCounter) break;
                useCounter(xZone.name, xCounter);
                useCounter(yZone.name, yCounter);
                useCounter(zZone.name, zCounter);
                gapsUsed[xZone.name]++;

                // Chain fills — front blocks skip occupied slots (handles partial main handoff)
                fillBlock(xZone.name, xCounter, startIndex, BK[0], labelA);
                fillBlock(yZone.name, yCounter, BKE[0], effectiveEnd, labelA);
                fillBlock(yZone.name, yCounter, startIndex, BK[1], labelB);
                fillBlock(zZone.name, zCounter, BKE[1], effectiveEnd, labelB);
                fillBlock(zZone.name, zCounter, startIndex, BK[2], labelC);
                fillBlock(xZone.name, xCounter, BKE[2], effectiveEnd, labelC);

            } else {
                // Short window OR remainder: assign one counter straight through
                // Pick least-manned zone with available pool counter
                const z = nonBikeZones
                    .filter(z => available[z.name].length > 0)
                    .sort((a, b) => manning(a.name) - manning(b.name))[0];
                if (!z) break;
                // For short windows use lowest (front) counter; for remainder use lowest too
                const c = available[z.name]
                    .sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0))[0];
                if (!c) break;
                useCounter(z.name, c);
                i++;
                fillBlock(z.name, c, startIndex, effectiveEnd, labelA);
            }
        }

        updateAll();
        updateOTRosterTable();
    }


    /* ================== SOS ALLOCATION ================== */
    function allocateSOSOfficers(count, sosStart, sosEnd) {
        const times = generateTimeSlots();

        let startIndex = times.findIndex(t => t === sosStart);
        let endIndex = times.findIndex(t => t === sosEnd);

        if (startIndex === -1 || endIndex === -1) {
            alert("Invalid SOS timing.");
            return;
        }

        const threeHourSlots = 180 / 15;
        const breakSlots = 45 / 15;

        for (let i = 0; i < count; i++) {
            const officerLabel = "SOS" + (sosGlobalCounter++);
            let currentStart = startIndex;

            while (currentStart < endIndex) {
                let workEnd = Math.min(currentStart + threeHourSlots, endIndex);
                deploySOSBlock(officerLabel, currentStart, workEnd);
                currentStart = workEnd;
                if (currentStart < endIndex) {
                    currentStart = Math.min(currentStart + breakSlots, endIndex);
                }
            }
        }

        updateAll();
        updateSOSRoster(sosStart, sosEnd);
    }

    function deploySOSBlock(officerLabel, blockStart, blockEnd) {
        let assigned = false;
        const zoneStats = [];

        zones[currentMode].forEach(zone => {
            if (zone.name === "BIKES") return;
            let activeCount = 0;
            zone.counters.forEach(counter => {
                for (let t = blockStart; t < blockEnd; t++) {
                    const cell = document.querySelector(
                        `.counter-cell[data-zone="${zone.name}"][data-time="${t}"][data-counter="${counter}"]`
                    );
                    if (cell && cell.classList.contains("active")) {
                        activeCount++;
                        break;
                    }
                }
            });
            zoneStats.push({ zone: zone.name, ratio: activeCount / zone.counters.length });
        });

        zoneStats.sort((a, b) => a.ratio - b.ratio);

        for (let z = 0; z < zoneStats.length; z++) {
            const zoneName = zoneStats[z].zone;
            const zone = zones[currentMode].find(z => z.name === zoneName);

            for (let c = zone.counters.length - 1; c >= 0; c--) {
                const counter = zone.counters[c];
                let blockFree = true;

                for (let t = blockStart; t < blockEnd; t++) {
                    const cell = document.querySelector(
                        `.counter-cell[data-zone="${zoneName}"][data-time="${t}"][data-counter="${counter}"]`
                    );
                    if (!cell || cell.classList.contains("active")) {
                        blockFree = false;
                        break;
                    }
                }

                if (blockFree) {
                    for (let t = blockStart; t < blockEnd; t++) {
                        const cell = document.querySelector(
                            `.counter-cell[data-zone="${zoneName}"][data-time="${t}"][data-counter="${counter}"]`
                        );
                        cell.classList.add("active");
                        cell.style.background = currentColor;
                        cell.dataset.officer = officerLabel;
                        cell.dataset.type = "sos";
                    }
                    assigned = true;
                    break;
                }
            }
            if (assigned) break;
        }
    }

    function isCounterFreeForBlock(zone, counter, start, end) {
        for (let t = start; t < end; t++) {
            const cell = document.querySelector(
                `.counter-cell[data-zone="${zone}"][data-time="${t}"][data-counter="${counter}"]`
            );
            if (!cell || cell.classList.contains("active")) return false;
        }
        return true;
    }

    /* -------------------- Button Clicks -------------------- */
    addBtn.addEventListener("click", () => {
        const count = parseInt(document.getElementById("officerCount").value);
        if (!count || count <= 0) return;

        saveState();

        if (manpowerType === "sos") {
            const start = document.getElementById("sosStart").value.replace(":", "");
            const end = document.getElementById("sosEnd").value.replace(":", "");

            const times = generateTimeSlots();
            let startIndex = times.findIndex(t => t === start);
            let endIndex = times.findIndex(t => t === end);

            if (startIndex === -1 || endIndex === -1) {
                alert("SOS time range outside current shift grid.");
                return;
            }

            allocateSOSOfficers(count, start, end);
            updateSOSRoster(start, end);
        }

        if (manpowerType === "ot") {
            const slot = document.getElementById("otSlot").value;
            const [start, end] = slot.split("-").map(s => s.replace(":", ""));

            if (!isOTWithinShift(start, end)) {
                alert(`OT ${start}-${end} is outside current shift (${currentShift}).`);
                return;
            }

            allocateOTOfficers(count, start, end);
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
                let cells = [...document.querySelectorAll(`.counter-cell[data-zone="${zone.name}"][data-time="${tIndex}"]`)];
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

/* ================== HELPERS ================== */
function getEmptyCellsBackFirst(zoneName, timeIndex) {
    const cells = [...document.querySelectorAll(
        `.counter-cell[data-zone="${zoneName}"][data-time="${timeIndex}"]`
    )];

    let emptyCells = cells.filter(c => !c.classList.contains("active"));

    emptyCells.sort((a, b) =>
        parseInt(b.parentElement.firstChild.innerText.replace(/\D/g, '')) -
        parseInt(a.parentElement.firstChild.innerText.replace(/\D/g, ''))
    );

    return emptyCells;
}

function copyMainRoster() { copyTable("mainRosterTable"); }
function copySOSRoster() { copyTable("sosRosterTable"); }
function copyOTRoster() { copyTable("otRosterTable"); }

function copyTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    let text = "";
    const rows = table.querySelectorAll("tr");

    rows.forEach(row => {
        const cells = row.querySelectorAll("th, td");
        let rowText = [];
        cells.forEach(cell => rowText.push(cell.innerText.trim()));
        text += rowText.join("\t") + "\n";
    });

    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
}