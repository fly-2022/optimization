let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isMouseDown = false;
let lastCell = null;

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
const modeHighlight = document.getElementById("modeHighlight");
const shiftHighlight = document.getElementById("shiftHighlight");

// ---------------- ZONES -----------------
function range(prefix, start, end){ let arr=[]; for(let i=start;i<=end;i++) arr.push(prefix+i); return arr; }
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
    td.style.background="";
    td.classList.remove("active");
  });
  localStorage.removeItem("gridData");
  updateSummary();
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

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell, counter, index){
  cell.addEventListener("pointerdown", e=>{
    isMouseDown = true;
    lastCell = cell;
    let apply = cell.style.background? "remove":"apply";
    toggleCell(cell, apply, counter, index);
  });
  cell.addEventListener("pointermove", e=>{
    if(isMouseDown){
      let el=document.elementFromPoint(e.clientX,e.clientY);
      if(el && el.tagName==="TD" && el!==lastCell){
        toggleCell(el, lastCell.style.background? "remove":"apply", counter, index);
        lastCell = el;
      }
    }
  });
  cell.addEventListener("pointerup", e=>{ isMouseDown=false; lastCell=null; });

  cell.addEventListener("click", e=>{
    toggleCell(cell, cell.style.background? "remove":"apply", counter, index);
  });
}

// ---------------- TOGGLE CELL -----------------
function toggleCell(cell, action, counter, index){
  let saved = JSON.parse(localStorage.getItem("gridData")||"{}");
  if(!saved[currentMode]) saved[currentMode]={};
  if(!saved[currentMode][counter]) saved[currentMode][counter]=[];

  if(action==="apply"){
    cell.style.background=currentColor;
    cell.classList.add("active");
    saved[currentMode][counter][index]=currentColor;
  } else{
    cell.style.background="";
    cell.classList.remove("active");
    saved[currentMode][counter][index]=null;
  }
  localStorage.setItem("gridData", JSON.stringify(saved));
  updateSummary();
}

// ---------------- UPDATE SUMMARY -----------------
function updateSummary(){
  let count = 0;
  document.querySelectorAll("#rosterTable td").forEach(td=>{ if(td.style.background) count++; });
  summary.innerHTML = `Mode: <b>${currentMode.toUpperCase()}</b> | Shift: <b>${currentShift.toUpperCase()}</b> | Total Selected: <b>${count}</b>`;
}

// ---------------- RENDER TABLE -----------------
function renderTable(){
  table.innerHTML="";
  const timeSlots = generateTimeSlots();
  const saved = JSON.parse(localStorage.getItem("gridData")||"{}");

  zones[currentMode].forEach(zone=>{
    // --- TIME HEADER ROW for this zone ---
    const headerRow = document.createElement("tr");
    const emptyCell = document.createElement("th"); emptyCell.innerText=""; headerRow.appendChild(emptyCell);
    timeSlots.forEach(slot=>{
      const th = document.createElement("th"); th.innerText=slot; headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // --- Zone Label Row ---
    const zoneRow = document.createElement("tr");
    const zoneCell = document.createElement("td");
    zoneCell.colSpan = timeSlots.length + 1;
    zoneCell.innerText = zone.name;
    zoneCell.classList.add("zone-row");
    table.appendChild(zoneRow);
    table.appendChild(zoneCell);

    // --- Counters for this zone ---
    zone.counters.forEach(counter=>{
      const row = document.createElement("tr");
      const label = document.createElement("td"); 
      label.innerText = counter; 
      label.style.fontWeight="bold"; 
      row.appendChild(label);

      timeSlots.forEach((_,i)=>{
        const cell = document.createElement("td");
        attachCellEvents(cell, counter, i);
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
      renderTable();
    });
  });
}

// ---------------- INIT -----------------
initSegmented();
renderTable();

