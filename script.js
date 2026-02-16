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
    td.style.background="";
    td.classList.remove("active");
  });
  saveGrid();
  updateSubtotals();
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

// ---------------- RENDER TABLE -----------------
function renderTable(){
  table.innerHTML="";
  const timeSlots = generateTimeSlots();
  const saved = JSON.parse(localStorage.getItem("gridData")||"{}");

  zones[currentMode].forEach(zone=>{
    // Zone Label Row
    const zoneRow = document.createElement("tr");
    const zoneCell = document.createElement("td");
    zoneCell.colSpan = timeSlots.length + 1;
    zoneCell.innerText = zone.name;
    zoneCell.classList.add("zone-row");
    table.appendChild(zoneRow); table.appendChild(zoneCell);

    // Time header row
    const headerRow = document.createElement("tr");
    const emptyCell = document.createElement("th"); emptyCell.innerText=""; headerRow.appendChild(emptyCell);
    timeSlots.forEach(slot=>{
      const th = document.createElement("th"); th.innerText=slot; headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Counters
    zone.counters.forEach(counter=>{
      const row = document.createElement("tr");
      const label = document.createElement("td"); label.innerText = counter; label.style.fontWeight="bold"; row.appendChild(label);
      timeSlots.forEach((_,i)=>{
        const cell = document.createElement("td");
        attachCellEvents(cell);
        // restore from storage
        if(saved[currentMode] && saved[currentMode][counter] && saved[currentMode][counter][i]){
          cell.style.background = saved[currentMode][counter][i];
          cell.classList.add("active");
        }
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

    // Subtotal row
    const subtotalRow = document.createElement("tr");
    const subtotalLabel = document.createElement("td");
    subtotalLabel.innerText="Subtotal"; subtotalLabel.style.fontWeight="bold"; subtotalLabel.style.background="#ffffcc";
    subtotalRow.appendChild(subtotalLabel);
    timeSlots.forEach(()=>{ const cell = document.createElement("td"); cell.classList.add("subtotal-cell"); subtotalRow.appendChild(cell); });
    table.appendChild(subtotalRow);
  });

  updateSubtotals();
  updateSummary();
}

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell){
  cell.addEventListener("pointerdown", e=>{
    isMouseDown = true; lastCell=cell;
    toggleCell(cell);
  });
  cell.addEventListener("pointermove", e=>{
    if(isMouseDown){
      const el=document.elementFromPoint(e.clientX,e.clientY);
      if(el && el.tagName==="TD" && el!==lastCell) { toggleCell(el); lastCell=el; }
    }
  });
  cell.addEventListener("pointerup", e=>{ isMouseDown=false; lastCell=null; });

  // individual tap on mobile
  cell.addEventListener("click", e=>{ toggleCell(cell); });
}

function toggleCell(cell){
  if(cell.classList.contains("active")){ cell.style.background=""; cell.classList.remove("active"); }
  else{ cell.style.background=currentColor; cell.classList.add("active"); }
  saveGrid();
  updateSubtotals();
  updateSummary();
}

// ---------------- SUBTOTALS -----------------
function updateSubtotals(){
  const rows = table.querySelectorAll("tr");
  let i=0;
  while(i<rows.length){
    if(rows[i].querySelector(".zone-row")){
      const zoneName = rows[i].querySelector(".zone-row").innerText;
      const subtotalRow = rows[i+2+zones[currentMode].find(z=>z.name===zoneName).counters.length];
      const counters = [];
      for(let j=i+2;j<i+2+zones[currentMode].find(z=>z.name===zoneName).counters.length;j++){ counters.push(rows[j]); }
      if(!subtotalRow) { i+=1; continue; }
      const subtotalCells = subtotalRow.querySelectorAll("td.subtotal-cell");
      subtotalCells.forEach((cell,colIndex)=>{
        let sum=0;
        counters.forEach(r=>{
          const td = r.querySelectorAll("td")[colIndex+1]; if(td && td.classList.contains("active")) sum++;
        });
        cell.innerText=sum;
      });
      i += counters.length + 3;
    } else i++;
  }
}

// ---------------- SUMMARY -----------------
function updateSummary(){
  let count=0; document.querySelectorAll("#rosterTable td.active").forEach(td=>count++);
  summary.innerHTML = `Mode: <b>${currentMode}</b> | Shift: <b>${currentShift}</b> | Selected Cells: <b>${count}</b>`;
}

// ---------------- SAVE TO LOCALSTORAGE -----------------
function saveGrid(){
  const data = {};
  zones[currentMode].forEach(zone=>{
    zone.counters.forEach(counter=>{
      const row = [...table.querySelectorAll("tr")].find(r=>r.querySelector("td") && r.querySelector("td").innerText===counter);
      if(row){
        data[counter] = [];
        row.querySelectorAll("td").forEach((td,i)=>{
          if(i===0) return; // skip label
          data[counter][i-1] = td.classList.contains("active")? td.style.background : null;
        });
      }
    });
  });
  const all = JSON.parse(localStorage.getItem("gridData")||"{}");
  all[currentMode] = data;
  localStorage.setItem("gridData", JSON.stringify(all));
}

// ---------------- SEGMENTED BUTTONS -----------------
function initSegmented(){
  const modeBtns = [document.getElementById("arrivalBtn"),document.getElementById("departureBtn")];
  const shiftBtns = [document.getElementById("morningBtn"),document.getElementById("nightBtn")];

  modeBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      modeBtns.forEach(b=>b.style.color="black"); btn.style.color="white";
      currentMode = btn.id==="arrivalBtn"?"arrival":"departure";
      currentColor = currentMode==="arrival"?"#4CAF50":"#FF9800";
      modeHighlight.style.transform = `translateX(${btn.dataset.index*100}%)`;
      modeHighlight.style.background=currentColor;
      renderTable();
    });
  });

  shiftBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      shiftBtns.forEach(b=>b.style.color="black"); btn.style.color="white";
      currentShift = btn.id==="morningBtn"?"morning":"night";
      shiftHighlight.style.transform = `translateX(${btn.dataset.index*100}%)`;
      shiftHighlight.style.background=currentShift==="morning"?"#b0bec5":"#9e9e9e";
      renderTable();
    });
  });
}

// ---------------- INIT -----------------
initSegmented();
renderTable();
