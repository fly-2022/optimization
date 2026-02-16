let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isPointerDown = false;
let pointerAction = null;

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
const modeHighlight = document.getElementById("modeHighlight");
const shiftHighlight = document.getElementById("shiftHighlight");

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
  const slots = [];
  let startHour = currentShift==="morning"?10:22;
  for(let i=0;i<48;i++){
    let totalMins = (startHour*60 + i*15) % 1440;
    let h = Math.floor(totalMins/60);
    let m = totalMins%60;
    slots.push(String(h).padStart(2,"0")+String(m).padStart(2,"0"));
  }
  return slots;
}

// ---------------- RENDER TABLE -----------------
function renderTable(){
  table.innerHTML="";
  const slots = generateTimeSlots();

  zones[currentMode].forEach((zone,index)=>{
    // Zone Name row
    const zr = document.createElement("tr");
    const zc = document.createElement("td");
    zc.colSpan = slots.length+1;
    zc.innerText = zone.name;
    zc.classList.add("zone-row");
    zr.appendChild(zc);
    table.appendChild(zr);

    // Time row for this zone
    const trTime = document.createElement("tr");
    const empty = document.createElement("td");
    trTime.appendChild(empty);
    slots.forEach(t=>{
      const th = document.createElement("td");
      th.innerText = t;
      th.classList.add("time-row");
      trTime.appendChild(th);
    });
    table.appendChild(trTime);

    // Counters rows
    zone.counters.forEach(counter=>{
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.innerText = counter;
      row.appendChild(label);
      slots.forEach(()=>{
        const cell = document.createElement("td");
        attachCellEvents(cell);
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

    // Subtotal row
    const subRow = document.createElement("tr");
    subRow.classList.add("subtotal");
    const subLabel = document.createElement("td");
    subLabel.innerText="Subtotal";
    subRow.appendChild(subLabel);
    for(let i=0;i<slots.length;i++){
      const td = document.createElement("td");
      subRow.appendChild(td);
    }
    table.appendChild(subRow);
  });

  // Grand total row
  const gRow = document.createElement("tr");
  gRow.classList.add("grandtotal");
  const gLabel = document.createElement("td");
  gLabel.innerText="Grand Total";
  gRow.appendChild(gLabel);
  for(let i=0;i<slots.length;i++){
    const td = document.createElement("td");
    gRow.appendChild(td);
  }
  table.appendChild(gRow);

  updateTotals();
}

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell){
  // Only allow selection on actual roster cells
  cell.addEventListener("pointerdown", e=>{
    if(cell.closest(".time-row") || cell.closest(".zone-row") || cell.closest(".subtotal") || cell.closest(".grandtotal")) return;
    isPointerDown=true;
    pointerAction = cell.classList.contains("active")?"remove":"apply";
    toggleCell(cell,pointerAction);
  });
  cell.addEventListener("pointermove", e=>{
    if(!isPointerDown) return;
    const el=document.elementFromPoint(e.clientX,e.clientY);
    if(el && el.tagName==="TD" && !el.closest(".time-row") && !el.closest(".zone-row") && !el.closest(".subtotal") && !el.closest(".grandtotal")){
      toggleCell(el,pointerAction);
    }
  });
  cell.addEventListener("pointerup", e=>{isPointerDown=false;});
  cell.addEventListener("click", e=>{
    if(cell.closest(".time-row") || cell.closest(".zone-row") || cell.closest(".subtotal") || cell.closest(".grandtotal")) return;
    toggleCell(cell,cell.classList.contains("active")?"remove":"apply");
  });
}

function toggleCell(cell,action){
  if(action==="apply"){ cell.classList.add("active"); cell.style.background=currentColor; }
  else{ cell.classList.remove("active"); cell.style.background=""; }
  updateTotals();
}

// ---------------- UPDATE TOTALS -----------------
function updateTotals(){
  const trs = Array.from(table.querySelectorAll("tr"));
  const zoneRows = table.querySelectorAll(".zone-row");

  // Each zone subtotal
  zoneRows.forEach((zr,i)=>{
    const start = trs.indexOf(zr)+2; // skip time row
    const nextZr = i<zoneRows.length-1 ? trs.indexOf(zoneRows[i+1])-1 : trs.length-2;
    for(let col=1;col<trs[start].children.length;col++){
      let sum=0;
      for(let r=start;r<=nextZr;r++){
        if(trs[r].children[col].classList.contains("active")) sum++;
      }
      trs[nextZr+1].children[col].innerText=sum;
    }
  });

  // Grand total
  const gRow = table.querySelector(".grandtotal");
  for(let col=1;col<gRow.children.length;col++){
    let sum=0;
    zoneRows.forEach((zr,i)=>{
      const start = trs.indexOf(zr)+2;
      const nextZr = i<zoneRows.length-1 ? trs.indexOf(zoneRows[i+1])-1 : trs.length-2;
      sum+=Number(trs[nextZr+1].children[col].innerText);
    });
    gRow.children[col].innerText=sum;
  }

  summary.innerHTML=`Mode: <b>${currentMode.toUpperCase()}</b> | Shift: <b>${currentShift.toUpperCase()}</b> | Total Selected: <b>${table.querySelectorAll("td.active").length}</b>`;
}

// ---------------- SEGMENTED BUTTONS -----------------
function initSegmented(){
  const modes = [document.getElementById("arrivalBtn"),document.getElementById("departureBtn")];
  const shifts = [document.getElementById("morningBtn"),document.getElementById("nightBtn")];

  modes.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      modes.forEach(b=>b.style.color="black");
      btn.style.color="white";
      currentMode = btn.id==="arrivalBtn"?"arrival":"departure";
      currentColor = currentMode==="arrival"?"#4CAF50":"#FF9800";
      modeHighlight.style.transform=`translateX(${btn.dataset.index*100}%)`;
      modeHighlight.style.background=currentColor;
      renderTable();
    });
  });

  shifts.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      shifts.forEach(b=>b.style.color="black");
      btn.style.color="white";
      currentShift = btn.id==="morningBtn"?"morning":"night";
      shiftHighlight.style.transform=`translateX(${btn.dataset.index*100}%)`;
      shiftHighlight.style.background=currentShift==="morning"?"#b0bec5":"#9e9e9e";
      renderTable();
    });
  });
}

// ---------------- CLEAR -----------------
document.getElementById("clearGridBtn").addEventListener("click", ()=>{
  table.querySelectorAll("td.active").forEach(td=>{
    td.classList.remove("active");
    td.style.background="";
  });
  updateTotals();
});

// ---------------- INIT -----------------
initSegmented();
renderTable();
