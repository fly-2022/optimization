let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";

let isPointerDown = false;
let lastCellAction = null;

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

// ---------------- TIME GENERATION -----------------
function generateTimeSlots(){
  const slots = [];
  let startHour = currentShift==="morning"?10:22;
  for(let i=0;i<48;i++){
    let totalMinutes = startHour*60 + i*15;
    let hour = Math.floor((totalMinutes % 1440)/60);
    let minute = totalMinutes % 60;
    slots.push(String(hour).padStart(2,"0")+String(minute).padStart(2,"0"));
  }
  return slots;
}

// ---------------- TABLE RENDER -----------------
function renderTable(){
  table.innerHTML="";
  const timeSlots = generateTimeSlots();

  zones[currentMode].forEach(zone=>{
    // Zone label row
    const zoneRow = document.createElement("tr");
    const zoneCell = document.createElement("td");
    zoneCell.colSpan = timeSlots.length+1;
    zoneCell.innerText = zone.name;
    zoneCell.classList.add("zone-row");
    zoneRow.appendChild(zoneCell);
    table.appendChild(zoneRow);

    // Counters
    zone.counters.forEach(counter=>{
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.innerText = counter;
      row.appendChild(label);

      timeSlots.forEach(()=>{
        const cell = document.createElement("td");
        attachCellEvents(cell);
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

    // Subtotal row
    const subtotalRow = document.createElement("tr");
    subtotalRow.classList.add("subtotal");
    const subtotalLabel = document.createElement("td");
    subtotalLabel.innerText = "Subtotal";
    subtotalRow.appendChild(subtotalLabel);
    for(let i=0;i<timeSlots.length;i++){
      const subCell = document.createElement("td");
      subtotalRow.appendChild(subCell);
    }
    table.appendChild(subtotalRow);
  });

  // Grand total row
  const grandRow = document.createElement("tr");
  grandRow.classList.add("grandtotal");
  const grandLabel = document.createElement("td");
  grandLabel.innerText = "Grand Total";
  grandRow.appendChild(grandLabel);
  for(let i=0;i<timeSlots.length;i++){
    const gCell = document.createElement("td");
    grandRow.appendChild(gCell);
  }
  table.appendChild(grandRow);

  updateTotals();
}

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell){
  cell.addEventListener("pointerdown", e=>{
    isPointerDown=true;
    lastCellAction = cell.style.background? "remove":"apply";
    toggleCell(cell,lastCellAction);
  });

  cell.addEventListener("pointermove", e=>{
    if(isPointerDown){
      const el = document.elementFromPoint(e.clientX,e.clientY);
      if(el && el.tagName==="TD" && el!==cell && !el.classList.contains("zone-row") && !el.classList.contains("subtotal") && !el.classList.contains("grandtotal")){
        toggleCell(el,lastCellAction);
      }
    }
  });

  cell.addEventListener("pointerup", e=>{
    isPointerDown=false;
  });

  cell.addEventListener("click", e=>{
    toggleCell(cell,cell.style.background?"remove":"apply");
  });
}

function toggleCell(cell, action){
  if(action==="apply"){ cell.style.background=currentColor; cell.classList.add("active"); }
  else{ cell.style.background=""; cell.classList.remove("active"); }
  updateTotals();
}

// ---------------- UPDATE TOTALS -----------------
function updateTotals(){
  const rows = table.querySelectorAll("tr");
  const zoneRows = table.querySelectorAll(".zone-row");

  zoneRows.forEach((zr,index)=>{
    const start = Array.from(rows).indexOf(zr)+1;
    const end = (index<zoneRows.length-1)? Array.from(rows).indexOf(zoneRows[index+1])-2 : rows.length-2;
    for(let col=1; col<rows[start].children.length; col++){
      let sum=0;
      for(let r=start; r<=end; r++){
        const td = rows[r].children[col];
        if(td && td.classList.contains("active")) sum++;
      }
      rows[end+1].children[col].innerText = sum;
    }
  });

  // Grand total
  const grandRow = table.querySelector(".grandtotal");
  for(let col=1; col<grandRow.children.length; col++){
    let sum=0;
    zoneRows.forEach((zr,index)=>{
      const subRow = rows[Array.from(rows).indexOf(zr)+zones[currentMode][index].counters.length+1];
      sum += Number(subRow.children[col].innerText);
    });
    grandRow.children[col].innerText=sum;
  }

  // Summary display
  let selected = table.querySelectorAll("td.active").length;
  summary.innerHTML = `Mode: <b>${currentMode.toUpperCase()}</b> | Shift: <b>${currentShift.toUpperCase()}</b> | Total Selected: <b>${selected}</b>`;
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
      modeHighlight.style.transform=`translateX(${btn.dataset.index*100}%)`;
      modeHighlight.style.background=currentColor;
      renderTable();
    });
  });

  shiftBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      shiftBtns.forEach(b=>b.style.color="black");
      btn.style.color="white";
      currentShift = btn.id==="morningBtn"?"morning":"night";
      shiftHighlight.style.transform=`translateX(${btn.dataset.index*100}%)`;
      shiftHighlight.style.background=currentShift==="morning"?"#b0bec5":"#9e9e9e";
      renderTable();
    });
  });
}

// ---------------- CLEAR GRID -----------------
document.getElementById("clearGridBtn").addEventListener("click", ()=>{
  table.querySelectorAll("td.active").forEach(td=>{
    td.style.background=""; td.classList.remove("active");
  });
  updateTotals();
});

// ---------------- INIT -----------------
initSegmented();
renderTable();
