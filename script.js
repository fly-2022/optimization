let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50"; // default color
let isMouseDown = false;
let dragMode = true;

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");

// Color palette selection
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentColor = btn.dataset.color;
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});
document.querySelector(".color-btn").classList.add("selected"); // mark first as selected

// Zones
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
    { name: "Zone 4", counters: range("DC", 29, 36) },
    { name: "BIKES", counters: ["DM37A", "DM37C"] }
  ]
};

function range(prefix, start, end) {
  let arr = [];
  for(let i=start;i<=end;i++) arr.push(prefix+i);
  return arr;
}

// Generate time slots
function generateTimeSlots(){
  let slots=[];
  let startHour=currentShift==="morning"?10:22;
  for(let i=0;i<48;i++){
    let hour=(startHour+Math.floor(i/4))%24;
    let minute=(i%4)*15;
    slots.push(String(hour).padStart(2,"0")+String(minute).padStart(2,"0"));
  }
  return slots;
}

// Render table
function renderTable(){
  table.innerHTML="";
  const timeSlots=generateTimeSlots();

  // header
  let headerRow=document.createElement("tr");
  headerRow.appendChild(document.createElement("th"));
  timeSlots.forEach(t=>{let th=document.createElement("th"); th.innerText=t; headerRow.appendChild(th);});
  table.appendChild(headerRow);

  zones[currentMode].forEach(zone=>{
    let zoneRow=document.createElement("tr");
    let zoneCell=document.createElement("td");
    zoneCell.innerText=zone.name;
    zoneCell.colSpan=timeSlots.length+1;
    zoneCell.style.backgroundColor="#eeeeee";
    zoneCell.style.fontWeight="bold";
    zoneRow.appendChild(zoneCell);
    table.appendChild(zoneRow);

    zone.counters.forEach(counter=>{
      let row=document.createElement("tr");
      let label=document.createElement("td");
      label.innerText=counter;
      label.style.fontWeight="bold";
      row.appendChild(label);

      timeSlots.forEach(()=>{
        let cell=document.createElement("td");

        cell.addEventListener("mousedown",e=>{
          isMouseDown=true;
          dragMode = (currentColor==="") ? cell.style.backgroundColor!=="" : cell.style.backgroundColor!==currentColor;
          cell.style.backgroundColor = currentColor;
          updateSummary();
          e.preventDefault();
        });

        cell.addEventListener("mouseover",()=>{
          if(isMouseDown) cell.style.backgroundColor=currentColor;
          updateSummary();
        });

        cell.addEventListener("mouseup",()=>{isMouseDown=false;});
        row.appendChild(cell);
      });
      table.appendChild(row);
    });
  });

  updateSummary();
}

// Summary
function updateSummary(){
  let count=0;
  document.querySelectorAll("#rosterTable td").forEach(td=>{if(td.style.backgroundColor) count++;});
  summary.innerHTML=`Current Mode: <b>${currentMode.toUpperCase()}</b> | Current Shift: <b>${currentShift.toUpperCase()}</b> | Total Cells Selected: <b>${count}</b>`;
}

// Buttons
function updateButtons(){
  document.getElementById("arrivalBtn").className="";
  document.getElementById("departureBtn").className="";
  document.getElementById("morningBtn").className="";
  document.getElementById("nightBtn").className="";
  if(currentMode==="arrival") document.getElementById("arrivalBtn").classList.add("active-arrival");
  else document.getElementById("departureBtn").classList.add("active-departure");
  if(currentShift==="morning") document.getElementById("morningBtn").classList.add("active-morning");
  else document.getElementById("nightBtn").classList.add("active-night");
  updateHighlight();
}

function updateHighlight(){
  const modeHighlight=document.querySelector(".mode-highlight");
  const shiftHighlight=document.querySelector(".shift-highlight");
  modeHighlight.style.left=currentMode==="arrival"?"0%":"50%";
  modeHighlight.style.backgroundColor=currentMode==="arrival"?"#4CAF50":"#ff9800";
  shiftHighlight.style.left=currentShift==="morning"?"0%":"50%";
  shiftHighlight.style.backgroundColor=currentShift==="morning"?"#b0bec5":"#ddd";
}

// Mode/shift buttons
document.getElementById("arrivalBtn").onclick=()=>{currentMode="arrival"; updateButtons(); renderTable();};
document.getElementById("departureBtn").onclick=()=>{currentMode="departure"; updateButtons(); renderTable();};
document.getElementById("morningBtn").onclick=()=>{currentShift="morning"; updateButtons(); renderTable();};
document.getElementById("nightBtn").onclick=()=>{currentShift="night"; updateButtons(); renderTable();};

document.addEventListener("mouseup",()=>{isMouseDown=false;});

// Initial render
updateButtons();
renderTable();
