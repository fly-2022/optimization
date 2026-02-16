let currentMode = localStorage.getItem("currentMode") || "arrival";
let currentShift = localStorage.getItem("currentShift") || "morning";
let currentColor = currentMode==="arrival"?"#4CAF50":"#FF9800";
let isMouseDown = false;
let lastCell = null;

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
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
    { name: "Zone 2", counters: range("DC", 9, 19) },
    { name: "Zone 3", counters: range("DC", 20, 29) },
    { name: "Zone 4", counters: range("DC", 30, 36) },
    { name: "BIKES", counters: ["DM37A", "DM37C"] }
  ]
};
function range(prefix, start, end){ let arr=[]; for(let i=start;i<=end;i++) arr.push(prefix+i); return arr; }

// ---------------- COLOR PICKER -----------------
document.querySelectorAll(".color-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    currentColor = btn.dataset.color;
    document.querySelectorAll(".color-btn").forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

// ---------------- CLEAR GRID -----------------
document.getElementById("clearGridBtn").addEventListener("click", ()=>{
  document.querySelectorAll("#rosterTable td").forEach(td=>{
    td.style.background = "";
    td.classList.remove("active");
  });
  updateSummary();
  localStorage.removeItem("gridData");
});

// ---------------- GENERATE TIME SLOTS -----------------
function generateTimeSlots(){
  let slots = [];
  let startHour = currentShift==="morning"?10:22;
  for(let i=0;i<48;i++){
    let hour = (startHour+Math.floor(i/4))%24;
    let minute = (i%4)*15;
    slots.push(String(hour).padStart(2,"0")+String(minute).padStart(2,"0"));
  }
  return slots;
}

// ---------------- RENDER TABLE -----------------
function renderTable(){
  table.innerHTML="";
  const timeSlots = generateTimeSlots();

  zones[currentMode].forEach(zone=>{
    const zoneRow = document.createElement("tr");
    const zoneCell = document.createElement("td");
    zoneCell.colSpan = timeSlots.length+1;
    zoneCell.innerText = zone.name;
    zoneCell.style.background = "#eeeeee";
    zoneCell.style.fontWeight = "bold";
    table.appendChild(zoneRow);
    table.appendChild(zoneCell);

    zone.counters.forEach(counter=>{
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.innerText = counter;
      label.style.fontWeight="bold";
      row.appendChild(label);
      timeSlots.forEach((_,i)=>{ 
        const cell = document.createElement("td"); 
        attachCellEvents(cell);
        // Load from localStorage
        const saved = JSON.parse(localStorage.getItem("gridData")||"{}");
        if(saved[currentMode] && saved[currentMode][counter] && saved[currentMode][counter][i]){
          cell.style.background = saved[currentMode][counter][i];
          cell.classList.add("active");
        }
        row.appendChild(cell);
      });
      table.appendChild(row);
    });
  });
  updateSummary();
}

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell){
  cell.addEventListener("pointerdown", e=>{
    isMouseDown = true;
    lastCell = cell;
    let apply = cell.style.background? "remove":"apply";
    toggleCell(cell, apply);
  });
  cell.addEventListener("pointermove", e=>{
    if(isMouseDown){
      let el=document.elementFromPoint(e.clientX,e.clientY);
      if(el && el.tagName==="TD" && el!==lastCell){
        toggleCell(el, lastCell.style.background? "remove":"apply");
        lastCell = el;
      }
    }
  });
  cell.addEventListener("pointerup", e=>{ isMouseDown=false; lastCell=null; });

  cell.addEventListener("click", e=>{
    toggleCell(cell, cell.style.background? "remove":"apply");
  });
}

function toggleCell(cell, action){
  if(action==="apply"){ cell.style.background=currentColor; cell.classList.add("active"); }
  else{ cell.style.background=""; cell.classList.remove("active"); }
  updateSummary();
  saveGridData();
}

// ---------------- SAVE/LOAD GRID -----------------
function saveGridData(){
  const data = {};
  zones[currentMode].forEach(zone=>{
    zone.counters.forEach(counter=>{
      const row = Array.from(table.rows).find(r=>r.cells[0].innerText===counter);
      if(row){
        data[counter] = Array.from(row.cells).slice(1).map(c=>c.style.background);
      }
    });
  });
  const saved = JSON.parse(localStorage.getItem("gridData")||"{}");
  saved[currentMode] = data;
  localStorage.setItem("gridData", JSON.stringify(saved));
}

// ---------------- UPDATE SUMMARY -----------------
function updateSummary(){
  let count = 0;
  document.querySelectorAll("#rosterTable td.active").forEach(td=> count++);
  summary.innerHTML = `Current Mode: <b>${currentMode.toUpperCase()}</b> | Current Shift: <b>${currentShift.toUpperCase()}</b> | Total Cells Selected: <b>${count}</b>`;
}

// ---------------- SEGMENTED BUTTONS -----------------
function initSegmented(){
  const modeBtns = [document.getElementById("arrivalBtn"),document.getElementById("departureBtn")];
  const shiftBtns = [document.getElementById("morningBtn"),document.getElementById("nightBtn")];

  modeBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      modeBtns.forEach(b=>b.style.color="black");
      btn.style.color="white";
      currentMode = btn.id==="arrivalBtn"?"arrival":"departure";
      currentColor = currentMode==="arrival"?"#4CAF50":"#FF9800";
      modeHighlight.style.transform = `translateX(${btn.dataset.index*100}%)`;
      modeHighlight.style.background = currentColor;
      localStorage.setItem("currentMode", currentMode);
      renderTable();
    });
  });

  shiftBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      shiftBtns.forEach(b=>b.style.color="black");
      btn.style.color="white";
      currentShift = btn.id==="morningBtn"?"morning":"night";
      shiftHighlight.style.transform = `translateX(${btn.dataset.index*100}%)`;
      shiftHighlight.style.background = currentShift==="morning"?"#b0bec5":"#9e9e9e";
      localStorage.setItem("currentShift", currentShift);
      renderTable();
    });
  });
}

// ---------------- INIT -----------------
initSegmented();
renderTable();

// Optional: re-render on resize to adjust table for small screens
window.addEventListener('resize', ()=>{ renderTable(); });
