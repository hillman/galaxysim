"use strict";
/* ------------------------------------------------------------------ colour */
function bbSRGB(T){ const t=T/100; let r,g,b;
  if(t<=66){ r=255; g=99.4708025861*Math.log(t)-161.1195681661; b=t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307; }
  else { r=329.698727446*Math.pow(t-60,-0.1332047592); g=288.1221695283*Math.pow(t-60,-0.0755148492); b=255; }
  return [r,g,b].map(v=>Math.min(255,Math.max(0,v))/255);
}
const lin=c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
function bbLin(T){ return bbSRGB(T).map(lin); }
function wbGains(T,tint){ const ref=bbLin(6500), c=bbLin(T); const g=[ref[0]/c[0],ref[1]/c[1],ref[2]/c[2]]; const n=g[1]; return [g[0]/n,(g[1]/n)*(1-tint*0.18),g[2]/n]; }
