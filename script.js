let currentMode = localStorage.getItem("currentMode") || "arrival";
let currentShift = localStorage.getItem("currentShift") || "morning";
let isDragging = false;
let lastCell = null;

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

// ---------------- STORAGE -----------------
const savedDataKey = "rosterData";
let rosterData = JSON.parse(localStorage.getItem(savedDataKey)) || {};

// ---------------- ELEMENTS -----------------
const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
const modeHighlight = document.getElementById("modeHighlight");
const shiftHighlight = document.getElementById("shiftHighlight");

// ---------------- TIME SLOTS -----------------
function generateTimeSlots(){
  let slots = [];
  let startHour = currentShift==="morning"?10:22;
  let hour=startHour, minute=0;
  for(let i=0;i<48;i++){
    let hh = hour.toString().padStart(2,"0");
    let mm = minute.toString().padStart(2,"0");
    slots.push(hh+mm);
    minute+=15;
    if(minute>=60){ minute=0; hour=(hour+1)%24; }
  }
  return slots;
}

// ---------------- RENDER -----------------
function renderTable(){
  table.innerHTML="";
  const slots = generateTimeSlots();
  let totalCols = slots.length;

  zones[currentMode].forEach(zone=>{
    // Zone Name Row
    const zrow = document.createElement("tr");
    const zcell = document.createElement("td");
    zcell.colSpan = totalCols+1;
    zcell.innerText = zone.name;
    zcell.className="zone-row";
    zrow.appendChild(zcell);
    table.appendChild(zrow);

    // Time header row for this zone
    const timeRow = document.createElement("tr");
    const blankCell = document.createElement("td");
    blankCell.innerText = "";
    timeRow.appendChild(blankCell);
    slots.forEach(t=>{
      const tc = document.createElement("td");
      tc.innerText = t;
      timeRow.appendChild(tc);
    });
    table.appendChild(timeRow);

    // Counter rows
    zone.counters.forEach(counter=>{
      const row = document.createElement("tr");
      const label = document.createElement("td"); label.innerText=counter; row.appendChild(label);
      slots.forEach((_,i)=>{
        const cell = document.createElement("td");
        attachCellEvents(cell, counter, i);
        // restore saved
        const key = `${currentMode}_${currentShift}_${counter}_${i}`;
        if(rosterData[key]) { cell.classList.add("active"); cell.style.background=currentMode==="arrival"?"#4CAF50":"#FF9800"; }
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

    // Subtotal Row
    const subtotalRow = document.createElement("tr");
    subtotalRow.className="subtotal-row";
    const subtotalLabel = document.createElement("td"); subtotalLabel.innerText="Subtotal"; subtotalRow.appendChild(subtotalLabel);
    for(let i=0;i<totalCols;i++){
      const subtotalCell = document.createElement("td");
      subtotalCell.dataset.zone = zone.name;
      subtotalCell.dataset.index = i;
      subtotalRow.appendChild(subtotalCell);
    }
    table.appendChild(subtotalRow);
  });

  // Grandtotal Row
  const grandRow = document.createElement("tr");
  grandRow.className="grandtotal-row";
  const grandLabel = document.createElement("td"); grandLabel.innerText="Grand Total"; grandRow.appendChild(grandLabel);
  for(let i=0;i<totalCols;i++){
    const gcell = document.createElement("td"); gcell.dataset.index=i; grandRow.appendChild(gcell);
  }
  table.appendChild(grandRow);

  updateSummary();
}

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell, counter, colIndex){
  const key = `${currentMode}_${currentShift}_${counter}_${colIndex}`;

  cell.addEventListener("pointerdown", e=>{
    isDragging=true;
    lastCell=cell;
    toggleCell(cell);
  });
  cell.addEventListener("pointermove", e=>{
    if(!isDragging) return;
    const el = document.elementFromPoint(e.clientX,e.clientY);
    if(el && el.tagName==="TD" && el!==lastCell){
      toggleCell(el);
      lastCell=el;
    }
  });
  cell.addEventListener("pointerup", e=>{
    isDragging=false;
    lastCell=null;
  });
  cell.addEventListener("click", e=>{
    toggleCell(cell);
  });

  function toggleCell(td){
    if(td.classList.contains("active")){
      td.classList.remove("active");
      td.style.background="";
      rosterData[key]=false;
    }else{
      td.classList.add("active");
      td.style.background=currentMode==="arrival"?"#4CAF50":"#FF9800";
      rosterData[key]=true;
    }
    localStorage.setItem(savedDataKey,JSON.stringify(rosterData));
    updateSummary();
  }
}

// ---------------- SUMMARY -----------------
function updateSummary(){
  const subtotalRows = document.querySelectorAll(".subtotal-row");
  subtotalRows.forEach(sr=>{
    const zone = sr.querySelector("td").innerText;
    sr.querySelectorAll("td").forEach((cell,i)=>{
      if(i===0) return;
      let sum=0;
      zones[currentMode].find(z=>z.name===zone).counters.forEach(counter=>{
        const key = `${currentMode}_${currentShift}_${counter}_${i-1}`;
        if(rosterData[key]) sum++;
      });
      cell.innerText=sum;
    });
  });

  // grand total
  const gRow = document.querySelector(".grandtotal-row");
  for(let i=1;i<gRow.children.length;i++){
    let gsum=0;
    zones[currentMode].forEach(zone=>{
      zone.counters.forEach(counter=>{
        const key = `${currentMode}_${currentShift}_${counter}_${i-1}`;
        if(rosterData[key]) gsum++;
      });
    });
    gRow.children[i].innerText=gsum;
  }

  summary.innerHTML=`Mode: <b>${currentMode}</b> | Shift: <b>${currentShift}</b>`;
}

// ---------------- SEGMENTED BUTTONS -----------------
function initSegmented(){
  const arrivalBtn=document.getElementById("arrivalBtn");
  const departureBtn=document.getElementById("departureBtn");
  const morningBtn=document.getElementById("morningBtn");
  const nightBtn=document.getElementById("nightBtn");

  [arrivalBtn,departureBtn].forEach(btn=>{
    btn.addEventListener("click", ()=>{
      currentMode = btn.id==="arrivalBtn"?"arrival":"departure";
      modeHighlight.style.transform=`translateX(${btn.dataset.index*100}%)`;
      modeHighlight.style.background=currentMode==="arrival"?"#4CAF50":"#FF9800";
      localStorage.setItem("currentMode", currentMode);
      renderTable();
    });
  });

  [morningBtn,nightBtn].forEach(btn=>{
    btn.addEventListener("click", ()=>{
      currentShift = btn.id==="morningBtn"?"morning":"night";
      shiftHighlight.style.transform=`translateX(${btn.dataset.index*100}%)`;
      shiftHighlight.style.background=currentShift==="morning"?"#b0bec5":"#9e9e9e";
      localStorage.setItem("currentShift", currentShift);
      renderTable();
    });
  });
}

// ---------------- CLEAR -----------------
document.getElementById("clearGridBtn").addEventListener("click", ()=>{
  if(confirm("Clear all selections for current mode & shift?")){
    rosterData = {};
    localStorage.setItem(savedDataKey,JSON.stringify(rosterData));
    renderTable();
  }
});

// ---------------- INIT -----------------
initSegmented();
renderTable();
