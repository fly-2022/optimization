let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";

let isDragging = false;
let dragAction = "apply";

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");

// -------------------
// Color selection
// -------------------
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentColor = btn.dataset.color;
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});
document.querySelector(".color-btn").classList.add("selected");

// -------------------
// Clear grid
// -------------------
document.getElementById("clearGridBtn").addEventListener("click", () => {
  document.querySelectorAll("#rosterTable td").forEach(td => {
    td.dataset.color = "";
    td.style.backgroundColor = "";
  });
  updateSummary();
});

// -------------------
// Zones
// -------------------
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
    { name: "Zone 4", counters: range("DC",29,36) },
    { name: "BIKES", counters: ["DM37A","DM37C"] }
  ]
};

function range(prefix,start,end){ let arr=[]; for(let i=start;i<=end;i++) arr.push(prefix+i); return arr; }

// -------------------
// Generate times
// -------------------
function generateTimeSlots(){
  const slots=[];
  const startHour = currentShift==="morning"?10:22;
  for(let i=0;i<48;i++){
    const hour=(startHour+Math.floor(i/4))%24;
    const minute=(i%4)*15;
    slots.push(String(hour).padStart(2,"0")+String(minute).padStart(2,"0"));
  }
  return slots;
}

// -------------------
// Render table
// -------------------
function renderTable(){
  table.innerHTML="";
  const timeSlots = generateTimeSlots();

  const headerRow=document.createElement("tr");
  headerRow.appendChild(document.createElement("th"));
  timeSlots.forEach(t=>{
    const th=document.createElement("th");
    th.innerText=t;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  zones[currentMode].forEach(zone=>{
    const zoneRow=document.createElement("tr");
    const zoneCell=document.createElement("td");
    zoneCell.innerText=zone.name;
    zoneCell.colSpan=timeSlots.length+1;
    zoneCell.style.backgroundColor="#eeeeee";
    zoneCell.style.fontWeight="bold";
    zoneRow.appendChild(zoneCell);
    table.appendChild(zoneRow);

    zone.counters.forEach(counter=>{
      const row=document.createElement("tr");
      const label=document.createElement("td");
      label.innerText=counter;
      label.style.fontWeight="bold";
      row.appendChild(label);

      timeSlots.forEach(()=>{
        const cell=document.createElement("td");
        cell.dataset.color="";

        // ---------- Desktop Drag ----------
        cell.addEventListener("mousedown",(e)=>{
          isDragging=true;
          dragAction=cell.dataset.color===currentColor?"remove":"apply";
          toggleCell(cell,false);
          e.preventDefault();
        });
        cell.addEventListener("mouseover",()=>{ if(isDragging) toggleCell(cell,true); });
        cell.addEventListener("mouseup",()=>{ isDragging=false; });

        // ---------- Mobile Drag ----------
        cell.addEventListener("touchstart",(e)=>{
          dragAction=cell.dataset.color===currentColor?"remove":"apply";
          toggleCell(cell,false);
          e.preventDefault();
        });
        cell.addEventListener("touchmove",(e)=>{
          const touch = e.touches[0];
          const target = document.elementFromPoint(touch.clientX,touch.clientY);
          if(target && target.tagName==="TD") toggleCell(target,true);
        });
        cell.addEventListener("touchend",()=>{ isDragging=false; });

        // ---------- Click / tap ----------
        cell.addEventListener("click",()=>{ toggleCell(cell,false); });

        row.appendChild(cell);
      });

      table.appendChild(row);
    });
  });

  updateSummary();
}

// -------------------
// Toggle cell
// -------------------
function toggleCell(cell,isDrag){
  if(isDrag){
    if(dragAction==="apply"){ cell.dataset.color=currentColor; cell.style.backgroundColor=currentColor; }
    else { cell.dataset.color=""; cell.style.backgroundColor=""; }
  } else {
    if(cell.dataset.color===currentColor){ cell.dataset.color=""; cell.style.backgroundColor=""; }
    else { cell.dataset.color=currentColor; cell.style.backgroundColor=currentColor; }
  }
  updateSummary();
}

// -------------------
// Update summary
// -------------------
function updateSummary(){
  let count=0;
  document.querySelectorAll("#rosterTable td").forEach(td=>{ if(td.dataset.color) count++; });
  summary.innerHTML=`Current Mode: <b>${currentMode.toUpperCase()}</b> | Current Shift: <b>${currentShift.toUpperCase()}</b> | Total Cells Selected: <b>${count}</b>`;
}

// -------------------
// Mode/Shift buttons
// -------------------
function updateButtons(){
  document.getElementById("arrivalBtn").className="";
  document.getElementById("departureBtn").className="";
  document.getElementById("morningBtn").className="";
  document.getElementById("nightBtn").className="";

  if(currentMode==="arrival") document.getElementById("arrivalBtn").classList.add("active-arrival");
  else document.getElementById("departureBtn").classList.add("active-departure");

  if(currentShift==="morning") document.getElementById("morningBtn").classList.add("active-morning");
  else document.getElementById("nightBtn").classList.add("active-night");
}

// Button listeners
document.getElementById("arrivalBtn").onclick=()=>{ currentMode="arrival"; updateButtons(); renderTable(); };
document.getElementById("departureBtn").onclick=()=>{ currentMode="departure"; updateButtons(); renderTable(); };
document.getElementById("morningBtn").onclick=()=>{ currentShift="morning"; updateButtons(); renderTable(); };
document.getElementById("nightBtn").onclick=()=>{ currentShift="night"; updateButtons(); renderTable(); };

// release drag on mouseup anywhere
document.addEventListener("mouseup",()=>{ isDragging=false; });

// Initial render
updateButtons();
renderTable();
