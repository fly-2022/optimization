/* ================= EXCEL MAIN TEMPLATE SYSTEM ================= */

let excelWorkbook = null;
let excelData = {};
let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isDragging = false;
let dragMode = "add";
let tableEventsAttached = false;

function resetDragState() {
    isDragging = false;
    dragMode = "add";
}

// Store all cell states per mode/shift
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
        start = 10 * 60;  // 1000
        end = 22 * 60;    // 2200
    } else {
        start = 22 * 60;  // 2200
        end = (24 + 10) * 60; // 1000 next day = 34*60
    }

    for (let time = start; time < end; time += 15) {

        // convert back into 0–1440 range
        let minutes = time % (24 * 60);

        let hh = Math.floor(minutes / 60);
        let mm = minutes % 60;

        let hhmm =
            String(hh).padStart(2, "0") +
            String(mm).padStart(2, "0");

        slots.push(hhmm);

    }

    return slots;
}


/* ==================== renderTableOnce ==================== */
function renderTableOnce() {
    // const key = `${currentMode}_${currentShift}`;
    // if (renderedTables[key]) {
    //     // Table already exists, just restore previous selections
    //     restoreCellStates();
    //     return;
    // }

    table.innerHTML = "";
    tableEventsAttached = false;   // ← ADD THIS LINE
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

    // attachTableEvents();
    // renderedTables[key] = true;
}

/* ==================== Table Event Handling ==================== */
function attachTableEvents() {

    if (tableEventsAttached) return;   // ← ADD THIS LINE

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

    tableEventsAttached = true;   // ← ADD THIS LINE

    // Restore previous selections
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
    updateMainRoster();  // compact roster
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
    tbody.innerHTML = "";

    const times = generateTimeSlots();
    const officerMap = {};

    // collect all active cells by officer
    document.querySelectorAll(".counter-cell.active").forEach(cell => {
        const officerNum = cell.dataset.officer;
        if (!officerMap[officerNum]) officerMap[officerNum] = [];
        officerMap[officerNum].push(parseInt(cell.dataset.time));
    });

    // for each officer, generate roster chronologically
    Object.keys(officerMap).sort((a, b) => parseInt(a) - parseInt(b)).forEach(officerNum => {
        let slots = officerMap[officerNum];
        slots.sort((a, b) => a - b);

        let prevEnd = null;

        // group consecutive slots on the same counter
        let currentGroup = null;
        slots.forEach((timeIndex, idx) => {
            const cell = document.querySelector(`.counter-cell.active[data-time="${timeIndex}"][data-officer="${officerNum}"]`);
            const counter = cell.dataset.counter;

            if (!currentGroup) {
                currentGroup = { counter, startIndex: timeIndex, endIndex: timeIndex };
            } else if (counter === currentGroup.counter && timeIndex === currentGroup.endIndex + 1) {
                currentGroup.endIndex = timeIndex;
            } else {
                // output previous group
                appendRosterRow(currentGroup, prevEnd, officerNum, times);
                prevEnd = currentGroup.endIndex;
                currentGroup = { counter, startIndex: timeIndex, endIndex: timeIndex };
            }

            // output last group at the end
            if (idx === slots.length - 1) {
                appendRosterRow(currentGroup, prevEnd, officerNum, times);
            }
        });
    });

    function appendRosterRow(group, prevEnd, officerNum, times) {
        // Add break if there is a gap
        if (prevEnd !== null && group.startIndex > prevEnd + 1) {
            const trBreak = document.createElement("tr");
            trBreak.classList.add("break-row");
            const tdOfficer = document.createElement("td");
            tdOfficer.innerText = officerNum;
            const tdCounter = document.createElement("td");
            tdCounter.innerText = "Break";
            const tdStart = document.createElement("td");
            tdStart.innerText = formatTime(times[prevEnd + 1]);
            const tdEnd = document.createElement("td");
            tdEnd.innerText = formatTime(times[group.startIndex]);
            trBreak.appendChild(tdOfficer);
            trBreak.appendChild(tdCounter);
            trBreak.appendChild(tdStart);
            trBreak.appendChild(tdEnd);
            tbody.appendChild(trBreak);
        }

        // Add deployment
        const tr = document.createElement("tr");
        const tdOfficer = document.createElement("td");
        tdOfficer.innerText = officerNum;
        const tdCounter = document.createElement("td");
        tdCounter.innerText = group.counter;
        const tdStart = document.createElement("td");
        tdStart.innerText = formatTime(times[group.startIndex]);
        const tdEnd = document.createElement("td");
        // end time is the next slot after the last occupied
        tdEnd.innerText = formatTime(times[group.endIndex + 1] || times[group.endIndex]);
        tr.appendChild(tdOfficer);
        tr.appendChild(tdCounter);
        tr.appendChild(tdStart);
        tr.appendChild(tdEnd);
        tbody.appendChild(tr);
    }

    function formatTime(hhmm) {
        return hhmm.slice(0, 2) + ":" + hhmm.slice(2);
    }
}

function updateSOSRoster(startTime, endTime) {
    const tbody = document.querySelector("#sosRosterTable tbody");
    const heading = document.getElementById("sosRosterHeading");
    tbody.innerHTML = "";

    heading.innerText = `${startTime}-${endTime} SOS Roster`;

    const times = generateTimeSlots();
    const startIndex = times.findIndex(t => t === startTime);
    const endIndex = times.findIndex(t => t === endTime);

    if (startIndex === -1 || endIndex === -1) return;

    const officerMap = {};
    document.querySelectorAll(".counter-cell.active").forEach(cell => {
        const officerNum = cell.dataset.officer;
        if (!officerNum) return;

        const cellTime = parseInt(cell.dataset.time);
        if (cellTime < startIndex || cellTime >= endIndex) return;

        if (!officerMap[officerNum]) officerMap[officerNum] = [];
        officerMap[officerNum].push({ timeIndex: cellTime, counter: cell.dataset.counter });
    });

    Object.keys(officerMap).sort((a, b) => parseInt(a) - parseInt(b)).forEach(officerNum => {
        const slots = officerMap[officerNum].sort((a, b) => a.timeIndex - b.timeIndex);
        if (!slots.length) return;

        // Total deployment in minutes
        const totalMinutes = (slots[slots.length - 1].timeIndex - slots[0].timeIndex + 1) * 15;

        // Determine break schedule for this SOS officer
        const breaks = []; // { startIndex, endIndex }
        if (totalMinutes > 180) { // more than 3 hours
            // Example: for 12-hour shift, 2x45, 1x30, 1x15 -> can scale dynamically
            let remaining = totalMinutes - 180; // time after first 3 hours
            let breakDurations = [45, 45, 30, 15]; // in mins
            breakDurations = breakDurations.filter(d => d <= remaining);
            let currentTimeIndex = slots[0].timeIndex + 12; // first break after 3 hours = 180/15 = 12 slots

            for (let b = 0; b < breakDurations.length; b++) {
                let start = currentTimeIndex;
                let end = currentTimeIndex + Math.floor(breakDurations[b] / 15) - 1;
                breaks.push({ startIndex: start, endIndex: end });
                currentTimeIndex = end + 1 + 12; // next break after another 3 hours
            }
        }

        // Now render blocks (deployment or break)
        let prevEnd = null;
        let breakIdx = 0;

        let currentGroup = { type: "deploy", counter: slots[0].counter, startIndex: slots[0].timeIndex, endIndex: slots[0].timeIndex };

        for (let i = 1; i < slots.length; i++) {
            let slot = slots[i];

            // Check if current slot is a break
            if (breakIdx < breaks.length && slot.timeIndex >= breaks[breakIdx].startIndex && slot.timeIndex <= breaks[breakIdx].endIndex) {
                // Finish current deploy block
                appendSOSRow(currentGroup, officerNum, times);

                // Add break row
                const trBreak = document.createElement("tr");
                const tdOfficer = document.createElement("td");
                tdOfficer.innerText = officerNum;
                const tdCounter = document.createElement("td");
                tdCounter.innerText = "Break";
                const tdStart = document.createElement("td");
                tdStart.innerText = formatTime(times[breaks[breakIdx].startIndex]);
                const tdEnd = document.createElement("td");
                tdEnd.innerText = formatTime(times[breaks[breakIdx].endIndex + 1] || times[breaks[breakIdx].endIndex]);
                trBreak.appendChild(tdOfficer);
                trBreak.appendChild(tdCounter);
                trBreak.appendChild(tdStart);
                trBreak.appendChild(tdEnd);
                tbody.appendChild(trBreak);

                breakIdx++;
                // start new deploy block after break
                currentGroup = { type: "deploy", counter: slot.counter, startIndex: slot.timeIndex, endIndex: slot.timeIndex };
            } else if (slot.counter === currentGroup.counter && slot.timeIndex === currentGroup.endIndex + 1) {
                currentGroup.endIndex = slot.timeIndex;
            } else {
                appendSOSRow(currentGroup, officerNum, times);
                currentGroup = { type: "deploy", counter: slot.counter, startIndex: slot.timeIndex, endIndex: slot.timeIndex };
            }
        }

        appendSOSRow(currentGroup, officerNum, times);
    });

    function appendSOSRow(group, officerNum, times) {
        if (!group) return;
        const tr = document.createElement("tr");
        const tdOfficer = document.createElement("td");
        tdOfficer.innerText = officerNum;
        const tdCounter = document.createElement("td");
        tdCounter.innerText = group.type === "deploy" ? group.counter : "Break";
        const tdStart = document.createElement("td");
        tdStart.innerText = formatTime(times[group.startIndex]);
        const tdEnd = document.createElement("td");
        tdEnd.innerText = formatTime(times[group.endIndex + 1] || times[group.endIndex]);
        tr.appendChild(tdOfficer);
        tr.appendChild(tdCounter);
        tr.appendChild(tdStart);
        tr.appendChild(tdEnd);
        tbody.appendChild(tr);
    }

    function formatTime(hhmm) {
        return hhmm.slice(0, 2) + ":" + hhmm.slice(2);
    }
}


/* ---------------- Mode & Shift Segmented Buttons ----------------- */
// Keep track of which mode/shift tables have been rendered
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

    isDragging = false;   // <--- add this
    dragMode = "add";     // <--- add this

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

    // 🔥 ADD THIS
    if (currentMode === "arrival") {
        currentColor = "#4CAF50";
    } else {
        currentColor = "#FF9800";
    }

    isDragging = false;   // <--- add this
    dragMode = "add";     // <--- add this

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

    // -------------------- Select Manpower Type --------------------
    document.querySelectorAll(".mp-type").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".mp-type").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            manpowerType = btn.dataset.type;

            sosFields.style.display = manpowerType === "sos" ? "block" : "none";
            otFields.style.display = manpowerType === "ot" ? "block" : "none";
        });
    });

    // -------------------- Save / Restore State --------------------
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

    // -------------------- Main Template Assignment --------------------
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

        // --------------------- Original Excel Assignment ---------------------
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
                            cell.dataset.officer = officer; // <-- ADD THIS
                        }
                    });
                }

                console.log("Officer", officer, "Counter", counter, "Start", start, "End", end);
                console.log("startIndex:", startIndex, "endIndex:", endIndex);
            });
        }

        // --------------------- Every 3rd Officer Special Period ---------------------
        if ((currentMode === "arrival" || currentMode === "departure") && currentShift === "morning") {
            const specialStart = "2030";
            const specialEnd = times[times.length - 1]; // last slot
            const startIndex = times.findIndex(t => t === specialStart);
            const endIndex = times.findIndex(t => t === specialEnd);

            if (startIndex !== -1 && endIndex !== -1) {
                const totalOfficers = officerCount;
                const officersToAssign = Math.floor(totalOfficers / 4); // one officer per group of 4
                let assignedOfficers = 0;

                for (let officer = 1; officer <= totalOfficers; officer++) {
                    if (officer % 4 !== 0) continue; // only every 4th officer
                    if (assignedOfficers >= officersToAssign) break;

                    let assigned = false;

                    // ----------------- Prioritize Zones Below 50% -----------------
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
                                    cell.dataset.officer = officer;  // <- important!
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

    function getOTBreakOptions(slot) {
        const times = generateTimeSlots();

        function make(start, end) {
            return {
                startIndex: times.findIndex(t => t === start),
                endIndex: times.findIndex(t => t === end)
            };
        }

        if (slot === "0600-1100") {
            return [
                make("0730", "0815"),
                make("0815", "0900"),
                make("0900", "0945")
            ];
        }

        if (slot === "1100-1600") {
            return [
                make("1230", "1315"),
                make("1315", "1400"),
                make("1400", "1445")
            ];
        }

        if (slot === "1600-2100") {
            return [
                make("1730", "1815"),
                make("1815", "1900"),
                make("1900", "1945")
            ];
        }

        return [];
    }

    function isOTWithinShift(otStart, otEnd) {
        // // Convert input to HH:MM format (just in case)
        // otStart = otStart.padStart(5, '0');
        // otEnd = otEnd.padStart(5, '0');

        if (currentShift === "morning") {
            // Morning shift allows 1100-1600 & 1600-2100
            return (otStart === "1100" && otEnd === "1600") ||
                (otStart === "1600" && otEnd === "2100");

        } else if (currentShift === "night") {
            // Night shift allows 0600-1100 only
            return otStart === "0600" && otEnd === "1100";
        }

        return false; // any other combination is invalid
    }


    function allocateOTOfficers(count, otStart, otEnd) {

        const times = generateTimeSlots();
        const tbody = document.querySelector("#otRosterTable tbody");

        if (tbody) {
            tbody.innerHTML = "";
        }


        let startIndex = times.findIndex(t => t === otStart);

        // find the LAST valid slot before otEnd
        let endIndex = times.findIndex(t => t === otEnd);

        // If OT end is outside grid (like 1100 in night shift),
        // allow deployment until grid end
        if (startIndex === -1) {
            alert("OT start time outside current shift.");
            return;
        }

        if (endIndex === -1) {
            endIndex = times.length; // allow until grid ends
        }

        // Release 30 mins before end
        let releaseIndex = Math.max(startIndex, endIndex - 2);

        // ---------------- BREAK SLOT OPTIONS ----------------
        let breakOptions = getOTBreakOptions(`${otStart}-${otEnd}`);

        // ---------------- FIX: use local variables, don't overwrite globals ----------------
        let otMode = currentMode;   // use the currently selected mode
        let otColor = currentColor; // use the currently selected color

        // =====================================================
        for (let officer = 1; officer <= count; officer++) {

            // Pick one break randomly
            const chosenBreak = breakOptions[Math.floor(Math.random() * breakOptions.length)];

            let currentIndex = startIndex;

            while (currentIndex < releaseIndex) {

                // 🔹 properly skip break slots
                if (chosenBreak && currentIndex >= chosenBreak.startIndex && currentIndex <= chosenBreak.endIndex) {
                    currentIndex = chosenBreak.endIndex + 1; // move past break
                    continue;
                }

                // Find lowest manned zone first (50% logic preserved)
                let bestZone = null;
                let lowestRatio = 1;

                zones[otMode].forEach(zone => {
                    if (zone.name === "BIKES") return;

                    const timeStr = times[currentIndex];

                    const activeCount =
                        [...document.querySelectorAll(`.counter-cell[data-zone="${zone.name}"][data-time="${timeStr}"]`)]
                            .filter(c => c.classList.contains("active")).length;

                    const ratio = activeCount / zone.counters.length;

                    if (ratio < lowestRatio) {
                        lowestRatio = ratio;
                        bestZone = zone;
                    }
                });

                if (!bestZone) break;

                const emptyCells = getEmptyCellsBackFirst(bestZone.name, currentIndex);

                if (!emptyCells.length) {
                    currentIndex++;
                    continue;
                }

                const cell = emptyCells[0];

                cell.classList.add("active");
                cell.style.background = otColor;
                cell.dataset.officer = officer;

                currentIndex++;
            }
        }

        updateAll();
    }



    // -------------------- Add Officers Global --------------------
    function addOfficersGlobal(count, startTime, endTime) {
        const times = generateTimeSlots();
        let startIndex = times.findIndex(t => t === startTime);
        let endIndex = times.findIndex(t => t === endTime);

        if (startIndex === -1 || endIndex === -1) {
            alert("Time range outside current shift grid.");
            return;
        }

        for (let t = startIndex; t < endIndex; t++) {
            const zoneLimits = {};
            console.log("Current Shift:", currentShift);
            console.log("Current Mode:", currentMode);
            console.log("Zones:", zones[currentMode]);

            if (!zones[currentMode]) {
                console.log("Mode not found, fallback to arrival");
                currentMode = "arrival";
            }

            zones[currentMode].forEach(zone => {
                if (zone.name === "BIKES") return;
                const total = zone.counters.length;
                zoneLimits[zone.name] = Math.ceil(total / 2); // at least 50% manning
            });

            let remainingToAdd = count;

            // First pass: fill zones to 50%
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
                    // assign officer number
                    cell.dataset.officer = officer;  // <- new
                }
                remainingToAdd -= needed;
            });

            // Second pass: fill remaining
            if (remainingToAdd > 0) {
                zones[currentMode].forEach(zone => {
                    if (zone.name === "BIKES") return;
                    const emptyCells = getEmptyCellsBackFirst(zone.name, t);
                    const toAdd = Math.min(emptyCells.length, remainingToAdd);
                    for (let i = 0; i < toAdd; i++) {
                        const cell = emptyCells[i];
                        cell.classList.add("active");
                        cell.style.background = currentColor;
                        // assign officer number
                        cell.dataset.officer = officer;  // <- new
                    }
                    remainingToAdd -= toAdd;
                });
            }
        }
        updateAll();
    }

    // -------------------- Button Clicks --------------------
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

            // Assign each officer as a continuous block
            for (let officer = 1; officer <= count; officer++) {
                for (let t = startIndex; t < endIndex; t++) {
                    zones[currentMode].forEach(zone => {
                        if (zone.name === "BIKES") return;
                        const emptyCells = getEmptyCellsBackFirst(zone.name, t);
                        if (emptyCells.length > 0) {
                            const cell = emptyCells[0]; // take first empty cell
                            if (!cell.classList.contains("active")) {
                                cell.classList.add("active");
                                cell.style.background = currentColor;
                                cell.dataset.officer = officer;
                            }
                        }
                    });
                }
            }

            updateAll();

            assignSOSOfficers(count, start, end); // your existing code to fill cells

            // 🔹 Update SOS roster table
            updateSOSRoster(start, end);
        }


        if (manpowerType === "ot") {
            const slot = document.getElementById("otSlot").value; // e.g., "1100-1600"
            const [start, end] = slot.split("-");

            // start/end are already "HHMM", matches grid format
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

/* -------------------- Utility: Empty Cells Back-First -------------------- */
// function getEmptyCellsBackFirst(zoneName, timeIndex) {
//     const cells = [...document.querySelectorAll(`.counter-cell[data-zone="${zoneName}"][data-time="${timeIndex}"]`)];
//     let emptyCells = cells.filter(c => !c.classList.contains("active"));

//     emptyCells.sort((a, b) => {
//         const numA = parseInt(a.parentElement.firstChild.innerText.replace(/\D/g, ''));
//         const numB = parseInt(b.parentElement.firstChild.innerText.replace(/\D/g, ''));
//         return numB - numA;
//     });

//     return emptyCells;
// }

function getEmptyCellsBackFirst(zoneName, timeIndex) {

    const times = generateTimeSlots();
    const timeStr = times[timeIndex];   // convert index → actual time string

    const cells = [
        ...document.querySelectorAll(
            `.counter-cell[data-zone="${zoneName}"][data-time="${timeStr}"]`
        )
    ];

    let emptyCells = cells.filter(c => !c.classList.contains("active"));

    emptyCells.sort((a, b) =>
        parseInt(b.parentElement.firstChild.innerText.replace(/\D/g, '')) -
        parseInt(a.parentElement.firstChild.innerText.replace(/\D/g, ''))
    );

    return emptyCells;
}
