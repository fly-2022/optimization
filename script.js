let currentMode = "arrival";
let currentShift = "morning";
let currentColor = "#4CAF50";
let isPointerDown = false;
let lastAction = null;

const table = document.getElementById("rosterTable");
const summary = document.getElementById("summary");
const modeHighlight = document.getElementById("modeHighlight");
const shiftHighlight = document.getElementById("shiftHighlight");

// ---------------- ZONES -----------------
function range(prefix,start,end){let arr=[];for(let i=start;i<=end;i++)arr.push(prefix+i);return arr;}
const zones = {
  arrival: [
    { name:"Zone 1", counters: range("AC",1,10) },
    { name:"Zone 2", counters: range("AC",11,20) },
    { name:"Zone 3", counters: range("AC",21,30) },
    { name:"Zone 4", counters: range("AC",31,40) },
    { name:"BIKES", counters:["AM41","AM43"] }
  ],
  departure:[
    { name:"Zone 1", counters: range("DC",1,8) },
    { name:"Zone 2", counters: range("DC",9,19) },
    { name:"Zone 3", counters: range("DC",20,29) },
    { name:"Zone 4", counters: range("DC",30,36) },
    { name:"BIKES", counters:["DM37A","DM37C"] }
  ]
};

// ---------------- TIME SLOTS -----------------
function generateTimeSlots(){
  let slots = [];
  let startHour = currentShift==="morning"?10:22;
  for(let i=0;i<48;i++){
    let hour = (startHour+Math.floor(i/4))%24;
    let min = (i%4)*15;
    slots.push(String(hour).padStart(2,"0")+String(min).padStart(2,"0"));
  }
  return slots;
}

// ---------------- RENDER TABLE -----------------
function renderTable(){
  table.innerHTML="";
  const slots = generateTimeSlots();

  // Grand total row at end
  let grandTotalRow = {cells:Array(slots.length).fill(0)};

  zones[currentMode].forEach(zone=>{
    // Zone header
    let trHeader = document.createElement("tr");
    let tdHeader = document.createElement("td");
    tdHeader.colSpan = slots.length+1;
    tdHeader.innerText = zone.name;
    tdHeader.className="zone-row";
    trHeader.appendChild(tdHeader);
    table.appendChild(trHeader);

    // Time row under zone
    let trTime = document.createElement("tr");
    let tdLabel = document.createElement("td");
    tdLabel.innerText = "Time";
    trTime.appendChild(tdLabel);
    slots.forEach(s=>{
      let td = document.createElement("td");
      td.innerText = s;
      trTime.appendChild(td);
    });
    table.appendChild(trTime);

    // Counter rows
    zone.counters.forEach(counter=>{
      let tr = document.createElement("tr");
      let tdCounter = document.createElement("td");
      tdCounter.innerText=counter;
      tr.appendChild(tdCounter);

      slots.forEach((_,i)=>{
        let td = document.createElement("td");
        td.dataset.zone=zone.name;
        td.dataset.index=i;
        td.addEventListener("pointerdown",startSelection);
        td.addEventListener("pointerenter",moveSelection);
        td.addEventListener("pointerup",endSelection);
        td.addEventListener("click",()=>toggleCell(td));
        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    // Subtotal row
    let trSub = document.createElement("tr");
    let tdSub = document.createElement("td");
    tdSub.innerText="Subtotal";
    trSub.appendChild(tdSub);
    slots.forEach((_,i)=>{
      let td = document.createElement("td");
      td.dataset.zone=zone.name;
      td.dataset.index=i;
      td.className="subtotal";
      td.innerText="0";
      trSub.appendChild(td);
    });
    table.appendChild(trSub);
  });

  // Grand total row
  let trGrand = document.createElement("tr");
  let tdLabel = document.createElement("td");
  tdLabel.innerText="Grand Total";
  trGrand.appendChild(tdLabel);
  slots.forEach((_,i)=>{
    let td = document.createElement("td");
    td.className="grandtotal";
    td.innerText="0";
    trGrand.appendChild(td);
  });
  table.appendChild(trGrand);

  updateSummary();
}

// ---------------- CELL TOGGLE -----------------
function toggleCell(td){
  if(td.classList.contains("active")){
    td.classList.remove("active");
    td.style.background="";
  } else{
    td.classList.add("active");
    td.style.background=currentColor;
  }
  updateSummary();
}

// ---------------- SELECTION -----------------
function startSelection(e){
  isPointerDown=true;
  lastAction = !this.classList.contains("active");
  toggleByAction(this,lastAction);
  e.preventDefault();
}
function moveSelection(e){
  if(isPointerDown){
    toggleByAction(this,lastAction);
  }
}
function endSelection(){ isPointerDown=false; lastAction=null; }

// Apply action consistently
function toggleByAction(td,apply){
  if(apply){
    td.classList.add("active");
    td.style.background=currentColor;
  } else{
    td.classList.remove("active");
    td.style.background="";
  }
  updateSummary();
}

// ---------------- UPDATE SUMMARY -----------------
function updateSummary(){
  // Reset all subtotal & grandtotal
  document.querySelectorAll(".subtotal").forEach(td=>td.innerText=0);
  document.querySelectorAll(".grandtotal").forEach(td=>td.innerText=0);

  let zonesMap={};
  document.querySelectorAll("#rosterTable td.active").forEach(td=>{
    let z=td.dataset.zone;
    let idx=td.dataset.index;
    if(!zonesMap[z]) zonesMap[z]=[];
    zonesMap[z].push(idx);
  });

  // Update subtotals
  Object.keys(zonesMap).forEach(z=>{
    zonesMap[z].forEach(idx=>{
      let td = document.querySelector(`.subtotal[data-zone="${z}"][data-index="${idx}"]`);
      if(td) td.innerText=parseInt(td.innerText)+1;
    });
  });

  // Update grand total
  const slotCount = document.querySelectorAll(".grandtotal").length;
  for(let i=0;i<slotCount;i++){
    let sum=0;
    document.querySelectorAll(`.subtotal[data-index="${i}"]`).forEach(td=>sum+=parseInt(td.innerText));
    document.querySelectorAll(".grandtotal")[i].innerText=sum;
  }

  // Update summary text
  let totalCount=document.querySelectorAll("#rosterTable td.active").length;
  summary.innerHTML=`Mode: <b>${currentMode}</b> | Shift: <b>${currentShift}</b> | Selected Cells: <b>${totalCount}</b>`;
}

// ---------------- CLEAR -----------------
document.getElementById("clearGridBtn").addEventListener("click",()=>{
  document.querySelectorAll("#rosterTable td.active").forEach(td=>{
    td.classList.remove("active");
    td.style.background="";
  });
  updateSummary();
});

// ---------------- SEGMENTED BUTTONS -----------------
function initSegmented(){
  const modeBtns = [document.getElementById("arrivalBtn"),document.getElementById("departureBtn")];
  const shiftBtns = [document.getElementById("morningBtn"),document.getElementById("nightBtn")];

  modeBtns.forEach(btn=>{
    btn.addEventListener("click",()=>{
      modeBtns.forEach(b=>b.style.color="black");
      btn.style.color="white";
      currentMode = btn.id==="arrivalBtn"?"arrival":"departure";
      currentColor = currentMode==="arrival"?"#4CAF50":"#FF9800";
      modeHighlight.style.transform = `translateX(${btn.dataset.index*100}%)`;
      modeHighlight.style.background=currentColor;
      renderTable();
    });
  });

  shiftBtns.forEach(btn=>{
    btn.addEventListener("click",()=>{
      shiftBtns.forEach(b=>b.style.color="black");
      btn.style.color="white";
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

// Prevent scroll on table drag for mobile
document.querySelector(".table-container").addEventListener("touchmove", e=>{ if(isPointerDown) e.preventDefault(); },{passive:false});
