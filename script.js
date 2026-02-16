let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isMouseDown = false;
let lastCell = null;

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
const manningSummaryEl = document.getElementById("manningSummary");

const modeHighlight = document.getElementById("modeHighlight");
const shiftHighlight = document.getElementById("shiftHighlight");

const arrivalBtn = document.getElementById("arrivalBtn");
const departureBtn = document.getElementById("departureBtn");
const morningBtn = document.getElementById("morningBtn");
const nightBtn = document.getElementById("nightBtn");

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
  updateManningSummary();
});

// ---------------- GENERATE TIME SLOTS -----------------
function generateTimeSlots(){
  let slots = [];
  let startHour, startMin, endHour, endMin;
  if(currentShift==="morning"){
    startHour=10; startMin=0; endHour=22; endMin=0;
  } else {
    startHour=22; startMin=0; endHour=10; endMin=0;
  }

  let h=startHour, m=startMin;
  while(true){
    slots.push(String(h).padStart(2,"0")+String(m).padStart(2,"0"));
    m+=15;
    if(m>=60){ h+=1; m=0; }
    if(h>=24) h-=24;
    if(h===endHour && m===endMin) break;
  }
  return slots;
}

// ---------------- RENDER TABLE -----------------
function renderTable(){
  table.innerHTML="";
  const timeSlots = generateTimeSlots();

  zones[currentMode].forEach(zone=>{
    // zone label
    const zoneRow = document.createElement("tr");
    const zoneCell = document.createElement("td");
    zoneCell.colSpan = timeSlots.length+2; // +1 for counter, +1 for subtotal
    zoneCell.innerText = zone.name;
    zoneCell.classList.add("zone-row");
    table.appendChild(zoneRow); table.appendChild(zoneCell);

    zone.counters.forEach(counter=>{
      const row = document.createElement("tr");
      const label = document.createElement("td"); label.innerText=counter; row.appendChild(label);
      timeSlots.forEach(()=>{ 
        const cell = document.createElement("td"); 
        attachCellEvents(cell);
        row.appendChild(cell);
      });
      const subtotalCell = document.createElement("td"); subtotalCell.innerText="0"; row.appendChild(subtotalCell);
      table.appendChild(row);
    });
  });

  // Add grand total row
  const grandTotalRow = document.createElement("tr");
  const gtLabel = document.createElement("td"); gtLabel.innerText="Grand Total"; grandTotalRow.appendChild(gtLabel);
  const totalCells = timeSlots.length;
  for(let i=0;i<totalCells;i++){
    const cell = document.createElement("td"); cell.innerText="0"; grandTotalRow.appendChild(cell);
  }
  const gtCell = document.createElement("td"); gtCell.innerText="0"; grandTotalRow.appendChild(gtCell);
  table.appendChild(grandTotalRow);

  updateSummary();
  updateManningSummary();
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
      if(el && el.tagName==="TD" && el!==lastCell && !el.classList.contains("zone-row")){
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
  updateSubtotal();
  updateGrandTotal();
  updateManningSummary();
}

// ---------------- UPDATE SUBTOTAL -----------------
function updateSubtotal(){
  const rows = table.querySelectorAll("tr");
  rows.forEach(row=>{
    if(row.querySelector("td") && !row.querySelector(".zone-row") && row.cells.length>2){
      let sum=0;
      for(let i=1;i<row.cells.length-1;i++){
        if(row.cells[i].classList.contains("active")) sum++;
      }
      row.cells[row.cells.length-1].innerText=sum;
    }
  });
}

// ---------------- UPDATE GRAND TOTAL -----------------
function updateGrandTotal(){
  const rows = table.querySelectorAll("tr");
  const timeSlots = generateTimeSlots();
  const gtRow = rows[rows.length-1];
  for(let i=1;i<=timeSlots.length;i++){
    let sum=0;
    for(let r=0;r<rows.length-1;r++){
      const row = rows[r];
      if(!row.querySelector(".zone-row") && row.cells[i].classList.contains("active")) sum++;
    }
    gtRow.cells[i].innerText=sum;
  }
  // update total cell
  let totalSum=0;
  for(let r=0;r<rows.length-1;r++){
    const row = rows[r];
    if(!row.querySelector(".zone-row")) totalSum+=parseInt(row.cells[row.cells.length-1].innerText);
  }
  gtRow.cells[gtRow.cells.length-1].innerText=totalSum;
}

// ---------------- UPDATE SUMMARY -----------------
function updateSummary(){
  let count=0;
  document.querySelectorAll("#rosterTable td").forEach(td=>{ if(td.classList.contains("active")) count++; });
  summary.innerHTML=`Current Mode: <b>${currentMode.toUpperCase()}</b> | Current Shift: <b>${currentShift.toUpperCase()}</b> | Total Cells Selected: <b>${count}</b>`;
}

// ---------------- UPDATE MANNING SUMMARY -----------------
function updateManningSummary(){
  const rows = table.querySelectorAll("tr");
  const timeSlots = generateTimeSlots();
  const manning = [];
  for(let i=0;i<timeSlots.length;i++){
    let totalCars=0, totalBikes=0;
    let zonesCount=[0,0,0,0];
    zones[currentMode].forEach((zone,zIdx)=>{
      zone.counters.forEach((counter, cIdx)=>{
        const row = Array.from(rows).find(r=>r.cells[0] && r.cells[0].innerText===counter);
        if(row && row.cells[i+1].classList.contains("active")){
          if(zone.name!=="BIKES") totalCars++;
          else totalBikes++;
          if(zone.name!=="BIKES") zonesCount[zIdx]+=1;
        }
      });
    });
    const timeStr = timeSlots[i];
    manning.push(`${timeStr}: ${totalCars.toString().padStart(2,"0")}/${totalBikes.toString().padStart(2,"0")}`);
    manning.push(zonesCount.join("/"));
  }
  manningSummaryEl.innerText = manning.join("\n");
}

// ---------------- COPY MANNING SUMMARY -----------------
document.getElementById("copyManningBtn").addEventListener("click", ()=>{
  navigator.clipboard.writeText(manningSummaryEl.innerText).then(()=>{
    alert("Manning summary copied!");
  });
});

// ---------------- SEGMENTED BUTTONS -----------------
function setMode(mode){
  currentMode = mode;
  if(mode==="arrival"){
    currentColor = "#4CAF50";
    modeHighlight.style.transform="translateX(0%)";
    modeHighlight.style.background="#4CAF50";
    arrivalBtn.classList.add("active"); departureBtn.classList.remove("active");
  } else {
    currentColor = "#FF9800";
    modeHighlight.style.transform="translateX(100%)";
    modeHighlight.style.background="#FF9800";
    departureBtn.classList.add("active"); arrivalBtn.classList.remove("active");
  }
  renderTable();
}

function setShift(shift){
  currentShift = shift;
  if(shift==="morning"){
    shiftHighlight.style.transform="translateX(0%)";
    shiftHighlight.style.background="#b0bec5";
    morningBtn.classList.add("active"); nightBtn.classList.remove("active");
  } else {
    shiftHighlight.style.transform="translateX(100%)";
    shiftHighlight.style.background="#9e9e9e";
    nightBtn.classList.add("active"); morningBtn.classList.remove("active");
  }
  renderTable();
}

arrivalBtn.onclick=()=>setMode("arrival");
departureBtn.onclick=()=>setMode("departure");
morningBtn.onclick=()=>setShift("morning");
nightBtn.onclick=()=>setShift("night");

/* ---------------- INIT ---------------- */
setMode("arrival");
setShift("morning");
