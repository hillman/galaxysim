"use strict";
/* ------------------------------------------------------------------ start-up */
async function startupStatus(message,percent){
  document.getElementById("startupStatus").textContent=message;
  document.getElementById("startupProgress").value=percent;
  await frame(); await frame();
}
async function start(){
  try{
    await startupStatus("Preparing the landscape controls…",5);
    buildUI(); applyAim(); syncUI(); updateReadout(); markPreset(DEFAULT_PRESET);
    if(!ok) return;
    await initGL();
    await startupStatus("Growing the tree and placing the stars…",80);
    buildTree(); buildStars(P.seed|0,!!P.realStars); updatePlanets();
    fit();
    await startupStatus("Rendering your first night sky…",92);
    ready=true;
    await renderPreview("full",++gen);
    await startupStatus("Ready",100);
    new ResizeObserver(()=>fit()).observe(wrap);
    window.addEventListener("resize",fit);
  }catch(error){ ok=false; fail("Startup failed: "+error.message); console.error(error); }
  finally{ document.getElementById("startup").hidden=true; }
}
start();
