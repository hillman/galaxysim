"use strict";
/* ------------------------------------------------------------------ parameters */
const GROUPS = [
  {name:"Sky & camera", open:true, ctrls:[
    ["lat","Latitude",-60,70,0.5,v=>Math.abs(v).toFixed(1)+"° "+(v>=0?"N":"S")],
    ["doy","Date",1,365,1,v=>fmtDate(v)],
    ["year","Year",1990,2040,1,v=>String(v|0)],
    ["__aim"],
    ["coreAlt","Core altitude",-5,80,0.5,v=>v.toFixed(1)+"° above horizon"],
    ["coreOff","Core left / right",-60,60,0.5,v=>Math.abs(v)<0.25?"centred":Math.abs(v).toFixed(1)+"° "+(v<0?"left":"right")],
    ["time","Solar time",12,36,0.05,v=>fmtTime(v)],
    ["heading","Camera heading",0,360,0.5,v=>v.toFixed(0)+"° "+compass(v)],
    ["pitch","Camera tilt",-10,90,0.5,v=>(v>=0?"+":"")+v.toFixed(1)+"°"],
    ["__proj"],
    ["focal","Focal length (full frame)",8,85,0.5,v=>v.toFixed(v<10?1:0)+" mm · "+hFov(v).toFixed(0)+"° wide"],
    ["lp","Light pollution",0,6,0.01,v=>v<0.01?"none":"× "+v.toFixed(2)],
    ["skyGlow","Sky glow",0,3,0.01,v=>v<0.01?"none":"× "+v.toFixed(2)],
    ["glowWarm","Sky glow colour",0,1,0.01,v=>v<0.3?"blue":v>0.7?"warm":"neutral"],
  ]},
  {name:"Milky Way", open:true, ctrls:[
    ["__toggles"],
    ["real","Real-sky landmarks",0,1,0.01,v=>v<0.01?"fictional galaxy":v>0.99?"true to life":Math.round(v*100)+"%"],
    ["mw","Galaxy glow",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["mwc","Galaxy contrast",0.6,2.2,0.01,v=>"× "+v.toFixed(2)],
    ["bandWidth","Band breadth",0.6,2,0.01,v=>"× "+v.toFixed(2)],
    ["coreGlow","Core brightness",0,5,0.01,v=>v<0.01?"off":"+ "+v.toFixed(2)],
    ["bulgeN","Bulge height (north)",2.5,7,0.1,v=>v.toFixed(1)+"°"],
    ["fil","Core dust filaments",0,2,0.01,v=>"× "+v.toFixed(2)],
    ["dust","Dust lanes",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["dustScale","Dust cloud scale",0.5,2.5,0.01,v=>"× "+v.toFixed(2)],
    ["dustCol","Dust depth",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["lane","Lane contrast",0,4,0.01,v=>"× "+v.toFixed(2)],
    ["front","Glow in front of dust",0,0.6,0.01,v=>Math.round(v*100)+"%"],
    ["riftGlow","Glow inside the rift",0,5,0.01,v=>"× "+v.toFixed(2)],
    ["redden","Dust reddening",0,2,0.01,v=>"× "+v.toFixed(2)],
    ["tintVar","Cloud colour variation",0,1.5,0.01,v=>"× "+v.toFixed(2)],
    ["laneSharp","Lane sharpness",0,3,0.01,v=>v.toFixed(2)],
    ["mwGrain","Star-cloud grain",0,1,0.01,v=>Math.round(v*100)+"%"],
    ["neb","Emission nebulae",0,2,0.01,v=>"× "+v.toFixed(2)],
    ["knots","Bright nebula knots",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["starClouds","Star-cloud windows",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["maglim","Faintest star",4,12,0.1,v=>"mag "+v.toFixed(1)],
    ["starGain","Star brightness",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["psf","Star blur",0.4,6,0.05,v=>v.toFixed(2)+"′ σ"],
    ["starSat","Star colour",0,2,0.01,v=>"× "+v.toFixed(2)],
    ["seed","Sky seed",1,9999,1,v=>String(v|0)],
  ]},
  {name:"Atmosphere", open:false, ctrls:[
    ["haze","Extinction & haze",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["airglow","Airglow",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["agHue","Airglow line",0,1,0.01,v=>v<0.35?"557.7 nm green":v>0.65?"630 nm red":"mixed"],
    ["lpAz","Light dome bearing",0,360,1,v=>v.toFixed(0)+"° "+compass(v)],
    ["lpWarm","Light dome colour",0,1,0.01,v=>v<0.3?"LED white":v>0.7?"sodium":"mixed"],
  ]},
  {name:"Coastline", open:true, ctrls:[
    ["landSeed","Coastline seed",1,9999,1,v=>String(v|0)],
    ["headland","Headland",0,1.5,0.01,v=>v<0.01?"none":"× "+v.toFixed(2)],
    ["trees","Tree cover",0,1,0.01,v=>Math.round(v*100)+"%"],
    ["hills","Distant hills",0,1.5,0.01,v=>v<0.01?"none":"× "+v.toFixed(2)],
  ]},
  {name:"Sea & shore", open:false, ctrls:[
    ["sea","Sea state",0,2,0.01,v=>"× "+v.toFixed(2)],
    ["swellLen","Swell wavelength",4,60,0.5,v=>v.toFixed(1)+" m"],
    ["swellDir","Swell direction",-80,80,1,v=>(v>=0?"+":"")+v.toFixed(0)+"°"],
    ["silk","Long-exposure smoothing",0,1,0.01,v=>Math.round(v*100)+"%"],
    ["surf","Surf & foam",0,2,0.01,v=>"× "+v.toFixed(2)],
    ["beach","Shoreline distance",0,25,0.1,v=>v<0.05?"open water":v.toFixed(1)+" m"],
    ["pebble","Pebble size",1.5,20,0.1,v=>v.toFixed(1)+" cm"],
    ["rockSize","Sea stack half-width",0,90,0.5,v=>v<0.5?"none":v.toFixed(1)+" m"],
    ["rockOff","Sea stack position",-60,60,0.5,v=>(v>=0?"+":"")+v.toFixed(1)+"°"],
    ["rockDist","Sea stack distance",60,1200,5,v=>v.toFixed(0)+" m"],
  ]},
  {name:"Camera & development", open:false, ctrls:[
    ["ev","Exposure",-4,4,0.05,v=>(v>=0?"+":"")+v.toFixed(2)+" EV"],
    ["black","Sky black point",0,1.5,0.01,v=>"× "+v.toFixed(2)],
    ["wb","White balance",2500,7500,10,v=>v.toFixed(0)+" K"],
    ["tint","Tint",-1,1,0.01,v=>(v>=0?"+":"")+v.toFixed(2)+(v>0?" magenta":v<0?" green":"")],
    ["sat","Saturation",0,2,0.01,v=>"× "+v.toFixed(2)],
    ["contrast","Contrast",0.6,1.6,0.01,v=>"× "+v.toFixed(2)],
    ["grain","Sensor noise",0,3,0.01,v=>"× "+v.toFixed(2)],
    ["vig","Vignetting",0,1.5,0.01,v=>"× "+v.toFixed(2)],
  ]},
];
/* every preset starts from BASE; the page opens on DEFAULT_PRESET */
/* every preset starts from BASE; the page opens on DEFAULT_PRESET.
   BASE carries the calibrated galaxy, star and development settings (from the photo match), for a dark coastal site */
const BASE = {
  aimCore:true, coreSide:1, coreAlt:17, coreOff:-4,
  lat:38, doy:201, time:25.1, heading:222, pitch:10, focal:16, proj:"rect",
  year:2026, planets:true, realStars:true,
  real:1, mw:1.0, mwc:1.1, bandWidth:1.35, coreGlow:2.2, bulgeN:2.9, fil:1.1, mwGrain:0.16, starClouds:1, knots:1.2, neb:0.45,
  dust:2.4, dustCol:1.8, lane:2, laneSharp:1, front:0.2, riftGlow:3.5, redden:0.7, tintVar:0.5, dustScale:1,
  maglim:11, starGain:0.3, psf:0.75, starSat:0.75, seed:1737,
  haze:1, airglow:0.8, agHue:0.55, lp:0.3, lpAz:226, lpWarm:0.5, skyGlow:0.25, glowWarm:0.6,
  landSeed:42, headland:0.8, trees:0.6, hills:0.5,
  sea:0.6, swellLen:18, swellDir:10, silk:0.8, surf:1, beach:5.5, pebble:7, rockSize:34, rockOff:13, rockDist:300,
  ev:0.3, black:0.4, wb:3800, tint:0.12, sat:1.0, contrast:1.0, grain:0.5, vig:0.55,
  aspect:"5:4"
};
const PRESETS = {
  "Salt flat core": {aspect:"2:3", proj:"rect", contrast:1.08, grain:0.7, vig:0.65, focal:21.5, coreAlt:17.75, coreOff:6.35, coreSide:1, pitch:7.17, lat:36, doy:246, year:2019,
    headland:0, rockSize:0, beach:0, hills:0.3, sea:0.04, silk:1, surf:0,
    wb:3910, tint:0.26, sat:0.95, black:0.43, ev:0.25, airglow:1.0, agHue:0.66, lp:0.57, lpWarm:1, lpAz:180, haze:1.0, maglim:11.4, starGain:0.3, starSat:0.75, psf:0.75, mw:1.0, mwc:1.15, coreGlow:2.2, bulgeN:2.9, fil:1.2, mwGrain:0.16, neb:0.45, dust:2.6, dustCol:2, knots:1.2, starClouds:1, skyGlow:0.9, glowWarm:0.96, lane:2.2, laneSharp:1.2, front:0.22, bandWidth:1.35, riftGlow:4, redden:0.7, tintVar:0.5},
  "Reference coast": {},
  "Punchy edit": {aspect:"4:5", focal:16, coreAlt:20, coreOff:-3, coreSide:1, pitch:18, lat:34, doy:185,
    landSeed:7, headland:1, trees:0.5, hills:0, rockSize:14, rockOff:12, rockDist:260, beach:4, sea:0.3, silk:1, surf:0.6,
    lp:0, skyGlow:0.1, airglow:0.6, black:0.75, contrast:1.14, mwc:1.4, sat:1.28, lane:2.7, laneSharp:1.4, ev:0.55, vig:0.7,
    starSat:1, coreGlow:2.5, neb:0.6, knots:1.4, redden:0.85},
  "Big Sur cove": {aspect:"2:3", focal:20, coreAlt:14, coreOff:-2, coreSide:1, pitch:27, landSeed:7, headland:1.25, trees:0.85, hills:0,
    rockSize:12, rockOff:7, rockDist:240, beach:0, sea:0.22, silk:1, surf:0.35, wb:3900, tint:0.05, sat:1.05, black:0.7,
    airglow:1.1, agHue:0.45, haze:1.5, lp:0.45, lpWarm:0.8, maglim:9.4},
  "Wide 10 mm sweep": {aspect:"16:9", focal:10, coreAlt:12, coreOff:22, coreSide:1, pitch:22, landSeed:311, headland:0.7, trees:0.4,
    hills:0.6, rockSize:16, rockOff:-12, beach:6, sea:0.45, wb:3600, vig:0.3},
  "Galactic arch": {aspect:"2:1", proj:"pano", focal:8.5, doy:125, coreSide:-1, coreAlt:22, coreOff:62, pitch:32, landSeed:311, headland:0.7, trees:0.3,
    hills:0.6, rockSize:16, rockOff:-30, beach:0, sea:0.4, wb:3650, vig:0.3, black:0.5},
  "Southern core overhead": {aspect:"4:5", focal:14, lat:-31, doy:196, coreAlt:62, coreOff:0, coreSide:-1, pitch:44,
    wb:3800, agHue:0.6, airglow:0.8, lp:0.15, rockSize:0, beach:9, sea:0.35, surf:0.6, vig:0.45},
  "British summer night": {aspect:"4:5", focal:14, lat:52.5, doy:196, coreAlt:5, coreOff:0, coreSide:1, pitch:34, landSeed:88,
    headland:0.6, trees:0.9, hills:0.9, rockSize:0, beach:4, sea:0.3, wb:3650, tint:0.2, airglow:1.1, agHue:0.38, lp:0.8, lpWarm:0.9, haze:1.4, maglim:10, skyGlow:0.4},
  "Glassy calm": {sea:0.12, silk:1, surf:0.15, beach:0, rockSize:22, rockOff:-18, rockDist:500, swellLen:30},
  "Town on the cape": {lp:1.8, lpWarm:0.85, skyGlow:0.9, glowWarm:0.8, maglim:9.6, airglow:0.6, haze:1.6, black:0.5},
  "Winter band": {aimCore:false, doy:20, time:21.5, heading:115, pitch:18, mw:2, dust:1.8, agHue:0.55, wb:3800, rockOff:-20},
};
const DEFAULT_PRESET = "Salt flat core";
const DEFAULTS = Object.assign({}, BASE, PRESETS[DEFAULT_PRESET]);
const ASPECTS = ["5:4","3:2","16:9","2:1","4:5","2:3","1:1"];

let P = Object.assign({}, DEFAULTS), restored=false;
try { const s = JSON.parse(localStorage.getItem("mwseascape.v2")||"null"); if (s) { P = Object.assign({}, DEFAULTS, s); restored=true; } } catch(e) {}

function hFov(f){
  f=f||P.focal; const [aw,ah]=(P.aspect||"5:4").split(":").map(Number);
  const w=aw>=ah?36:36*aw/ah;
  if(P.proj==="pano") return Math.min(360,w/f/RAD);
  return 2*Math.atan(w/2/f)/RAD;
}
function fmtDate(d){ const m=[31,28,31,30,31,30,31,31,30,31,30,31], n=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; let i=0; d=Math.round(d); while(d>m[i]){d-=m[i];i++;} return d+" "+n[i]; }
function fmtTime(t){ t=((t%24)+24)%24; const h=Math.floor(t), mm=Math.round((t-h)*60); return String(mm===60?h+1:h).padStart(2,"0")+":"+String(mm===60?0:mm).padStart(2,"0"); }
function compass(a){ return ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round((((a%360)+360)%360)/22.5)%16]; }
