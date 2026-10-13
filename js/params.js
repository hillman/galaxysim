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
    ["structure","Fine dust structure",0,2,0.01,v=>v<0.01?"original":"× "+v.toFixed(2)],
    ["edgeColour","Rift edge colour",0,2,0.01,v=>v<0.01?"original":"× "+v.toFixed(2)],
    ["cloudTone","Cloud palette",-1,1,0.01,v=>Math.abs(v)<0.01?"neutral":Math.round(Math.abs(v)*100)+"% "+(v<0?"cyan":"warm")],
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
  {name:"Landscape", open:true, ctrls:[
    ["__landscape"],
    ["landSeed","Landscape seed",1,9999,1,v=>String(v|0)],
    ["relief","Mountain height",0,2,0.01,v=>v<0.01?"flat land":"× "+v.toFixed(2)],
    ["treeHeight","Foreground tree height",0,24,0.1,v=>v<0.1?"none":v.toFixed(1)+" m"],
    ["treeDist","Foreground tree distance",15,150,1,v=>v.toFixed(0)+" m"],
    ["treeOff","Foreground tree position",-60,60,0.5,v=>v.toFixed(1)+"°"],
    ["__tree"],
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
  structure:0, edgeColour:0, cloudTone:0,
  real:1, mw:1.0, mwc:1.1, bandWidth:1.35, coreGlow:2.2, bulgeN:2.9, fil:1.1, mwGrain:0.16, starClouds:1, knots:1.2, neb:0.45,
  dust:2.4, dustCol:1.8, lane:2, laneSharp:1, front:0.2, riftGlow:3.5, redden:0.7, tintVar:0.5, dustScale:1,
  maglim:11, starGain:0.3, psf:0.75, starSat:0.75, seed:1737,
  haze:1, airglow:0.8, agHue:0.55, lp:0.3, lpAz:226, lpWarm:0.5, skyGlow:0.25, glowWarm:0.6,
  landSeed:42, headland:0.8, trees:0.6, hills:0.5,
  landscape:"coast", relief:0.5, treeHeight:12, treeDist:42, treeOff:10, treeType:"bare",
  sea:0.6, swellLen:18, swellDir:10, silk:0.8, surf:1, beach:5.5, pebble:7, rockSize:34, rockOff:13, rockDist:300,
  ev:0.3, black:0.4, wb:3800, tint:0.12, sat:1.0, contrast:1.0, grain:0.5, vig:0.55,
  aspect:"5:4"
};
const PRESETS = {
  "Processed · lone tree": {landscape:"land", aspect:"2:3", lat:37, doy:205, coreAlt:13, coreOff:-11, coreSide:1, pitch:35, focal:17,
    landSeed:67, relief:0.04, treeHeight:13, treeDist:29, treeOff:9, treeType:"bare", trees:0.15,
    structure:1.15, edgeColour:0.55, cloudTone:-0.7, mw:1, mwc:1.08, coreGlow:1.6, bandWidth:1.4, fil:0.7, dust:2.2, dustCol:1.3, lane:1.6, laneSharp:0.65,
    front:0.12, riftGlow:2.2, redden:0.4, tintVar:0.8, starClouds:0.9, neb:0.45, knots:1, mwGrain:0.08,
    wb:3900, tint:-0.12, sat:1.08, ev:-0.1, black:0.42, contrast:1.12, skyGlow:0.3, glowWarm:0.9, haze:0.85,
    lp:2.6, lpWarm:1, lpAz:255, airglow:0.5, agHue:0.35, maglim:11.3, starGain:0.1, starSat:0.5, psf:0.7, grain:0.2, vig:0.35},
  "Processed · mountain rift": {landscape:"land", aspect:"16:9", lat:37, doy:170, coreAlt:18, coreOff:20, coreSide:-1, pitch:27, focal:16,
    landSeed:118, relief:1.15, treeHeight:0, trees:0.6,
    structure:0.8, edgeColour:1.2, mw:1.4, mwc:1.08, bandWidth:1.5, coreGlow:2.5, bulgeN:4.4,
    dust:2.3, dustCol:1.7, lane:1.1, laneSharp:0.4, front:0.07, riftGlow:1.5, redden:0.65, tintVar:1.15,
    starClouds:1.35, fil:0.4, neb:0.65, knots:1.6, mwGrain:0.06,
    wb:5500, tint:0.15, sat:1.12, ev:0.6, black:0.2, contrast:1.05, haze:0.45, lp:0.15, skyGlow:0.85, glowWarm:0.4,
    airglow:0.5, agHue:0.4, maglim:11.8, starGain:0.09, starSat:0.6, psf:0.65, grain:0.18, vig:0.2},
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
Object.assign(PRESETS,{
  "Processed · blue coast": {...PRESETS["Processed · lone tree"], landscape:"coast", aspect:"3:2", lat:34, coreAlt:20, coreOff:-7, pitch:21, focal:14,
    landSeed:311, headland:0.65, trees:0.7, hills:0.3, rockSize:18, rockOff:25, beach:3, sea:0.25, silk:1, surf:0.3,
    lp:0.35, skyGlow:0.2, ev:0.1, cloudTone:-0.45},
  "Oak meadow": {...PRESETS["Processed · lone tree"], aspect:"3:2", lat:34, coreAlt:20, coreOff:13, pitch:26, focal:17,
    landSeed:203, treeType:"oak", treeDist:34, treeHeight:13, treeOff:-19, relief:0.12,
    cloudTone:-0.15, wb:4500, lp:0.7, ev:0.15, neb:0.55},
  "Pine ridge panorama": {...PRESETS["Processed · mountain rift"], aspect:"2:1", proj:"pano", focal:13, coreAlt:19, coreOff:24, pitch:23,
    landSeed:912, treeType:"pine", treeDist:32, treeHeight:15, treeOff:-31, relief:0.75, trees:0.9,
    edgeColour:1.1, wb:4700, cloudTone:-0.25, ev:0.2, neb:0.5, skyGlow:0.5},
});
const DEFAULT_PRESET = "Processed · lone tree";
const DEFAULTS = Object.assign({}, BASE, PRESETS[DEFAULT_PRESET]);
const ASPECTS = ["5:4","3:2","16:9","2:1","4:5","2:3","1:1"];

function randomScene(random=Math.random){
  const between=(minimum,maximum)=>minimum+(maximum-minimum)*random();
  const choose=values=>values[Math.floor(random()*values.length)];
  const radians=Math.PI/180;
  const scene=Object.assign({},BASE,{
    landscape:random()<0.7?"land":"coast", proj:random()<0.25?"pano":"rect",
    lat:between(-42,48), coreSide:random()<0.5?-1:1, aimCore:true,
    aspect:choose(["2:3","4:5","3:2","16:9","2:1"]), focal:between(12,24),
    seed:Math.floor(between(1,10000)), landSeed:Math.floor(between(1,10000)),
    structure:between(0.5,1), edgeColour:between(0.4,1.25), cloudTone:between(-0.75,0.45),
    mw:between(0.8,1.45), mwc:between(1.02,1.15), bandWidth:between(1.1,1.65), coreGlow:between(1.5,2.8), bulgeN:between(3,5),
    dust:between(2,2.6), dustCol:between(1.2,2), lane:between(0.8,1.4), laneSharp:between(0.2,0.6), fil:between(0.3,0.7),
    front:between(0.07,0.16), riftGlow:between(1,2.4), redden:between(0.35,0.65), tintVar:between(0.6,1.1),
    neb:between(0.35,0.8), knots:between(0.8,1.6), starClouds:between(0.8,1.35), mwGrain:between(0.04,0.1),
    starGain:between(0.07,0.13), starSat:between(0.4,0.8), maglim:between(10.5,11.8), psf:between(0.55,0.85),
    haze:between(0.45,1.15), airglow:between(0.3,0.8), agHue:between(0.25,0.7), lp:between(0.1,1.5), lpWarm:between(0.5,1),
    skyGlow:between(0.2,0.8), glowWarm:between(0.3,0.9), wb:between(4100,5800), tint:between(-0.1,0.18),
    sat:between(0.95,1.18), contrast:between(1,1.12), black:between(0.2,0.42), grain:between(0.1,0.3), vig:between(0.15,0.4),
    relief:random()<0.45?between(0.015,0.16):between(0.4,1.35), trees:between(0.1,0.9),
    treeType:choose(["bare","bare","oak","pine"]), treeHeight:random()<0.75?between(8,17):0,
    headland:between(0.1,0.5), hills:between(0,0.7), rockSize:random()<0.7?between(8,28):0,
    rockOff:between(-30,30), rockDist:between(250,650), beach:random()<0.5?0:between(2,7),
    sea:between(0.1,0.6), silk:between(0.8,1), surf:between(0.1,0.5), swellLen:between(12,35), swellDir:between(-40,40),
  });
  if(scene.proj==="pano"){ scene.aspect=choose(["16:9","2:1"]); scene.focal=between(9,15); }
  const [aspectWidth,aspectHeight]=scene.aspect.split(":").map(Number);
  const sensorHeight=36*Math.min(1,aspectHeight/aspectWidth),sensorWidth=36*Math.min(1,aspectWidth/aspectHeight);
  const verticalFov=2*Math.atan(sensorHeight/(2*scene.focal))/radians;
  const horizontalFov=(scene.proj==="pano"?sensorWidth/scene.focal:2*Math.atan(sensorWidth/(2*scene.focal)))/radians;
  scene.pitch=Math.atan(between(0.29,0.4)*sensorHeight/scene.focal)/radians;
  const maximumAltitude=Math.min(90-Math.abs(scene.lat+28.936)-2,scene.pitch+verticalFov*0.32,65);
  scene.coreAlt=between(7,maximumAltitude);
  scene.coreOff=between(-1,1)*Math.min(horizontalFov*0.3,55);
  const treeAngle=verticalFov*between(0.19,0.27)*radians;
  scene.treeDist=Math.max(20,Math.min(90,scene.treeHeight/Math.tan(treeAngle)));
  scene.treeOff=(scene.coreOff>0?-1:1)*horizontalFov*between(0.14,0.23);
  if(scene.landscape==="coast") scene.trees=0;
  else if(scene.treeHeight>0) scene.relief=Math.min(scene.relief,0.45);
  scene.ev=between(0,0.55)-scene.lp*0.12;
  const declination=-28.936*radians,latitude=scene.lat*radians;
  const hourAngle=Math.acos((Math.sin(scene.coreAlt*radians)-Math.sin(latitude)*Math.sin(declination))/(Math.cos(latitude)*Math.cos(declination)))/radians/15*scene.coreSide;
  const sidereal=266.405/15+hourAngle;
  const season=((sidereal-6.656-1.00274*between(22,27))%24+24)%24;
  scene.doy=Math.max(1,Math.min(365,Math.round(1+season/0.0657098)));
  const localSidereal=sidereal*15*radians;
  const localEast=-Math.sin(localSidereal)*Math.cos(declination)*Math.cos(266.405*radians)+Math.cos(localSidereal)*Math.cos(declination)*Math.sin(266.405*radians);
  const localNorth=-Math.sin(latitude)*Math.cos(declination)*Math.cos(266.405*radians-localSidereal)+Math.cos(latitude)*Math.sin(declination);
  scene.lpAz=(Math.atan2(localEast,localNorth)/radians+between(-55,55)+360)%360;
  for(const key in scene) if(typeof scene[key]==="number") scene[key]=Math.round(scene[key]*100)/100;
  return scene;
}

let P = Object.assign({}, DEFAULTS);

function hFov(f){
  f=f||P.focal; const [aw,ah]=(P.aspect||"5:4").split(":").map(Number);
  const w=aw>=ah?36:36*aw/ah;
  if(P.proj==="pano") return Math.min(360,w/f/RAD);
  return 2*Math.atan(w/2/f)/RAD;
}
function fmtDate(d){ const m=[31,28,31,30,31,30,31,31,30,31,30,31], n=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; let i=0; d=Math.round(d); while(d>m[i]){d-=m[i];i++;} return d+" "+n[i]; }
function fmtTime(t){ t=((t%24)+24)%24; const h=Math.floor(t), mm=Math.round((t-h)*60); return String(mm===60?h+1:h).padStart(2,"0")+":"+String(mm===60?0:mm).padStart(2,"0"); }
function compass(a){ return ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round((((a%360)+360)%360)/22.5)%16]; }
