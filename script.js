let currentMode = "arrival";
let currentShift = "morning";

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");

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

function generateTimeSlots() {
    let slots = [];
    let start = currentShift === "morning" ? 10 : 22;
    let total = 48; // 12 hours * 4 (15 min intervals)

    for (let i = 0; i < total; i++) {
        let hour = (start + Math.floor(i / 4)) % 24;
        let min = (i % 4) * 15;
        slots.push(
            String(hour).padStart(2, "0") +
            String(min).padStart(2, "0")
        );
    }

    return slots;
}

function renderTable() {
    table.innerHTML = "";

    const timeSlots = generateTimeSlots();

    // Header
    let headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th"));

    timeSlots.forEach(time => {
        let th = document.createElement("th");
        th.innerText = time;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    let totalActive = 0;

    zones[currentMode].forEach(zone => {
        zone.counters.forEach(counter => {
            let row = document.createElement("tr");

            let label = document.createElement("td");
            label.innerText = counter;
            label.classList.add("zone-label");
            row.appendChild(label);

            timeSlots.forEach(() => {
                let cell = document.createElement("td");

                cell.addEventListener("click", () => {
                    cell.classList.toggle("active");
                    updateSummary();
                });

                row.appendChild(cell);
            });

            table.appendChild(row);
        });
    });

    updateSummary();
}

function updateSummary() {
    let activeCells = document.querySelectorAll("td.active").length;
    summary.innerHTML = `Total Manning Slots Selected: <b>${activeCells}</b>`;
}

// Toggle buttons
document.getElementById("arrivalBtn").onclick = () => {
    currentMode = "arrival";
    renderTable();
};

document.getElementById("departureBtn").onclick = () => {
    currentMode = "departure";
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
