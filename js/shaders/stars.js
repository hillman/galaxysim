"use strict";
/* ------------------------------------------------------------------ shaders: point-sprite stars */
const VS_STARS = COMMON + `
in vec3 aEq; in float aMag; in vec3 aCol;
uniform mat3 uLocalFromEq;
uniform float uMagLim,uGain,uPsfA,uMaxPt,uDustStars;
uniform sampler2D uSky;
out vec3 vCol; out float vAmp; out float vSig; out float vSize;
void main(){
  gl_Position=vec4(-10.,-10.,0.,1.); gl_PointSize=0.; vCol=vec3(0.); vAmp=0.; vSig=1.; vSize=1.;
  /* magnitude offsets mark catalogue sources: +200 a real star, cluster member or planet (apparent magnitude, so dust is
     already counted and must not dim it again); +100 unresolved cluster light, drawn regardless of the faint-star limit */
  bool real=aMag>150., force=!real && aMag>50.; float mg=real?aMag-200.:(force?aMag-100.:aMag);
  if(!force && mg>uMagLim) return;
  vec3 d=uLocalFromEq*aEq;
  if(d.y<-0.002) return;
  vec2 gpx; float pa; if(!camProject(d,gpx,pa)) return;
  vec2 lp=gpx-uTileOrigin+uMargin;
  if(any(lessThan(lp,vec2(-80.)))||any(greaterThan(lp,uTexSize+80.))) return;
  float sig=max(uPsfA/pa,0.6);
  if(aMag>150. && aMag-200.<0.) sig=max(sig*0.5,0.5);   /* the brightest points (planets, Sirius...) get a tighter core */
  float alt=asin(clamp(d.y,0.,1.));
  vec3 ext=extinct(airmass(alt));
  float F=pow(10.,-0.4*mg);
  float tr=texelFetch(uSky,ivec2(clamp(lp,vec2(0.),uTexSize-1.)),0).a;
  /* faint field stars fade behind dust, but a third always lie in front of it */
  if(!real && !force) F*=mix(1.,clamp(0.1+0.95*tr,0.,1.),smoothstep(3.5,9.,mg)*uDustStars);
  if(!force) F*=1.-smoothstep(uMagLim-0.5,uMagLim,mg);
  float amp=F*uGain/(100.*pa*pa);
  float pc=amp*0.965/(6.2832*sig*sig), ph=amp*0.035/(100.53*sig*sig);
  float thr=0.002;
  float rc=sig*sqrt(2.*log(max(pc/thr,1.))), rh=4.*sig*sqrt(2.*log(max(ph/thr,1.)));
  float r=max(max(rc,rh),0.8)+1.;
  vSize=min(2.*r,uMaxPt);
  gl_PointSize=vSize;
  gl_Position=vec4(lp/uTexSize*2.-1.,0.,1.);
  vCol=aCol*ext; vAmp=amp; vSig=sig;
}`;

const FS_STARS = `#version 300 es
precision highp float;
in vec3 vCol; in float vAmp; in float vSig; in float vSize;
uniform float uStarSat,uStarClip;
out vec4 o;
void main(){
  vec2 q=(gl_PointCoord-0.5)*vSize; float r2=dot(q,q), s2=vSig*vSig;
  float v=vAmp*(0.978*exp(-r2/(2.*s2))/(6.2832*s2)+0.022*exp(-r2/(32.*s2))/(100.53*s2));
  float l=dot(vCol,vec3(.2126,.7152,.0722));
  /* a real sensor clips bright star cores to white; colour survives only in the fainter wings */
  float clip=smoothstep(0.4,4.,v*uStarClip);
  o=vec4(max(mix(vec3(l),vCol,uStarSat*(1.-0.85*clip)),0.)*v,0.);
}`;
