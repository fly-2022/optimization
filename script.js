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
let historyStack = [];
let _saveStateGlobal = null; // set by DOMContentLoaded, used by attachTableEvents

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

    const paintedThisDrag = new Set();

    table.addEventListener("pointerdown", e => {
        const cell = e.target.closest(".counter-cell");
        if (!cell) return;
        e.preventDefault();
        paintedThisDrag.clear();
        dragMode = cell.classList.contains("active") ? "remove" : "add";
        isDragging = true;
        table.setPointerCapture(e.pointerId);
        if (_saveStateGlobal) _saveStateGlobal(); // save before paint so drag is one undo step
        toggleCell(cell);
        paintedThisDrag.add(cell);
    });

    table.addEventListener("pointermove", e => {
        if (!isDragging) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest(".counter-cell");
        if (!cell || paintedThisDrag.has(cell)) return;
        const isActive = cell.classList.contains("active");
        if (dragMode === "add" && !isActive) { toggleCell(cell); paintedThisDrag.add(cell); }
        if (dragMode === "remove" && isActive) { toggleCell(cell); paintedThisDrag.add(cell); }
    });

    const endDrag = () => { isDragging = false; paintedThisDrag.clear(); };
    table.addEventListener("pointerup", endDrag);
    table.addEventListener("pointercancel", endDrag);
    document.addEventListener("pointerup", endDrag);

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
            officer: cell.dataset.officer || "",
            type: cell.dataset.type || ""
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
            cell.dataset.type = state[id].type || "";
        } else {
            cell.classList.remove("active");
            cell.style.background = "";
            cell.dataset.officer = "";
            cell.dataset.type = "";
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

    /* -------------------- Officer name/serial suffix -------------------- */
    // Returns " | Name / Serial" if either field has a value, else ""
    function officerSuffix() {
        const name = (document.getElementById("officerName")?.value || "").trim();
        const serial = (document.getElementById("officerSerial")?.value || "").trim();
        if (!name && !serial) return "";
        return " | " + [name, serial].filter(Boolean).join(" / ");
    }

    /* -------------------- Save / Restore State -------------------- */
    function saveState() {
        const state = [];
        document.querySelectorAll(".counter-cell").forEach(cell => {
            state.push({
                zone: cell.dataset.zone,
                counter: cell.dataset.counter,
                time: cell.dataset.time,
                active: cell.classList.contains("active"),
                color: cell.style.background,
                officer: cell.dataset.officer || "",
                type: cell.dataset.type || ""
            });
        });
        historyStack.push(state);
        if (historyStack.length > 50) historyStack.shift(); // cap at 50 steps
    }
    _saveStateGlobal = saveState; // expose to attachTableEvents

    function restoreState(state) {
        document.querySelectorAll(".counter-cell").forEach(cell => {
            const found = state.find(s =>
                s.zone === cell.dataset.zone &&
                s.counter === cell.dataset.counter &&
                s.time === cell.dataset.time
            );
            if (found && found.active) {
                cell.classList.add("active");
                cell.style.background = found.color;
                cell.dataset.officer = found.officer;
                cell.dataset.type = found.type;
            } else {
                cell.classList.remove("active");
                cell.style.background = "";
                cell.dataset.officer = "";
                cell.dataset.type = "";
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
            const officerLabel = officer + officerSuffix();

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
                            cell.dataset.officer = officerLabel;
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
                                    cell.dataset.officer = officerLabel;
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

        const releaseSlots = 30 / 15;
        let effectiveEnd;
        if (endIndex === -1) {
            // otEnd is beyond the grid (e.g. night 0600-1100 where grid ends 0945)
            // Use the last slot of the grid — no release deduction since shift already ends
            effectiveEnd = times.length - 1;
        } else {
            effectiveEnd = Math.max(startIndex, endIndex - releaseSlots);
        }
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
        // Number of usable breaks: how many BKE[n] <= effectiveEnd
        const numBreaks = BKE.filter(b => b <= effectiveEnd).length;  // 0, 1, 2, or 3
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
                // Counter must be completely free for the entire OT window
                // (no existing assignments — neither main nor prior OT)
                return blockFree(zoneName, c, startIndex, effectiveEnd);
            }).sort((a, b) =>
                (parseInt(b.replace(/\D/g, "")) || 0) - (parseInt(a.replace(/\D/g, "")) || 0)
            );
        }

        // ── zone quotas with 50% floor guarantee ────────────────────────────
        // Each zone needs at least (minRequired - minMainDuringGap) OT counters
        // to maintain 50% manning. Compute minMain per zone first, then set
        // quota = max(base, minNeeded), distributing any leftover fairly.
        const zoneMinMain = {};
        nonBikeZones.forEach(z => {
            const minRequired = Math.ceil(z.counters.length / 2);
            let minM = z.counters.length;
            for (let t = gapWinStart; t < gapWinEnd; t++) {
                const active = document.querySelectorAll(
                    `.counter-cell.active[data-zone="${z.name}"][data-time="${t}"]`
                ).length;
                if (active < minM) minM = active;
            }
            zoneMinMain[z.name] = minM;
        });

        const zoneQuota = {};
        {
            const n = nonBikeZones.length;
            const base = Math.floor(count / n);

            // First pass: give each zone max(base, minNeeded)
            let allocated = 0;
            nonBikeZones.forEach(z => {
                const minRequired = Math.ceil(z.counters.length / 2);
                const minNeeded = Math.max(0, minRequired - zoneMinMain[z.name]);
                zoneQuota[z.name] = Math.min(
                    Math.max(base, minNeeded),
                    fullyFreeDesc(z.name).length  // can't exceed available free counters
                );
                allocated += zoneQuota[z.name];
            });

            // Second pass: distribute remaining quota to zones with most free capacity
            let remaining = count - allocated;
            if (remaining > 0) {
                [...nonBikeZones]
                    .sort((a, b) => fullyFreeDesc(b.name).length - fullyFreeDesc(a.name).length)
                    .forEach(z => {
                        if (remaining <= 0) return;
                        const free = fullyFreeDesc(z.name).length;
                        const extra = Math.min(remaining, free - zoneQuota[z.name]);
                        if (extra > 0) { zoneQuota[z.name] += extra; remaining -= extra; }
                    });
            } else if (remaining < 0) {
                // Over-allocated (minNeeded > base for many zones): trim from zones with most quota
                [...nonBikeZones]
                    .sort((a, b) => zoneQuota[b.name] - zoneQuota[a.name])
                    .forEach(z => {
                        if (remaining >= 0) return;
                        const minRequired = Math.ceil(z.counters.length / 2);
                        const minNeeded = Math.max(0, minRequired - zoneMinMain[z.name]);
                        const canTrim = zoneQuota[z.name] - minNeeded;
                        const trim = Math.min(-remaining, canTrim);
                        if (trim > 0) { zoneQuota[z.name] -= trim; remaining += trim; }
                    });
            }
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
        // max_gaps = minMainDuringGap + quota - minRequired
        // A zone with maxGaps=0 must have ALL its OT as continuous (no chain gap).
        const maxGaps = {}, gapsUsed = {};
        nonBikeZones.forEach(z => {
            const minRequired = Math.ceil(z.counters.length / 2);
            maxGaps[z.name] = Math.max(0, zoneMinMain[z.name] + zoneQuota[z.name] - minRequired);
            gapsUsed[z.name] = 0;
        });

        // ── available pool (consumed as counters are assigned) ────────────────
        const available = {};
        nonBikeZones.forEach(z => { available[z.name] = [...zonePool[z.name]]; });

        function useCounter(zoneName, counter) {
            available[zoneName] = available[zoneName].filter(c => c !== counter);
        }

        // ── main loop ─────────────────────────────────────────────────────────
        // Groups cycle through all available zones (not just top-3) so every
        // zone gets OT. Within each group:
        //   X = zone whose lowest pool counter has the HIGHEST cNum (best gap placement)
        //       → keeps low-numbered zones (e.g. Zone 1) as Y/Z (continuous)
        //   Y/Z = highest cNum counter from their zones (back counters first)
        const sortAsc = (a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0);
        const sortDesc = (a, b) => (parseInt(b.replace(/\D/g, "")) || 0) - (parseInt(a.replace(/\D/g, "")) || 0);

        // Track how many groups each zone has participated in (for rotation)
        const timesUsed = {};
        nonBikeZones.forEach(z => { timesUsed[z.name] = 0; });

        let i = 0;
        while (i < count) {
            // Sort: fewest uses first; tiebreak by lowest-pool-counter DESC
            // so zones with high-numbered counters (Zone 3/4) appear before
            // Zone 1 and become X candidates, leaving Zone 1 as continuous Y/Z
            const zonesLeft = nonBikeZones.filter(z => available[z.name].length > 0)
                .sort((a, b) => {
                    const diff = timesUsed[a.name] - timesUsed[b.name];
                    if (diff !== 0) return diff;
                    const aLo = parseInt((available[a.name].slice().sort(sortAsc)[0] || '').replace(/\D/g, '')) || 0;
                    const bLo = parseInt((available[b.name].slice().sort(sortAsc)[0] || '').replace(/\D/g, '')) || 0;
                    return bLo - aLo; // higher lowest-counter first
                });
            if (zonesLeft.length === 0) break;

            // Only use a chain if at least one zone in zonesLeft has gap budget.
            // If no zone can absorb a gap, force solo fills (straight through, no chain gap).
            const anyGapBudget = zonesLeft.some(z => gapsUsed[z.name] < maxGaps[z.name]);
            const useChain3 = anyGapBudget && count - i >= 3 && numBreaks >= 3 && zonesLeft.length >= 3;
            const useChain2 = anyGapBudget && !useChain3 && count - i >= 2 && numBreaks >= 2 && zonesLeft.length >= 2;
            const labelA = "OT" + (otGlobalCounter++) + officerSuffix();

            if (useChain3) {
                // ── 3-person chain (A,B,C) ──────────────────────────────────
                const labelB = "OT" + (otGlobalCounter++) + officerSuffix();
                const labelC = "OT" + (otGlobalCounter++) + officerSuffix();
                i += 3;

                // Sort by manning ascending (least-manned first), take top 3
                // but rotate so all zones eventually get picked
                const top3 = zonesLeft.slice(0, 3);

                // X zone: among eligible (gap budget), prefer the one whose
                // lowest pool counter has the HIGHEST cNum — this assigns the
                // gap to a zone with numerically large counters, keeping
                // low-numbered zones (Zone 1) as continuous Y/Z.
                const eligibleX = top3.filter(z => gapsUsed[z.name] < maxGaps[z.name]);
                const candidatesX = eligibleX.length > 0 ? eligibleX : top3;
                const xZone = candidatesX.reduce((best, z) => {
                    const lo = available[z.name].slice().sort(sortAsc)[0];
                    const bLo = available[best.name].slice().sort(sortAsc)[0];
                    const loN = parseInt((lo || '').replace(/\D/g, '')) || 0;
                    const bLoN = parseInt((bLo || '').replace(/\D/g, '')) || 0;
                    return loN > bLoN ? z : best;
                });
                const xCounter = available[xZone.name].slice().sort(sortAsc)[0];   // LOWEST in pool

                const yzZones = top3.filter(z => z !== xZone);
                const yZone = yzZones[0];
                const yCounter = available[yZone.name].slice().sort(sortDesc)[0];  // HIGHEST
                const zZone = yzZones[1];
                const zCounter = available[zZone.name].slice().sort(sortDesc)[0];  // HIGHEST

                if (!xCounter || !yCounter || !zCounter) { i -= 3; otGlobalCounter -= 3; break; }
                useCounter(xZone.name, xCounter);
                useCounter(yZone.name, yCounter);
                useCounter(zZone.name, zCounter);
                gapsUsed[xZone.name]++;
                timesUsed[xZone.name]++;
                timesUsed[yZone.name]++;
                timesUsed[zZone.name]++;

                fillBlock(xZone.name, xCounter, startIndex, BK[0], labelA);
                fillBlock(yZone.name, yCounter, BKE[0], effectiveEnd, labelA);
                fillBlock(yZone.name, yCounter, startIndex, BK[1], labelB);
                fillBlock(zZone.name, zCounter, BKE[1], effectiveEnd, labelB);
                fillBlock(zZone.name, zCounter, startIndex, BK[2], labelC);
                fillBlock(xZone.name, xCounter, BKE[2], effectiveEnd, labelC);

            } else if (useChain2) {
                // ── 2-person chain (A,B) ────────────────────────────────────
                const labelB = "OT" + (otGlobalCounter++) + officerSuffix();
                i += 2;
                const top2 = zonesLeft.slice(0, 2);

                const eligibleX2 = top2.filter(z => gapsUsed[z.name] < maxGaps[z.name]);
                const candidatesX2 = eligibleX2.length > 0 ? eligibleX2 : top2;
                const xZone = candidatesX2.reduce((best, z) => {
                    const lo = available[z.name].slice().sort(sortAsc)[0];
                    const bLo = available[best.name].slice().sort(sortAsc)[0];
                    const loN = parseInt((lo || '').replace(/\D/g, '')) || 0;
                    const bLoN = parseInt((bLo || '').replace(/\D/g, '')) || 0;
                    return loN > bLoN ? z : best;
                });
                const xCounter = available[xZone.name].slice().sort(sortAsc)[0];

                const yZone = top2.find(z => z !== xZone) || top2[0];
                const yCounter = available[yZone.name].slice().sort(sortDesc)[0];

                if (!xCounter || !yCounter) { i -= 2; otGlobalCounter -= 2; break; }
                useCounter(xZone.name, xCounter);
                useCounter(yZone.name, yCounter);
                gapsUsed[xZone.name]++;
                timesUsed[xZone.name]++;
                timesUsed[yZone.name]++;

                fillBlock(xZone.name, xCounter, startIndex, BK[0], labelA);
                fillBlock(yZone.name, yCounter, BKE[0], effectiveEnd, labelA);
                fillBlock(yZone.name, yCounter, startIndex, BK[1], labelB);
                fillBlock(xZone.name, xCounter, BKE[1], effectiveEnd, labelB);

            } else {
                // ── solo fill (no gap — straight through, back counter first) ──
                const z = zonesLeft[0]; // already sorted by timesUsed + tiebreak
                const c = available[z.name].slice().sort(sortDesc)[0]; // HIGHEST (back counter)
                if (!c) break;
                useCounter(z.name, c);
                timesUsed[z.name]++;
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
            const officerLabel = "SOS" + (sosGlobalCounter++) + officerSuffix();
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
        // Collect unique officer labels currently on the grid
        const labelMap = {}; // label → type
        document.querySelectorAll(".counter-cell.active").forEach(c => {
            if (c.dataset.officer) labelMap[c.dataset.officer] = c.dataset.type || "";
        });

        const labels = Object.keys(labelMap);
        if (labels.length === 0) { alert("No officers on grid to remove."); return; }

        // Sort: numeric (main) first ascending, then OT, then SOS
        labels.sort((a, b) => {
            const aNum = parseInt(a), bNum = parseInt(b);
            const aIsNum = !isNaN(aNum) && String(aNum) === a.split(" ")[0];
            const bIsNum = !isNaN(bNum) && String(bNum) === b.split(" ")[0];
            if (aIsNum && bIsNum) return aNum - bNum;
            if (aIsNum) return -1;
            if (bIsNum) return 1;
            return a.localeCompare(b);
        });

        // Helper: extract display text — show serial/id + any name
        function displayLabel(l) {
            // e.g. "20 | John / S123" → "20  John / S123"
            // e.g. "OT3 | Jane"       → "OT3  Jane"
            // e.g. "20"               → "20"
            return l.replace(" | ", "  ");
        }

        // Build modal
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;";

        overlay.innerHTML = `
            <div style="background:#fff;border-radius:10px;padding:22px;min-width:300px;max-width:380px;width:90%;box-shadow:0 6px 24px rgba(0,0,0,.35);font-family:inherit;">
                <h3 style="margin:0 0 14px;font-size:15px;color:#333;">Remove Officer</h3>
                <input id="_removeSearch" type="text" placeholder="Search by serial no. or name..."
                    style="width:100%;box-sizing:border-box;padding:8px 10px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;font-size:13px;outline:none;"/>
                <div style="font-size:11px;color:#888;margin-bottom:6px;">
                    ${labels.length} officer${labels.length > 1 ? "s" : ""} on grid
                </div>
                <select id="_removeSelect" size="10"
                    style="width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:6px;font-size:13px;padding:4px;line-height:1.6;">
                    ${labels.map(l => {
            const type = labelMap[l];
            const badge = type === "main" ? "🟠" : type === "ot" ? "🟣" : type === "sos" ? "🔵" : "⚪";
            return `<option value="${l}">${badge} ${displayLabel(l)}</option>`;
        }).join("")}
                </select>
                <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
                    <button id="_removeCancel"
                        style="padding:7px 16px;border-radius:6px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;font-size:13px;">
                        Cancel
                    </button>
                    <button id="_removeConfirm"
                        style="padding:7px 16px;border-radius:6px;border:none;background:#e53935;color:#fff;cursor:pointer;font-weight:600;font-size:13px;">
                        Remove
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        const searchEl = overlay.querySelector("#_removeSearch");
        const selectEl = overlay.querySelector("#_removeSelect");
        searchEl.focus();

        // Live filter
        searchEl.addEventListener("input", () => {
            const q = searchEl.value.toLowerCase();
            let firstVisible = null;
            [...selectEl.options].forEach(opt => {
                const match = opt.text.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q);
                opt.hidden = !match;
                if (!firstVisible && match) firstVisible = opt;
            });
            if (firstVisible) selectEl.value = firstVisible.value;
        });

        const close = () => document.body.removeChild(overlay);
        overlay.querySelector("#_removeCancel").addEventListener("click", close);
        overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

        overlay.querySelector("#_removeConfirm").addEventListener("click", () => {
            const target = selectEl.value;
            if (!target) { close(); return; }
            saveState();
            document.querySelectorAll(".counter-cell.active").forEach(cell => {
                if (cell.dataset.officer === target) {
                    cell.classList.remove("active");
                    cell.style.background = "";
                    cell.dataset.officer = "";
                    cell.dataset.type = "";
                }
            });
            updateAll();
            close();
        });
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