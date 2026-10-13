"use strict";
/* ------------------------------------------------------------------ rendering */
function uniforms(W,H,steps){
  const obs=observer();
  const az=P.heading*RAD, pt=P.pitch*RAD;
  const F=[Math.sin(az)*Math.cos(pt),Math.sin(pt),Math.cos(az)*Math.cos(pt)];
  const R=[Math.cos(az),0,-Math.sin(az)];
  const Up=[F[1]*R[2]-F[2]*R[1],F[2]*R[0]-F[0]*R[2],F[0]*R[1]-F[1]*R[0]];
  const mmPerPx=36/Math.max(W,H);
  const seed=P.seed|0, sr=mulberry(seed*31+7);
  const slope=0.07, camH=1.55+(P.landscape!=="land"&&P.beach>0.05?slope*P.beach:0);
  const rd=P.rockDist;
  const wb=wbGains(P.wb,P.tint);
  return {
    uGalFromLocal:["m3",colMajor(obs.galFromLocal)], uLocalFromEq:["m3",colMajor(obs.localFromEq)],
    uF:["3",F],uR:["3",R],uU:["3",Up],uFull:["2",[W,H]],uProj:["i",P.proj==="pano"?2:0],uFocal:["f",P.focal],uMmPerPx:["f",mmPerPx],uHead:["f",az],uPitchR:["f",pt],
    uSeedOff:["3",[sr()*90+5,sr()*90+5,sr()*90+5]], uSteps:["i",steps],
    uStructure:["f",P.structure],uEdgeColour:["f",P.edgeColour],uCloudTone:["f",P.cloudTone],
    uLandscape:["i",P.landscape==="land"?1:0],uRelief:["f",P.relief],
    uTree:["3",[(P.heading+P.treeOff)*RAD,P.treeDist,P.treeHeight]],
    uMW:["f",P.mw],uReal:["f",P.real],uMWC:["f",P.mwc],uIsoK:["f",0.034*P.bandWidth],uIsoG:["f",0.85/Math.sqrt(P.bandWidth)],uCatK:["f",0.75*P.dust],uDustS:["f",0.55*P.dustCol],uCoreK:["f",3.5*P.coreGlow],uBulgeDust:["f",Math.max(P.dust,0.05)*0.5],uDustThr:["f",P.coreGlow>0.5?0.4:0.6],uCoreMix:["f",Math.min(0.95,P.coreGlow*0.24)],uBulgeN:["f",P.bulgeN],uFil:["f",P.fil],uKnot:["f",P.knots*P.neb*2.5],uSCK:["f",P.starClouds*0.22],uLane:["f",P.lane],uStarDust:["f",0.45*P.dust/2.2],uFront:["f",P.front],uRiftGlow:["f",P.riftGlow*0.012],uRed:["f",P.redden],uTintVar:["f",P.tintVar],uLaneSharp:["f",P.laneSharp],uGrainMW:["f",P.mwGrain],uDust:["f",P.dust],uDustScale:["f",P.dustScale],uNeb:["f",P.neb],
    uHaze:["f",P.haze],uAirglow:["f",P.airglow],uAgHue:["f",P.agHue],uLP:["f",P.lp],uSkyGlow:["f",P.skyGlow*0.25],uGlowWarm:["f",P.glowWarm],uLpAz:["f",(((P.lpAz+180)%360)-180)*RAD],uLpWarm:["f",P.lpWarm],
    uRock:["3",[((P.heading+P.rockOff+180)%360-180)*RAD,Math.atan(P.rockSize/rd),P.rockSize>0.5?Math.atan(P.rockSize*0.42/rd):0]],
    uRockN:["3",[sr()*50,sr()*50,sr()*50]], uRockBase:["f",-Math.atan(camH/rd)],
    ...landUniforms(camH),
    uEnvSize:["2",[ENVW,ENVH]],
    uMagLim:["f",P.maglim],uGain:["f",P.starGain],uPsfA:["f",P.psf/60*RAD],uMaxPt:["f",maxPt],uDustStars:["f",Math.min(1,P.dust)],uStarSat:["f",P.starSat],uStarClip:["f",Math.pow(2,P.ev)*0.3*1.5*1.2],
    uCamH:["f",camH],uBeachD:["f",P.beach>0.05?P.beach:0],uSlope:["f",slope],uFwdH:["2",[Math.sin(az),Math.cos(az)]],uPebble:["f",P.pebble/100],
    uSea:["f",P.sea],uSilk:["f",P.silk],uSurf:["f",P.surf],uSwellLen:["f",P.swellLen],uWaveDir:["f",(P.heading+180+P.swellDir)*RAD],uSeedW:["f",seed*0.37],
    uFogDist:["f",5000/Math.max(P.haze,0.05)],
    uExpo:["f",Math.pow(2,P.ev)*0.3],uWB:["3",wb],uSat:["f",P.sat],uContrast:["f",P.contrast],uBlack:["f",P.black],uGrain:["f",P.grain],uVig:["f",P.vig],
    uSky:["i",0],uStars:["i",1],uEnv:["i",2],uDustMap:["i",3],uDustHP:["i",4],
  };
}
function landUniforms(camH){
  const r=mulberry((P.landSeed|0)*104729+11);
  const side=r()<0.5?-1:1;
  const half=hFov()/2;
  const tip=P.heading+side*half*(0.15+0.5*r());
  const dist=140+260*r();
  const height=(40+100*r())*P.headland;
  const extraStacks=r()*0.9+0.1;
  const stackH=0.7+0.7*r();
  return {
    uLandA:["4",[side,(((tip+180)%360+360)%360-180)*RAD,P.headland>0.01?Math.atan(height/dist):0,dist]],
    uLandB:["4",[P.trees,P.hills,(P.landSeed|0)*0.731+r(),-Math.atan(camH/dist)]],
    uLandC:["3",[camH,extraStacks,stackH]], uLandExt:["f",(40+80*r())*RAD],
  };
}
function bindDust(){ gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D,dustTex); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D,dustHPTex); gl.activeTexture(gl.TEXTURE0); }
function drawEnv(U){
  bindDust();
  setU(progEnv,U);
  gl.bindFramebuffer(gl.FRAMEBUFFER,envFB); gl.viewport(0,0,ENVW,ENVH); gl.disable(gl.BLEND);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.bindTexture(gl.TEXTURE_2D,envTex); gl.generateMipmap(gl.TEXTURE_2D);
}
/* one tile: sky -> stars -> composite into (fb, viewport) */
function drawTile(U,ox,oy,tw,th,outFB,fragOffset,vx,vy){
  const tU={uTileOrigin:["2",[ox,oy]],uMargin:["f",MARGIN],uTexSize:["2",[tw+2*MARGIN,th+2*MARGIN]],uFragOffset:["2",fragOffset]};
  const tex=[tw+2*MARGIN,th+2*MARGIN];
  gl.disable(gl.BLEND);
  bindDust();
  setU(progSky,U); setU(progSky,tU);
  gl.bindFramebuffer(gl.FRAMEBUFFER,skyFB); gl.viewport(0,0,tex[0],tex[1]);
  gl.drawArrays(gl.TRIANGLES,0,3);

  gl.bindFramebuffer(gl.FRAMEBUFFER,starFB); gl.viewport(0,0,tex[0],tex[1]);
  gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  setU(progStars,U); setU(progStars,tU);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,skyTex);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE);
  gl.bindVertexArray(starVAO); gl.drawArrays(gl.POINTS,0,starCount); gl.bindVertexArray(null);
  if(planetCount>0){ gl.bindVertexArray(planetVAO); gl.drawArrays(gl.POINTS,0,planetCount); gl.bindVertexArray(null); }
  gl.disable(gl.BLEND);

  drawTree(U,tU);

  setU(progComp,U); setU(progComp,tU);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,skyTex);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,starTex);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,envTex);
  gl.bindFramebuffer(gl.FRAMEBUFFER,outFB); gl.viewport(vx,vy,tw,th);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.activeTexture(gl.TEXTURE0);
}
const frame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
let gen=0;
const progEl=document.getElementById("prog");
function progress(f){ progEl.style.width=(f*100).toFixed(1)+"%"; progEl.style.opacity=f>=1?0:1; }

async function renderPreview(mode,my){
  if(!ok||!ready) return;
  if(P.landscape==="land"&&P.treeHeight>=0.1) buildTree();
  if(starSeed!==(P.seed|0)||starReal!==!!P.realStars||starMlim<Math.min(12.2,P.maglim+0.4)) buildStars(P.seed|0,!!P.realStars);
  updatePlanets();
  const t0=performance.now();
  const cw=canvas.width, ch=canvas.height;
  const sc=mode==="quick"?0.5:1;
  const W=Math.max(16,Math.round(cw*sc)), H=Math.max(16,Math.round(ch*sc));
  if(W!==prevW||H!==prevH){ if(prevTex){gl.deleteTexture(prevTex);gl.deleteFramebuffer(prevFB);} prevTex=makeTex(W,H,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE); prevFB=makeFB(prevTex); prevW=W; prevH=H; }
  const U=uniforms(W,H,mode==="quick"?24:56);
  drawEnv(U);
  const tiles=[]; for(let y=0;y<H;y+=TILE)for(let x=0;x<W;x+=TILE) tiles.push([x,y,Math.min(TILE,W-x),Math.min(TILE,H-y)]);
  for(let i=0;i<tiles.length;i++){
    if(my!==gen) return;
    const [x,y,w,h]=tiles[i];
    drawTile(U,x,y,w,h,prevFB,[0,0],x,y);
    if(tiles.length>1){ progress((i+1)/tiles.length); await frame(); }
  }
  if(my!==gen) return;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,prevFB); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
  gl.blitFramebuffer(0,0,W,H,0,0,cw,ch,gl.COLOR_BUFFER_BIT,gl.LINEAR);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);
  progress(1);
  lastInfo={W,H,ms:Math.round(performance.now()-t0),mode};
  updateReadout();
}

async function renderExport(longEdge){
  if(!ok||!ready) return;
  if(P.landscape==="land"&&P.treeHeight>=0.1) buildTree();
  const btn=document.getElementById("exportBtn"); btn.disabled=true; btn.textContent="Rendering…";
  const my=++gen;
  try{
    if(starSeed!==(P.seed|0)||starReal!==!!P.realStars||starMlim<Math.min(12.2,P.maglim+0.4)) buildStars(P.seed|0,!!P.realStars);
  updatePlanets();
    const [aw,ah]=P.aspect.split(":").map(Number);
    let W,H; if(aw>=ah){W=longEdge;H=Math.round(longEdge*ah/aw);} else {H=longEdge;W=Math.round(longEdge*aw/ah);}
    const big=document.createElement("canvas"); big.width=W; big.height=H;
    const ctx=big.getContext("2d");
    if(!ctx) throw new Error("This browser can't hold an image that large. Try a smaller size.");
    const U=uniforms(W,H,96);
    drawEnv(U);
    const tiles=[]; for(let y=0;y<H;y+=TILE)for(let x=0;x<W;x+=TILE) tiles.push([x,y,Math.min(TILE,W-x),Math.min(TILE,H-y)]);
    const buf=new Uint8Array(TILE*TILE*4);
    for(let i=0;i<tiles.length;i++){
      const [x,y,w,h]=tiles[i];
      drawTile(U,x,y,w,h,tileOutFB,[x,y],0,0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,tileOutFB);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buf);
      const img=ctx.createImageData(w,h);
      for(let r=0;r<h;r++) img.data.set(buf.subarray((h-1-r)*w*4,(h-r)*w*4),r*w*4);
      ctx.putImageData(img,x,H-y-h);
      progress((i+1)/tiles.length);
      await frame();
    }
    const blob=await new Promise(r=>big.toBlob(r,"image/png"));
    if(!blob) throw new Error("This browser couldn't encode an image that large. Try a smaller size.");
    const url=URL.createObjectURL(blob);
    const im=document.getElementById("outImg"); if(im.dataset.url) URL.revokeObjectURL(im.dataset.url);
    im.src=url; im.dataset.url=url;
    document.getElementById("outNote").textContent=`${W} × ${H} PNG, ${(blob.size/1048576).toFixed(1)} MB. Right-click or long-press the image to save it.`;
    document.getElementById("sheet").hidden=false;
  }catch(e){
    document.getElementById("outNote").textContent=e.message;
    document.getElementById("outImg").removeAttribute("src");
    document.getElementById("sheet").hidden=false;
  }finally{
    btn.disabled=false; btn.textContent="Render image"; progress(1);
    schedule("full");
  }
}

/* ------------------------------------------------------------------ scheduling */
let pending=null, rafQ=false, idleT=0, lastInfo=null;
function schedule(mode){
  pending=(pending==="full"&&mode==="quick")?"quick":mode;
  if(!rafQ){ rafQ=true; requestAnimationFrame(()=>{ rafQ=false; const m=pending; pending=null; renderPreview(m,++gen); }); }
  clearTimeout(idleT);
  if(mode==="quick") idleT=setTimeout(()=>schedule("full"),320);
}
