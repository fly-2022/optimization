let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";

let isDragging = false;
let dragMode = "apply";
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

function range(p, s, e){ let arr=[]; for(let i=s;i<=e;i++) arr.push(p+i); return arr; }
function generateTimeSlots(){
  const slots=[]; const startHour = currentShift === "morning"?10:22;
  for(let i=0;i<48;i++){
    const h=(startHour+Math.floor(i/4))%24;
    const m=(i%4)*15;
    slots.push(String(h).padStart(2,"0")+String(m).padStart(2,"0"));
  }
  return slots;
}

// ---------------- RENDER TABLE -----------------
function renderTable(){
  const container = document.getElementById("tableContainer");
  container.innerHTML="";
  const slots=generateTimeSlots();

  zones[currentMode].forEach(zone=>{
    const zoneTitle=document.createElement("h3");
    zoneTitle.innerText=zone.name;
    container.appendChild(zoneTitle);

    const table=document.createElement("table");

    // Time header row
    const headerRow=document.createElement("tr");
    const emptyTh=document.createElement("th"); emptyTh.innerText=""; headerRow.appendChild(emptyTh);
    slots.forEach(t=>{ const th=document.createElement("th"); th.innerText=t; headerRow.appendChild(th); });
    table.appendChild(headerRow);

    // Counters
    zone.counters.forEach(counter=>{
      const row=document.createElement("tr");
      const tdLabel=document.createElement("td"); tdLabel.innerText=counter; row.appendChild(tdLabel);
      slots.forEach(()=>{
        const td=document.createElement("td");
        attachCellEvents(td);
        row.appendChild(td);
      });
      table.appendChild(row);
    });

    container.appendChild(table);
  });
}

// ---------------- CELL EVENTS -----------------
function attachCellEvents(cell){
  cell.addEventListener("pointerdown",e=>{
    isDragging=true; lastCell=cell;
    dragMode=cell.style.backgroundColor? "remove":"apply";
    applyCell(cell);
  });
  cell.addEventListener("click",e=>{
    if(!isDragging){ dragMode=cell.style.backgroundColor?"remove":"apply"; applyCell(cell); }
  });
}
function applyCell(cell){
  const color=currentColor || getModeColor();
  if(dragMode==="apply"){ cell.style.background=color; cell.classList.add("active-cell"); }
  else{ cell.style.background=""; cell.classList.remove("active-cell"); }
}

// ---------------- DRAG -----------------
window.addEventListener("pointermove",e=>{
  if(!isDragging) return;
  const el=document.elementFromPoint(e.clientX,e.clientY);
  if(el && el.tagName==="TD" && el!==lastCell){ applyCell(el); lastCell=el; }
});
window.addEventListener("pointerup",()=>{ isDragging=false; lastCell=null; });

// ---------------- MODE COLOR -----------------
function getModeColor(){ return currentMode==="arrival"? "#4CAF50": "#FF9800"; }

// ---------------- SEGMENTED -----------------
document.querySelectorAll(".segmented").forEach(segment=>{
  const buttons=segment.querySelectorAll(".segment-btn");
  const highlight=segment.querySelector(".segment-highlight");

  buttons.forEach(btn=>{
    btn.addEventListener("click",()=>{
      buttons.forEach(b=>{ b.classList.remove("active"); b.style.color="black"; });
      btn.classList.add("active"); btn.style.color="white";

      // Slide highlight
      highlight.style.transform=`translateX(${btn.dataset.index*100}%)`;

      // Mode
      if(btn.id==="arrivalBtn"){ highlight.style.background="#4CAF50"; currentMode="arrival"; currentColor="#4CAF50"; }
      if(btn.id==="departureBtn"){ highlight.style.background="#FF9800"; currentMode="departure"; currentColor="#FF9800"; }

      // Shift
      if(btn.id==="morningBtn"){ highlight.style.background="#9e9e9e"; currentShift="morning"; }
      if(btn.id==="nightBtn"){ highlight.style.background="#9e9e9e"; currentShift="night"; }

      renderTable();
    });
  });
});

// ---------------- COLOR PICKER -----------------
document.querySelectorAll(".color-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".color-btn").forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected"); currentColor=btn.dataset.color;
  });
});

// ---------------- CLEAR -----------------
document.getElementById("clearGrid").addEventListener("click",()=>{
  document.querySelectorAll("td").forEach(cell=>{ cell.style.background=""; cell.classList.remove("active-cell"); });
});

// ---------------- INIT -----------------
renderTable();
