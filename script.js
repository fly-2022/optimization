let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";

let isDragging = false;
let dragMode = "apply";

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");

/* ================= ZONES (RESTORED FULL) ================= */

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
        { name: "Zone 2", counters: range("DC", 9, 19) },
        { name: "Zone 3", counters: range("DC", 20, 29) },
        { name: "Zone 4", counters: range("DC", 29, 36) },
        { name: "BIKES", counters: ["DM37A", "DM37C"] }
    ]
};

function range(prefix, start, end) {
    let arr = [];
    for (let i = start; i <= end; i++) {
        arr.push(prefix + i);
    }
    return arr;
}

/* ================= TIME GENERATION ================= */

function generateTimeSlots() {
    const slots = [];
    const startHour = currentShift === "morning" ? 10 : 22;

    for (let i = 0; i < 48; i++) {
        const hour = (startHour + Math.floor(i / 4)) % 24;
        const minute = (i % 4) * 15;
        slots.push(
            String(hour).padStart(2, "0") +
            String(minute).padStart(2, "0")
        );
    }
    return slots;
}

/* ================= iOS SEGMENTED CONTROL ================= */

document.querySelectorAll(".segmented").forEach(segment => {
    const buttons = segment.querySelectorAll(".segment-btn");
    const highlight = segment.querySelector(".segment-highlight");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {

            // Reset button states
            buttons.forEach(b => {
                b.classList.remove("active");
                b.style.color = "black";
            });

            btn.classList.add("active");

            // Slide highlight
            highlight.style.transform = `translateX(${btn.dataset.index * 100}%)`;

            // Arrival / Departure colouring
            if (btn.id === "arrivalBtn") {
                highlight.style.background = "#4CAF50";
                btn.style.color = "white";
                currentMode = "arrival";
                currentColor = "#4CAF50";
                renderTable();
            }

            if (btn.id === "departureBtn") {
                highlight.style.background = "#ff9800";
                btn.style.color = "white";
                currentMode = "departure";
                currentColor = "#ff9800";
                renderTable();
            }

            // Morning / Night
            if (btn.id === "morningBtn") {
                highlight.style.background = "white";
                currentShift = "morning";
                renderTable();
            }

            if (btn.id === "nightBtn") {
                highlight.style.background = "white";
                currentShift = "night";
                renderTable();
            }
        });
    });
});

/* ================= COLOR PICKER ================= */

document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        currentColor = btn.dataset.color;

        document.querySelectorAll(".color-btn")
            .forEach(b => b.classList.remove("selected"));

        btn.classList.add("selected");
    });
});

// Default selected
document.querySelector(".color-btn").classList.add("selected");

/* ================= CLEAR GRID ================= */

document.getElementById("clearGridBtn")
    .addEventListener("click", () => {
        document.querySelectorAll("#rosterTable td")
            .forEach(td => {
                td.style.backgroundColor = "";
                td.classList.remove("active-cell");
            });
    });

/* ================= RENDER TABLE ================= */

function renderTable() {

    table.innerHTML = "";
    const timeSlots = generateTimeSlots();

    zones[currentMode].forEach(zone => {

        // Repeat time header above each zone
        const headerRow = document.createElement("tr");
        headerRow.appendChild(document.createElement("th"));

        timeSlots.forEach(time => {
            const th = document.createElement("th");
            th.innerText = time;
            headerRow.appendChild(th);
        });

        table.appendChild(headerRow);

        // Zone row
        const zoneRow = document.createElement("tr");
        const zoneCell = document.createElement("td");
        zoneCell.innerText = zone.name;
        zoneCell.colSpan = timeSlots.length + 1;
        zoneRow.classList.add("zone-row");
        zoneRow.appendChild(zoneCell);
        table.appendChild(zoneRow);

        // Counter rows
        zone.counters.forEach(counter => {

            const row = document.createElement("tr");
            const label = document.createElement("td");
            label.innerText = counter;
            row.appendChild(label);

            timeSlots.forEach(() => {

                const cell = document.createElement("td");

                cell.addEventListener("pointerdown", () => {
                    isDragging = true;
                    dragMode = cell.classList.contains("active-cell") ? "remove" : "apply";
                    applyCell(cell);
                });

                cell.addEventListener("pointerenter", () => {
                    if (isDragging) applyCell(cell);
                });

                cell.addEventListener("click", () => {
                    if (!isDragging) applyCell(cell);
                });

                row.appendChild(cell);
            });

            table.appendChild(row);
        });
    });

    updateSummary();
}

window.addEventListener("pointerup", () => {
    isDragging = false;
});

/* ================= APPLY COLOR ================= */

function applyCell(cell) {

    if (dragMode === "apply") {
        cell.style.backgroundColor = currentColor;
        cell.classList.add("active-cell");
    } else {
        cell.style.backgroundColor = "";
        cell.classList.remove("active-cell");
    }

    updateSummary();
}

/* ================= SUMMARY ================= */

function updateSummary() {
    const count = document.querySelectorAll(".active-cell").length;

    summary.innerHTML =
        `Mode: <b>${currentMode.toUpperCase()}</b> |
     Shift: <b>${currentShift.toUpperCase()}</b> |
     Selected: <b>${count}</b>`;
}

/* ================= INITIAL LOAD ================= */

renderTable();

