"use strict";
/* ------------------------------------------------------------------ UI */
const readout=document.getElementById("readout");
function planetReadout(){
  if(!P.planets) return "";
  const obs=observer(), up=planetsAt(julianDay()).map(p=>{ const l=apply(obs.localFromEq,p.eq); return {n:p.name,alt:Math.asin(l[1])/RAD,mag:p.mag}; }).filter(p=>p.alt>0);
  return up.length?`<span>${up.map(p=>`${p.n} <b>${p.alt.toFixed(0)}°</b> up, mag ${p.mag.toFixed(1)}`).join(" · ")}</span>`:"";
}
function updateReadout(){
  const gc=gcAltAz(observer()), lst=lstHours(P.doy,P.time);
  const lh=Math.floor(lst), lm=Math.round((lst-lh)*60);
  const gcTxt=gc.alt>0?`<b>${gc.alt.toFixed(1)}°</b> alt · <b>${gc.az.toFixed(0)}°</b> ${compass(gc.az)}`:`below horizon (${gc.alt.toFixed(0)}°)`;
  readout.innerHTML=`<span>Galactic centre ${gcTxt}</span><span>${fmtTime(P.time)} solar · LST <b>${lh}h${String(lm).padStart(2,"0")}m</b></span>`+
    (lastInfo?`<span>${lastInfo.W}×${lastInfo.H} · ${lastInfo.ms} ms</span>`:"")+
    (aimNote?`<span class="warn">${aimNote}</span>`:"")+planetReadout();
}
const inputs={};
function buildUI(){
  const host=document.getElementById("groups");
  GROUPS.forEach(gr=>{
    const det=document.createElement("details"); if(gr.open) det.open=true;
    det.innerHTML=`<summary>${gr.name}</summary>`;
    const box=document.createElement("div"); box.className="ctrls";
    gr.ctrls.forEach(([id,label,mn,mx,st,fmt])=>{
      if(id==="__landscape"||id==="__tree"){
        const field=id==="__landscape"?"landscape":"treeType";
        const choices=field==="landscape"?[["coast","Sea & coast"],["land","Land"]]:[["bare","Bare tree"],["oak","Leafy oak"],["pine","Pine"]];
        const row=document.createElement("div"); row.className="aimrow"; row.dataset.landOnly=String(field==="treeType");
        row.innerHTML=`<div class="seg" role="group" aria-label="${field==="landscape"?"Landscape mode":"Tree species"}">${choices.map(([value,title])=>`<button data-field="${field}" data-choice="${value}">${title}</button>`).join("")}</div>`;
        row.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{ P[field]=button.dataset.choice; markPreset(null); changed("full"); }));
        box.appendChild(row); return;
      }
      if(id==="__toggles"){
        const row=document.createElement("div"); row.className="aimrow";
        row.innerHTML=`<span class="aimlabel">Real stars</span><div class="seg" role="group" aria-label="Real stars"><button data-tg="realStars" data-v="1">On</button><button data-tg="realStars" data-v="0">Off</button></div>
          <span class="aimlabel">Planets</span><div class="seg" role="group" aria-label="Planets"><button data-tg="planets" data-v="1">On</button><button data-tg="planets" data-v="0">Off</button></div>
          <p class="hint">Real stars puts the actual sky to magnitude 6 and real star clusters in place. Planets are computed for the date, time and year.</p>`;
        row.querySelectorAll("[data-tg]").forEach(bt=>bt.addEventListener("click",()=>{ P[bt.dataset.tg]=bt.dataset.v==="1"; markPreset(null); changed("full"); }));
        box.appendChild(row); return;
      }
      if(id==="__proj"){
        const row=document.createElement("div"); row.className="aimrow";
        row.innerHTML=`<span class="aimlabel">Lens</span>
          <div class="seg" role="group" aria-label="Lens projection"><button data-proj="rect">Rectilinear</button><button data-proj="pano">Panorama</button></div>`;
        row.querySelectorAll("[data-proj]").forEach(bt=>bt.addEventListener("click",()=>{ P.proj=bt.dataset.proj; markPreset(null); changed("full"); }));
        box.appendChild(row); return;
      }
      if(id==="__aim"){
        const row=document.createElement("div"); row.className="aimrow";
        row.innerHTML=`<span class="aimlabel">Aim at the core</span>
          <div class="seg" role="group" aria-label="Aim at the galactic centre"><button data-aim="on">On</button><button data-aim="off">Off</button></div>
          <div class="seg" role="group" aria-label="Rising or setting"><button data-side="-1">Rising</button><button data-side="1">Setting</button></div>
          <p class="hint">Sets solar time and heading so the galactic centre sits where you put it.</p>`;
        row.querySelectorAll("[data-aim]").forEach(bt=>bt.addEventListener("click",()=>{ P.aimCore=bt.dataset.aim==="on"; markPreset(null); changed("full"); }));
        row.querySelectorAll("[data-side]").forEach(bt=>bt.addEventListener("click",()=>{ P.coreSide=+bt.dataset.side; P.aimCore=true; markPreset(null); changed("full"); }));
        box.appendChild(row); return;
      }
      const row=document.createElement("div"); row.className="ctl";
      row.innerHTML=`<label for="c_${id}">${label}</label><output id="o_${id}"></output><input type="range" id="c_${id}" min="${mn}" max="${mx}" step="${st}">`;
      box.appendChild(row);
      const inp=row.querySelector("input"), out=row.querySelector("output");
      inp.value=P[id]; out.textContent=fmt(+P[id]);
      inp.addEventListener("input",()=>{ P[id]=+inp.value; out.textContent=fmt(P[id]); if(id==="time"||id==="heading") P.aimCore=false; if(id==="coreAlt"||id==="coreOff") P.aimCore=true; markPreset(null); changed("quick"); });
      inp.addEventListener("change",()=>changed("full"));
      inputs[id]={inp,out,fmt};
      if(id==="seed"||id==="landSeed"){
        const b=document.createElement("button"); b.className="btn ghost"; b.textContent=id==="seed"?"New sky":"New landscape"; b.style.justifySelf="start"; b.style.gridColumn="1/-1"; b.style.padding="5px 10px";
        b.addEventListener("click",()=>{ P[id]=1+Math.floor(Math.random()*9999); markPreset(null); syncUI(); changed("full"); });
        row.appendChild(b);
      }
      if(id==="time"){ const h=document.createElement("p"); h.className="hint"; h.textContent="Local mean solar time, no daylight saving."; row.appendChild(h); }
    });
    det.appendChild(box); host.appendChild(det);
  });
  const pre=document.getElementById("presets");
  const randomButton=document.createElement("button"); randomButton.className="btn ghost"; randomButton.id="randomScene"; randomButton.textContent="Random scene";
  randomButton.title="A balanced composition with variations in sky, colour and landscape";
  randomButton.addEventListener("click",()=>{ P=randomScene(); syncUI(); fit(); markPreset(null); changed("full"); }); pre.appendChild(randomButton);
  Object.keys(PRESETS).forEach(n=>{ const b=document.createElement("button"); b.className="chip"; b.textContent=n; b.dataset.p=n;
    b.addEventListener("click",()=>{ P=Object.assign({},BASE,{aspect:P.aspect},PRESETS[n]); syncUI(); fit(); markPreset(n); changed("full"); }); pre.appendChild(b); });
  const asp=document.getElementById("aspect");
  ASPECTS.forEach(a=>{ const b=document.createElement("button"); b.textContent=a; b.dataset.a=a;
    b.addEventListener("click",()=>{ P.aspect=a; syncUI(); fit(); changed("full"); }); asp.appendChild(b); });
  document.getElementById("exportBtn").addEventListener("click",()=>renderExport(+document.getElementById("exportSize").value));
  document.getElementById("closeSheet").addEventListener("click",()=>{ document.getElementById("sheet").hidden=true; });
  const ta=document.getElementById("json"), note=document.getElementById("jsonNote");
  document.getElementById("copyJson").addEventListener("click",()=>{
    navigator.clipboard.writeText(ta.value).then(()=>note.textContent="Copied",()=>{ ta.select(); note.textContent="Selected, press copy"; });
  });
  document.getElementById("applyJson").addEventListener("click",()=>{
    try{ const s=JSON.parse(ta.value); P=Object.assign({},BASE,s); syncUI(); fit(); markPreset(null); changed("full"); note.textContent="Applied"; }
    catch(e){ note.textContent="That isn't valid JSON: "+e.message; }
  });
  document.getElementById("restoreJson").addEventListener("click",()=>{
    try{ const saved=localStorage.getItem("mwseascape.v2"); if(!saved){ note.textContent="No saved scene yet"; return; } ta.value=saved; document.getElementById("applyJson").click(); }
    catch(error){ note.textContent="Saved settings are unavailable"; }
  });
}
function markPreset(n){ document.querySelectorAll(".chip").forEach(c=>c.classList.toggle("on",c.dataset.p===n)); }
function syncUI(){
  for(const id in inputs){ const {inp,out,fmt}=inputs[id]; inp.value=P[id]; out.textContent=fmt(+P[id]); }
  document.querySelectorAll("#aspect button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.a===P.aspect)));
  document.querySelectorAll("[data-aim]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.aim==="on"?P.aimCore:!P.aimCore)));
  document.querySelectorAll("[data-proj]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.proj===P.proj)));
  document.querySelectorAll("[data-tg]").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.v==="1")===!!P[b.dataset.tg])));
  document.querySelectorAll("[data-side]").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.side===P.coreSide)));
  document.querySelectorAll("[data-choice]").forEach(button=>button.setAttribute("aria-pressed",String(P[button.dataset.field]===button.dataset.choice)));
  document.querySelectorAll('[data-land-only="true"]').forEach(row=>row.hidden=P.landscape!=="land");
  ["relief","treeHeight","treeDist","treeOff","lake","ripple","fog","fogLevel","fgBright"].forEach(id=>inputs[id].inp.parentElement.hidden=P.landscape!=="land");
  ["headland","hills","sea","swellLen","swellDir","silk","surf","beach","pebble","rockSize","rockOff","rockDist"].forEach(id=>inputs[id].inp.parentElement.hidden=P.landscape==="land");
  ["time","heading"].forEach(id=>inputs[id]&&inputs[id].inp.parentElement.classList.toggle("derived",!!P.aimCore));
  ["coreAlt","coreOff"].forEach(id=>inputs[id]&&inputs[id].inp.parentElement.classList.toggle("derived",!P.aimCore));
  document.getElementById("json").value=JSON.stringify(P,null,1);
}
function changed(mode){
  applyAim(); syncUI();
  try{ localStorage.setItem("mwseascape.v2",JSON.stringify(P)); }catch(e){}
  document.getElementById("json").value=JSON.stringify(P,null,1);
  updateReadout();
  schedule(mode);
}
const vp=document.getElementById("vp"), wrap=document.getElementById("vpwrap");
function fit(){
  const [aw,ah]=P.aspect.split(":").map(Number), ar=aw/ah;
  let w,h;
  if(window.innerWidth<=820){ w=wrap.clientWidth; h=w/ar; const mh=window.innerHeight*0.72; if(h>mh){h=mh;w=h*ar;} }
  else { const bw=wrap.clientWidth, bh=wrap.clientHeight; w=Math.min(bw,bh*ar); h=w/ar; }
  w=Math.floor(w); h=Math.floor(h);
  vp.style.width=w+"px"; vp.style.height=h+"px";
  const dpr=Math.min(window.devicePixelRatio||1,2);
  let cw=Math.round(w*dpr), ch=Math.round(h*dpr);
  const cap=2.6e6; if(cw*ch>cap){ const s=Math.sqrt(cap/(cw*ch)); cw=Math.round(cw*s); ch=Math.round(ch*s); }
  if(canvas.width!==cw||canvas.height!==ch){ canvas.width=cw; canvas.height=ch; schedule("full"); }
}
