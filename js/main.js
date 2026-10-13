"use strict";
/* ------------------------------------------------------------------ start-up */
buildUI(); applyAim(); syncUI(); updateReadout(); if(!restored) markPreset(DEFAULT_PRESET);
if(ok){
  try{ initGL(); }catch(e){ ok=false; fail("Shader setup failed: "+e.message); console.error(e); }
}
new ResizeObserver(()=>fit()).observe(wrap);
window.addEventListener("resize",fit);
fit(); schedule("full");
