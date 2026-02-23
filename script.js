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
     * findOTCounter: unified counter-picker for both Block 1 and Block 2.
     *
     * Priority 1 — TAKEOVER: counter was active in the slot immediately before
     *   blockStart (any type: main, SOS, or OT going on break). Prefer lowest-manned zone.
     *
     * Priority 2 — NEW COUNTER: counter has never been active before blockStart.
     *   Prefer lowest-manned zone, back counters first.
     *
     * NOTE: this function MUST stay inside DOMContentLoaded so it shares scope
     * with zones, currentMode etc. at call time.
     * ================================================== */

    function findOTCounter(blockStart, blockEnd) {

        // Build a flat list of ALL counters across all zones (excluding BIKES)
        // Each entry tracks whether it's free for the block and whether it's a takeover
        const allCandidates = [];

        zones[currentMode].forEach(zone => {
            if (zone.name === "BIKES") return;

            zone.counters.forEach(counter => {

                // Must be fully free for the entire block duration
                let blockFree = true;
                for (let t = blockStart; t < blockEnd; t++) {
                    const cell = document.querySelector(
                        `.counter-cell[data-zone="${zone.name}"][data-time="${t}"][data-counter="${counter}"]`
                    );
                    if (!cell || cell.classList.contains("active")) {
                        blockFree = false;
                        break;
                    }
                }
                if (!blockFree) return;

                // Look back up to 4 slots (covers the 45min break window = 3 slots + buffer).
                // A counter that was active before the break but is now free is a takeover target.
                // Checking only blockStart-1 misses Block 2 cases where the break slots are empty.
                let isTakeover = false;
                for (let lookback = 1; lookback <= 4; lookback++) {
                    const idx = blockStart - lookback;
                    if (idx < 0) break;
                    const prevCell = document.querySelector(
                        `.counter-cell[data-zone="${zone.name}"][data-time="${idx}"][data-counter="${counter}"]`
                    );
                    if (prevCell && prevCell.classList.contains("active")) {
                        isTakeover = true;
                        break;
                    }
                }

                // Extract numeric part of counter for back-first sorting (e.g. AC10 → 10, DC8 → 8)
                const counterNum = parseInt(counter.replace(/\D/g, "")) || 0;

                // Zone manning ratio at blockStart (lower = needs more help)
                const zoneRatio = document.querySelectorAll(
                    `.counter-cell.active[data-zone="${zone.name}"][data-time="${blockStart}"]`
                ).length / zone.counters.length;

                allCandidates.push({
                    zone: zone.name,
                    counter,
                    isTakeover,
                    counterNum,
                    zoneRatio
                });
            });
        });

        if (!allCandidates.length) return null;

        // Sort priority:
        // 1. Takeover counters first (someone just went on break there)
        // 2. Within each tier: lowest-manned zone first
        // 3. Within same zone: highest counter number first (back counters first)
        allCandidates.sort((a, b) => {
            if (b.isTakeover !== a.isTakeover) return b.isTakeover - a.isTakeover; // takeover first
            if (a.zoneRatio !== b.zoneRatio) return a.zoneRatio - b.zoneRatio;     // lowest manning first
            return b.counterNum - a.counterNum;                                      // back counter first
        });

        return { zone: allCandidates[0].zone, counter: allCandidates[0].counter };
    }

    function fillOTBlock(counterObj, blockStart, blockEnd, officerLabel) {
        for (let t = blockStart; t < blockEnd; t++) {
            const cell = document.querySelector(
                `.counter-cell[data-zone="${counterObj.zone}"][data-time="${t}"][data-counter="${counterObj.counter}"]`
            );
            if (!cell) continue;
            cell.classList.add("active");
            cell.style.background = currentColor;
            cell.dataset.officer = officerLabel;
            cell.dataset.type = "ot";
        }
    }

    function allocateOTOfficers(count, otStart, otEnd) {

        const times = generateTimeSlots();

        let startIndex = times.findIndex(t => t === otStart);
        let endIndex = times.findIndex(t => t === otEnd);

        if (startIndex === -1) {
            alert("OT start time outside current shift.");
            return;
        }

        if (endIndex === -1) endIndex = times.length;

        const releaseSlots = 30 / 15;   // release 30 mins early
        const effectiveEnd = Math.max(startIndex, endIndex - releaseSlots);
        const breakSlots = 45 / 15;     // 45 min break = 3 slots

        let officialBreakSlots = [];
        if (otStart === "0600") {
            officialBreakSlots = ["0730", "0815", "0900"];
        } else if (otStart === "1100") {
            officialBreakSlots = ["1230", "1315", "1400"];
        } else if (otStart === "1600") {
            officialBreakSlots = ["1730", "1815", "1900"];
        }

        // Build plans for all officers
        const officerPlans = [];

        for (let i = 0; i < count; i++) {
            const officerLabel = "OT" + (otGlobalCounter++);
            const breakTimeStr = officialBreakSlots[i % officialBreakSlots.length];
            const breakStart = times.findIndex(t => t === breakTimeStr);

            if (breakStart === -1) {
                console.warn(`${officerLabel}: break time ${breakTimeStr} not found in shift slots.`);
                continue;
            }

            officerPlans.push({
                officerLabel,
                block1Start: startIndex,
                block1End: breakStart,
                block2Start: breakStart + breakSlots,
                block2End: effectiveEnd
            });
        }

        // ── PASS 1: Assign all Block 1s ──
        // blockStart === shift start, nothing active before it yet,
        // so findOTCounter falls through to newCounterCandidates — opens fresh counters.
        officerPlans.forEach(plan => {
            if (plan.block1Start >= plan.block1End) return;
            const counter = findOTCounter(plan.block1Start, plan.block1End);
            if (counter) {
                fillOTBlock(counter, plan.block1Start, plan.block1End, plan.officerLabel);
            } else {
                console.warn(`${plan.officerLabel}: No counter found for Block 1.`);
            }
        });

        // ── PASS 2: Assign all Block 2s ──
        // Block 1s are now filled. At block2Start the slot before (= last break slot)
        // has counters that just went dark — findOTCounter will pick those up first
        // before opening anything new.
        officerPlans.forEach(plan => {
            if (plan.block2Start >= plan.block2End) return;
            const counter = findOTCounter(plan.block2Start, plan.block2End);
            if (counter) {
                fillOTBlock(counter, plan.block2Start, plan.block2End, plan.officerLabel);
            } else {
                console.warn(`${plan.officerLabel}: No counter found for Block 2.`);
            }
        });

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