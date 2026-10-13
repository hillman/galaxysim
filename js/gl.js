"use strict";
/* ------------------------------------------------------------------ GL setup */
const canvas = document.getElementById("view");
const msgEl = document.getElementById("msg");
const gl = canvas.getContext("webgl2",{antialias:false,alpha:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:"high-performance"});
function fail(t){ msgEl.textContent=t; msgEl.hidden=false; }
let ok = !!gl;
if (!gl) fail("This browser doesn't offer WebGL2, which the renderer needs.");
else if (!gl.getExtension("EXT_color_buffer_float")) { ok=false; fail("This GPU can't render to floating-point buffers (EXT_color_buffer_float), which the renderer needs."); }


function compile(type, src){
  const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(vs, fs, attribs){
  const p=gl.createProgram();
  gl.attachShader(p,compile(gl.VERTEX_SHADER,vs)); gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));
  if(attribs) attribs.forEach((a,i)=>gl.bindAttribLocation(p,i,a));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  p.loc={}; return p;
}
function setU(p, U){
  gl.useProgram(p);
  for(const k in U){
    let l=p.loc[k]; if(l===undefined){ l=p.loc[k]=gl.getUniformLocation(p,k); }
    if(l===null) continue;
    const [t,v]=U[k];
    if(t==="f") gl.uniform1f(l,v); else if(t==="i") gl.uniform1i(l,v);
    else if(t==="2") gl.uniform2fv(l,v); else if(t==="3") gl.uniform3fv(l,v);
    else if(t==="4") gl.uniform4fv(l,v); else if(t==="m3") gl.uniformMatrix3fv(l,false,v);
  }
}

const TILE=1024, MARGIN=64, TEX=TILE+2*MARGIN, ENVW=1024, ENVH=256;
let progSky, progEnv, progStars, progComp, maxPt=64;
let skyTex, starTex, envTex, skyFB, starFB, envFB, prevTex, prevFB, prevW=0, prevH=0, tileOutTex, tileOutFB;
let starVAO, starBuf, starCount=0, starSeed=-1, starReal=null, starMlim=0, planetVAO, planetBuf, planetCount=0, planetInfo=[];

function makeTex(w,h,internal,format,type,mip){
  const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
  if(mip){ gl.texStorage2D(gl.TEXTURE_2D,Math.floor(Math.log2(Math.max(w,h)))+1,internal,w,h); }
  else gl.texImage2D(gl.TEXTURE_2D,0,internal,w,h,0,format,type,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mip?gl.LINEAR_MIPMAP_LINEAR:gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,mip?gl.LINEAR:gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,mip?gl.REPEAT:gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return t;
}
function makeFB(t){ const f=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0); return f; }

function initGL(){
  progSky=program(VS_QUAD,FS_SKY);
  progEnv=program(VS_QUAD,FS_ENV);
  progStars=program(VS_STARS,FS_STARS,["aEq","aMag","aCol"]);
  progComp=program(VS_QUAD,FS_COMP);
  maxPt=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]||64;
  buildDustMap(); loadDustHP();
  skyTex=makeTex(TEX,TEX,gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT); skyFB=makeFB(skyTex);
  starTex=makeTex(TEX,TEX,gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT); starFB=makeFB(starTex);
  envTex=makeTex(ENVW,ENVH,gl.RGBA16F,null,null,true); envFB=makeFB(envTex);
  tileOutTex=makeTex(TILE,TILE,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE); tileOutFB=makeFB(tileOutTex);
  starVAO=gl.createVertexArray(); starBuf=gl.createBuffer();
  planetVAO=gl.createVertexArray(); planetBuf=gl.createBuffer();
  gl.bindVertexArray(planetVAO); gl.bindBuffer(gl.ARRAY_BUFFER,planetBuf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(7*8),gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,1,gl.FLOAT,false,28,12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,3,gl.FLOAT,false,28,16);
  gl.bindVertexArray(null);
}
