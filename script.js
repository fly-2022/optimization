// ---------------- ZONES -----------------
function range(prefix,start,end){return Array.from({length:end-start+1},(_,i)=>prefix+(start+i));}
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

// Global vars
let currentMode="arrival", currentShift="morning", currentColor="#4CAF50";
let dataStore={arrival:null,departure:null};
let dragging=false, startRow=null, startCol=null, dragDirection=null, paintedCells=new Set();
const container=document.getElementById("table-container");
const clearButton=document.getElementById("clear-button");
const summaryText=document.getElementById("summary-text");
let colHeaders=[];

// ---------------- Storage -----------------
function saveData(){localStorage.setItem("counterData",JSON.stringify(dataStore));localStorage.setItem("currentMode",currentMode);localStorage.setItem("currentShift",currentShift);}
function loadData(){
  const stored=JSON.parse(localStorage.getItem("counterData")||"{}");
  dataStore.arrival=stored.arrival||null; dataStore.departure=stored.departure||null;
  currentMode=localStorage.getItem("currentMode")||"arrival";
  currentShift=localStorage.getItem("currentShift")||"morning";
}

// ---------------- Table -----------------
function initializeData(modeName){
  const rows=zones[modeName].reduce((s,z)=>s+z.counters.length,0)+1; // +1 motor row
  return Array.from({length:rows},()=>Array(24).fill(0));
}

function getData(){if(!dataStore[currentMode]) dataStore[currentMode]=initializeData(currentMode); return dataStore[currentMode];}

// ---------------- Headers -----------------
function generateColHeaders(){
  const startHour=currentShift==="morning"?10:22;
  let headers=[],hour=startHour,minute=0;
  for(let i=0;i<24;i++){
    headers.push(`${hour.toString().padStart(2,"0")}${minute.toString().padStart(2,"0")}`);
    minute+=30;if(minute>=60){minute=0;hour=(hour+1)%24;}
  }
  colHeaders=headers;
}

// ---------------- Render -----------------
function renderTable(){
  const df=getData();
  let html="<table><tr><th></th>";
  colHeaders.forEach((h,i)=>{html+=`<th>${h}</th>`;});
  html+="</tr>";

  let rowIndex=0;
  for(const z of zones[currentMode]){
    for(const _ of z.counters){
      html+=`<tr><th>${rowIndex+1}</th>`;
      for(let c=0;c<24;c++){
        const val=df[rowIndex][c];
        const bg=val===1?"blue":"transparent";
        html+=`<td data-row="${rowIndex}" data-col="${c}" style="background-color:${bg}">${val}</td>`;
      }
      html+="</tr>"; rowIndex++;
    }
  }
  // Motor row
  html+=`<tr class="motor-row"><th>${rowIndex+1}</th>`;
  for(let c=0;c<24;c++){
    const val=df[rowIndex][c]; const bg=val===1?"blue":"transparent";
    html+=`<td data-row="${rowIndex}" data-col="${c}" style="background-color:${bg}">${val}</td>`;
  }
  html+="</tr></table>";
  container.innerHTML=html;

  // Attach events
  container.querySelectorAll("td[data-row]").forEach(td=>{
    td.addEventListener("mousedown",e=>{dragging=true; startRow=+td.dataset.row; startCol=+td.dataset.col; dragDirection=null; paintedCells.clear(); toggleCell(td); e.preventDefault();});
    td.addEventListener("mouseover",()=>{if(dragging) handleDrag(+td.dataset.row,+td.dataset.col);});
    td.addEventListener("touchstart",e=>{dragging=true; startRow=+td.dataset.row; startCol=+td.dataset.col; dragDirection=null; paintedCells.clear(); toggleCell(td); e.preventDefault();});
    td.addEventListener("touchmove",e=>{if(!dragging)return;e.preventDefault();const touch=e.touches[0];const el=document.elementFromPoint(touch.clientX,touch.clientY);if(el?.dataset?.row)handleDrag(+el.dataset.row,+el.dataset.col);});
    td.addEventListener("touchend",()=>{dragging=false; startRow=startCol=dragDirection=null; paintedCells.clear();});
    td.addEventListener("touchcancel",()=>{dragging=false; startRow=startCol=dragDirection=null; paintedCells.clear();});
  });
  document.addEventListener("mouseup",()=>{dragging=false; startRow=startCol=dragDirection=null; paintedCells.clear();});
}

function handleDrag(r,c){
  if(dragDirection===null){
    if(c!==startCol && r===startRow) dragDirection="horizontal";
    else if(r!==startRow && c===startCol) dragDirection="vertical";
    else return;
  }
  const tr=dragDirection==="horizontal"?startRow:r;
  const tc=dragDirection==="vertical"?startCol:c;
  const key=`${tr}-${tc}`;
  if(!paintedCells.has(key)){paintedCells.add(key); toggleCell(container.querySelector(`td[data-row="${tr}"][data-col="${tc}"]`));}
}

function toggleCell(td){
  const df=getData();
  const r=+td.dataset.row, c=+td.dataset.col;
  df[r][c]=df[r][c]?0:1;
  td.style.backgroundColor=df[r][c]? "blue":"transparent";
}

// ---------------- Controls -----------------
document.getElementById("clear-button").addEventListener("click",()=>{
  if(confirm(`Clear all data for ${currentMode}?`)){
    dataStore[currentMode]=initializeData(currentMode);
    renderTable();
    saveData();
  }
});

// ---------------- Segmented highlight -----------------
const segments=document.querySelectorAll(".segmented");
segments.forEach(seg=>{
  const btns=seg.querySelectorAll(".segment-btn");
  const hl=seg.querySelector(".segment-highlight");
  btns.forEach(btn=>{
    btn.addEventListener("click",()=>{
      btns.forEach(b=>{b.classList.remove("active"); b.style.color="black";});
      btn.classList.add("active");
      hl.style.transform=`translateX(${btn.dataset.index*100}%)`;

      if(btn.id==="arrivalBtn"){currentMode="arrival"; currentColor="#4CAF50"; hl.style.backgroundColor=currentColor; renderTable();}
      if(btn.id==="departureBtn"){currentMode="departure"; currentColor="#ff9800"; hl.style.backgroundColor=currentColor; renderTable();}
      if(btn.id==="morningBtn"){currentShift="morning"; hl.style.backgroundColor="#eee"; generateColHeaders(); renderTable();}
      if(btn.id==="nightBtn"){currentShift="night"; hl.style.backgroundColor="#eee"; generateColHeaders(); renderTable();}
    });
  });
});

// ---------------- Init -----------------
loadData(); generateColHeaders(); renderTable();
