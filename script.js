let currentMode = "arrival";
let currentShift = "morning";
let currentColor = null; // no manual color by default

let isMouseDown = false;
let isTouchDragging = false;
let dragAction = "apply";

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");

// ---------------- COLOR SELECTION ----------------
document.querySelectorAll(".color-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    currentColor = btn.dataset.color;
    document.querySelectorAll(".color-btn").forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

// Initially no manual color selected
currentColor = null;
document.querySelectorAll(".color-btn").forEach(b=>b.classList.remove("selected"));

// ---------------- CLEAR GRID ----------------
document.getElementById("clearGridBtn").addEventListener("click", ()=>{
  document.querySelectorAll("#rosterTable td").forEach(td=>{
    td.dataset.color = "";
    td.style.backgroundColor = "";
  });
  updateSummary();
});

// ---------------- ZONES ----------------
const zones = {
  arrival:[
    {name:"Zone 1", counters: range("AC",1,10)},
    {name:"Zone 2", counters: range("AC",11,20)},
    {name:"Zone 3", counters: range("AC",21,30)},
    {name:"Zone 4", counters: range("AC",31,40)},
    {name:"BIKES", counters:["AM41","AM43"]}
  ],
  departure:[
    {name:"Zone 1", counters: range("DC",1,8)},
    {name:"Zone 2", counters: range("DC",9,19)},
    {name:"Zone 3", counters: range("DC",20,29)},
    {name:"Zone 4", counters: range("DC",29,36)},
    {name:"BIKES", counters:["DM37A","DM37C"]}
  ]
};

function range(p,s,e){ let arr=[]; for(let i=s;i<=e;i++) arr.push(p+i); return arr; }

// ---------------- GENERATE TIME SLOTS ----------------
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

// ---------------- RENDER TABLE ----------------
function renderTable(){
  table.innerHTML="";
  const timeSlots = generateTimeSlots();

  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th"));
  timeSlots.forEach(t=>{
    const th = document.createElement("th");
    th.innerText = t;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  zones[currentMode].forEach(zone=>{
    const zoneRow = document.createElement("tr");
    const zoneCell = document.createElement("td");
    zoneCell.innerText = zone.name;
    zoneCell.colSpan = timeSlots.length+1;
    zoneCell.style.backgroundColor="#eeeeee";
    zoneCell.style.fontWeight="bold";
    zoneRow.appendChild(zoneCell);
    table.appendChild(zoneRow);

    zone.counters.forEach(counter=>{
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.innerText = counter;
      label.style.fontWeight = "bold";
      row.appendChild(label);

      timeSlots.forEach(()=>{
        const cell = document.createElement("td");
        cell.dataset.color="";

        // Desktop drag
        cell.addEventListener("mousedown", ()=>{
          isMouseDown = true;
          dragAction = (cell.dataset.color || "") === getCurrentModeColor() ? "remove" : "apply";
          toggleCell(cell,true);
        });
        cell.addEventListener("mousemove", ()=>{
          if(isMouseDown) toggleCell(cell,true);
        });
        cell.addEventListener("mouseup", ()=>{ isMouseDown=false; });
        cell.addEventListener("click", ()=>{ if(!isMouseDown) toggleCell(cell,false); });

        // Mobile drag
        cell.addEventListener("touchstart", e=>{
          e.preventDefault();
          isTouchDragging = true;
          dragAction = (cell.dataset.color || "") === getCurrentModeColor() ? "remove" : "apply";
          toggleCell(cell,true);
        });
        cell.addEventListener("touchmove", e=>{
          e.preventDefault();
          const touch = e.touches[0];
          const target = document.elementFromPoint(touch.clientX,touch.clientY);
          if(target && target.tagName==="TD") toggleCell(target,true);
        });
        cell.addEventListener("touchend", ()=>{ isTouchDragging=false; });

        row.appendChild(cell);
      });

      table.appendChild(row);
    });
  });

  updateSummary();
}

// ---------------- TOGGLE CELL ----------------
function toggleCell(cell,isDrag){
  const colorToApply = currentColor ? currentColor : getCurrentModeColor();
  if(isDrag){
    if(dragAction==="apply"){ cell.dataset.color=colorToApply; cell.style.backgroundColor=colorToApply; }
    else { cell.dataset.color=""; cell.style.backgroundColor=""; }
  } else {
    if(cell.dataset.color===colorToApply){ cell.dataset.color=""; cell.style.backgroundColor=""; }
    else { cell.dataset.color=colorToApply; cell.style.backgroundColor=colorToApply; }
  }
  updateSummary();
}

// ---------------- GET CURRENT MODE COLOR ----------------
function getCurrentModeColor(){
  if(currentMode==="arrival") return "#4CAF50";
  if(currentMode==="departure") return "#FFA500";
  return null;
}

// ---------------- SUMMARY ----------------
function updateSummary(){
  let count=0;
  document.querySelectorAll("#rosterTable td").forEach(td=>{ if(td.dataset.color) count++; });
  summary.innerHTML=`Current Mode: <b>${currentMode.toUpperCase()}</b> | Current Shift: <b>${currentShift.toUpperCase()}</b> | Total Cells Selected: <b>${count}</b>`;
}

// ---------------- BUTTONS ----------------
function updateButtons(){
  document.getElementById("arrivalBtn").className="mode-btn";
  document.getElementById("departureBtn").className="mode-btn";
  document.getElementById("morningBtn").className="shift-btn";
  document.getElementById("nightBtn").className="shift-btn";

  if(currentMode==="arrival") document.getElementById("arrivalBtn").classList.add("active-arrival");
  else document.getElementById("departureBtn").classList.add("active-departure");

  if(currentShift==="morning") document.getElementById("morningBtn").classList.add("active-morning");
  else document.getElementById("nightBtn").classList.add("active-night");
}

document.getElementById("arrivalBtn").onclick = ()=>{ currentMode="arrival"; updateButtons(); renderTable(); };
document.getElementById("departureBtn").onclick = ()=>{ currentMode="departure"; updateButtons(); renderTable(); };
document.getElementById("morningBtn").onclick = ()=>{ currentShift="morning"; updateButtons(); renderTable(); };
document.getElementById("nightBtn").onclick = ()=>{ currentShift="night"; updateButtons(); renderTable(); };

document.addEventListener("mouseup", ()=>{ isMouseDown=false; });

// ---------------- INITIAL LOAD ----------------
updateButtons();
renderTable();
