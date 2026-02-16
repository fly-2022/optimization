let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";

let isPointerDown = false;
let lastCell = null;

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
const modeHighlight = document.getElementById("modeHighlight");
const shiftHighlight = document.getElementById("shiftHighlight");

// ---------------- ZONES -----------------
function range(prefix,start,end){ let arr=[]; for(let i=start;i<=end;i++) arr.push(prefix+i); return arr; }
const zones = {
  arrival: [
    { name: "Zone 1", counters: range("AC",1,10) },
    { name: "Zone 2", counters: range("AC",11,20) },
    { name: "Zone 3", counters: range("AC",21,30) },
    { name: "Zone 4", counters: range("AC",31,40) },
    { name: "BIKES", counters: ["AM41","AM43"] }
  ],
  departure: [
    { name: "Zone 1", counters: range("DC",1,8) },
    { name: "Zone 2", counters: range("DC",9,19) },
    { name: "Zone 3", counters: range("DC",20,29) },
    { name: "Zone 4", counters: range("DC",30,36) },
    { name: "BIKES", counters: ["DM37A","DM37C"] }
  ]
};

// ---------------- TIME SLOTS -----------------
function generateTimeSlots(){
  let slots=[];
  let startHour=currentShift==="morning"?10:22;
  for(let i=0;i<24;i++){
    let hour=(startHour+i)%24;
    slots.push(String(hour).padStart(2,"0")+":00");
  }
  return slots;
}

// ---------------- RENDER TABLE -----------------
function renderTable(){
  table.innerHTML="";
  const timeSlots = generateTimeSlots();

  zones[currentMode].forEach(zone=>{
    // Zone label row
    const zoneRow=document.createElement("tr");
    const zoneCell=document.createElement("td");
    zoneCell.colSpan=timeSlots.length+1;
    zoneCell.className="zone-label";
    zoneCell.innerText=zone.name;
    zoneRow.appendChild(zoneCell);
    table.appendChild(zoneRow);

    // Time row for this zone
    const timeRow = document.createElement("tr");
    const emptyCell = document.createElement("td"); emptyCell.innerText=""; timeRow.appendChild(emptyCell);
    timeSlots.forEach(ts=>{
      const td=document.createElement("td"); td.innerText=ts; td.className="time-row";
      timeRow.appendChild(td);
    });
    table.appendChild(timeRow);

    // Counters
    zone.counters.forEach(counter=>{
      const row=document.createElement("tr");
      const label = document.createElement("td"); label.innerText=counter; row.appendChild(label);
      timeSlots.forEach(()=>{ 
        const cell=document.createElement("td"); attachCellEvents(cell); row.appendChild(cell);
      });
      table.appendChild(row);
    });

    // Subtotal row
    const subRow=document.createElement("tr");
    const subLabel=document.createElement("td"); subLabel.innerText="Subtotal"; subRow.appendChild(subLabel);
    for(let i=0;i<timeSlots.length;i++){
      const subCell=document.createElement("td"); subCell.className="subtotal-cell"; subCell.innerText="0"; subRow.appendChild(subCell);
    }
    table.appendChild(subRow);
  });

  updateSubtotals();
}

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell){
  cell.addEventListener("pointerdown", e=>{
    isPointerDown=true;
    lastCell=cell;
    let action = cell.classList.contains("active")?"remove":"apply";
    toggleCell(cell, action);
  });
  cell.addEventListener("pointermove", e=>{
    if(isPointerDown){
      const el=document.elementFromPoint(e.clientX,e.clientY);
      if(el && el.tagName==="TD" && el!==lastCell && !el.classList.contains("subtotal-cell") && !el.classList.contains("time-row")){
        toggleCell(el, lastCell.classList.contains("active")?"remove":"apply");
        lastCell=el;
      }
    }
  });
  cell.addEventListener("pointerup", e=>{ isPointerDown=false; lastCell=null; });
  cell.addEventListener("click", e=>{
    if(!cell.classList.contains("subtotal-cell") && !cell.classList.contains("time-row")){
      toggleCell(cell, cell.classList.contains("active")?"remove":"apply");
    }
  });
}

function toggleCell(cell, action){
  if(action==="apply"){ cell.style.background=currentColor; cell.classList.add("active"); }
  else{ cell.style.background=""; cell.classList.remove("active"); }
  updateSubtotals();
}

// ---------------- UPDATE SUBTOTALS -----------------
function updateSubtotals(){
  let rows = [...table.querySelectorAll("tr")];
  let i=0;
  zones[currentMode].forEach(zone=>{
    i++; // zone label
    i++; // time row
    const countersRows = zone.counters.map((_,idx)=>rows[i+idx]);
    const subtotalRow = rows[i+zone.counters.length];
    if(!subtotalRow) return;
    const subtotalCells = subtotalRow.querySelectorAll("td.subtotal-cell");
    subtotalCells.forEach((cell, colIndex)=>{
      let sum=0;
      countersRows.forEach(r=>{
        const td = r.querySelectorAll("td")[colIndex+1]; // skip label
        if(td && td.classList.contains("active")) sum++;
      });
      cell.innerText=sum;
    });
    i=i+zone.counters.length+1;
  });
  updateSummary();
}

// ---------------- UPDATE SUMMARY -----------------
function updateSummary(){
  const selected = table.querySelectorAll("td.active").length;
  summary.innerHTML=`Mode: <b>${currentMode.toUpperCase()}</b> | Shift: <b>${currentShift.toUpperCase()}</b> | Total Selected: <b>${selected}</b>`;
}

// ---------------- SEGMENTED BUTTONS -----------------
function initSegmented(){
  const modeBtns = [document.getElementById("arrivalBtn"),document.getElementById("departureBtn")];
  const shiftBtns = [document.getElementById("morningBtn"),document.getElementById("nightBtn")];

  modeBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      modeBtns.forEach(b=>b.style.color="black");
      btn.style.color="white";
      currentMode=btn.id==="arrivalBtn"?"arrival":"departure";
      currentColor=currentMode==="arrival"?"#4CAF50":"#FF9800";
      modeHighlight.style.transform=`translateX(${btn.dataset.index*100}%)`;
      modeHighlight.style.background=currentColor;
      renderTable();
    });
  });

  shiftBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      shiftBtns.forEach(b=>b.style.color="black");
      btn.style.color="white";
      currentShift=btn.id==="morningBtn"?"morning":"night";
      shiftHighlight.style.transform=`translateX(${btn.dataset.index*100}%)`;
      shiftHighlight.style.background=currentShift==="morning"?"#b0bec5":"#9e9e9e";
      renderTable();
    });
  });
}

// ---------------- INIT -----------------
initSegmented();
renderTable();
