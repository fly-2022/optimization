let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isMouseDown = false;
let lastCell = null;

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
const manningSummaryDiv = document.getElementById("manningSummary");
const modeHighlight = document.getElementById("modeHighlight");
const shiftHighlight = document.getElementById("shiftHighlight");

// ---------------- ZONES -----------------
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

// ---------------- CLEAR GRID -----------------
document.getElementById("clearGridBtn").addEventListener("click", () => {
    document.querySelectorAll("#rosterTable td").forEach(td => {
        td.style.background = "";
        td.classList.remove("active");
    });
    updateSummary();
    renderManningSummary();
});

// ---------------- GENERATE TIME SLOTS -----------------
function generateTimeSlots() {
    let slots = [];
    if (currentShift === "morning") {
        let start = 10 * 60; // 10:00
        let end = 22 * 60; // 22:00
        for (let t = start; t <= end; t += 15) {
            let hour = Math.floor(t / 60); let min = t % 60;
            slots.push(String(hour).padStart(2, "0") + String(min).padStart(2, "0"));
        }
    } else {
        let start = 22 * 60; // 22:00
        for (let i = 0; i <= 48; i++) { // 48 intervals till 10:00 next day
            let t = (start + i * 15) % 1440;
            let hour = Math.floor(t / 60); let min = t % 60;
            slots.push(String(hour).padStart(2, "0") + String(min).padStart(2, "0"));
        }
    }
    return slots;
}

// ---------------- RENDER TABLE -----------------
function renderTable() {
    table.innerHTML = "";
    const timeSlots = generateTimeSlots();

    zones[currentMode].forEach(zone => {
        // Zone label row
        const zoneRow = document.createElement("tr");
        const zoneCell = document.createElement("td");
        zoneCell.colSpan = timeSlots.length + 2;
        zoneCell.innerText = zone.name;
        zoneCell.style.background = "#eeeeee";
        zoneCell.style.fontWeight = "bold";
        table.appendChild(zoneRow); table.appendChild(zoneCell);

        // Time row
        const timeRow = document.createElement("tr");
        const emptyCell = document.createElement("td"); // for counter label
        timeRow.appendChild(emptyCell);
        timeSlots.forEach(slot => {
            const timeCell = document.createElement("td");
            timeCell.innerText = slot;
            timeRow.appendChild(timeCell);
        });
        const subtotalCell = document.createElement("td"); subtotalCell.innerText = "Subtotal"; timeRow.appendChild(subtotalCell);
        table.appendChild(timeRow);

        // Counter rows
        zone.counters.forEach(counter => {
            const row = document.createElement("tr");
            const label = document.createElement("td"); label.innerText = counter; label.style.fontWeight = "bold"; row.appendChild(label);
            timeSlots.forEach(() => {
                const cell = document.createElement("td");
                attachCellEvents(cell);
                row.appendChild(cell);
            });
            // Subtotal cell per counter
            const subCell = document.createElement("td"); subCell.classList.add("subtotal"); subCell.innerText = "0"; row.appendChild(subCell);
            table.appendChild(row);
        });

        // Zone subtotal row
        const zRow = document.createElement("tr");
        const zLabel = document.createElement("td"); zLabel.innerText = "Zone Total"; zLabel.style.fontWeight = "bold"; zRow.appendChild(zLabel);
        for (let i = 0; i < timeSlots.length; i++) {
            const zCell = document.createElement("td"); zCell.classList.add("subtotal"); zCell.innerText = "0"; zRow.appendChild(zCell);
        }
        const zTotalCell = document.createElement("td"); zTotalCell.classList.add("subtotal"); zTotalCell.innerText = "0"; zRow.appendChild(zTotalCell);
        table.appendChild(zRow);
    });

    updateSummary();
    renderManningSummary();
}

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell) {
    cell.addEventListener("pointerdown", e => {
        isMouseDown = true;
        lastCell = cell;
        let apply = cell.style.background ? "remove" : "apply";
        toggleCell(cell, apply);
    });
    cell.addEventListener("pointermove", e => {
        if (isMouseDown) {
            let el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el.tagName === "TD" && el !== lastCell && !el.classList.contains("subtotal") && el.innerText === "") {
                toggleCell(el, lastCell.style.background ? "remove" : "apply");
                lastCell = el;
            }
        }
    });
    cell.addEventListener("pointerup", e => { isMouseDown = false; lastCell = null; });
    cell.addEventListener("click", e => {
        if (!cell.classList.contains("subtotal") && cell.innerText === "") toggleCell(cell, cell.style.background ? "remove" : "apply");
    });
}

function toggleCell(cell, action) {
    if (action === "apply") { cell.style.background = currentColor; cell.classList.add("active"); }
    else { cell.style.background = ""; cell.classList.remove("active"); }
    updateSummary();
    renderManningSummary();
    updateSubtotals();
}

// ---------------- UPDATE SUBTOTALS -----------------
function updateSubtotals() {
    const rows = [...table.rows];
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (row.cells.length > 1 && !row.cells[0].classList.contains("subtotal")) {
            let sum = 0;
            for (let c = 1; c < row.cells.length - 1; c++) {
                if (row.cells[c].classList.contains("active")) sum++;
            }
            row.cells[row.cells.length - 1].innerText = sum;
        }
    }
    // Zone subtotal
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (row.cells[0] && row.cells[0].innerText === "Zone Total") {
            for (let c = 1; c < row.cells.length; c++) {
                let colSum = 0;
                for (let rr = r - rows[r].cells.length + 1; rr < r; rr++) {
                    const checkRow = rows[rr];
                    if (checkRow.cells[c] && !checkRow.cells[c].classList.contains("subtotal") && checkRow.cells[c].classList.contains("active")) colSum++;
                }
                row.cells[c].innerText = colSum;
            }
        }
    }
}

// ---------------- UPDATE SUMMARY -----------------
function updateSummary() {
    let count = 0;
    document.querySelectorAll("#rosterTable td").forEach(td => { if (td.style.background) count++; });
    summary.innerHTML = `Current Mode: <b>${currentMode.toUpperCase()}</b> | Current Shift: <b>${currentShift.toUpperCase()}</b> | Total Cells Selected: <b>${count}</b>`;
}

// ---------------- MANNING SUMMARY -----------------
function renderManningSummary() {
    const timeSlots = generateTimeSlots();
    let result = "";
    timeSlots.forEach(slot => {
        let car = 0, bike = 0, zoneCounts = [0, 0, 0, 0];
        zones[currentMode].forEach((zone, zi) => {
            zone.counters.forEach(counter => {
                const row = [...table.rows].find(r => r.cells[0].innerText === counter);
                const idx = timeSlots.indexOf(slot) + 1;
                if (row && row.cells[idx] && row.cells[idx].classList.contains("active")) {
                    if (zone.name === "BIKES") bike++;
                    else { car++; zoneCounts[zi >= 4 ? 3 : zi]++; }
                }
            });
        });
        result += `${slot}: ${car.toString().padStart(2, "0")}/${bike.toString().padStart(2, "0")}\n`;
        result += zoneCounts.join("/") + "\n\n";
    });
    manningSummaryDiv.innerText = result;
}

// ---------------- COPY SUMMARY -----------------
document.getElementById("copySummaryBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(manningSummaryDiv.innerText);
    alert("Manning summary copied!");
});

// ---------------- SEGMENTED BUTTONS -----------------
function initSegmented() {
    const modeBtns = [document.getElementById("arrivalBtn"), document.getElementById("departureBtn")];
    const shiftBtns = [document.getElementById("morningBtn"), document.getElementById("nightBtn")];

    modeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            modeBtns.forEach(b => b.style.color = "black");
            btn.style.color = "white";
            currentMode = btn.id === "arrivalBtn" ? "arrival" : "departure";
            currentColor = currentMode === "arrival" ? "#4CAF50" : "#FF9800";
            modeHighlight.style.transform = `translateX(${btn.dataset.index * 100}%)`;
            modeHighlight.style.background = currentColor;
            renderTable();
        });
    });

    shiftBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            shiftBtns.forEach(b => b.style.color = "black");
            btn.style.color = "white";
            currentShift = btn.id === "morningBtn" ? "morning" : "night";
            shiftHighlight.style.transform = `translateX(${btn.dataset.index * 100}%)`;
            shiftHighlight.style.background = currentShift === "morning" ? "#b0bec5" : "#9e9e9e";
            renderTable();
        });
    });
}

// ---------------- INIT -----------------
initSegmented();
renderTable();
