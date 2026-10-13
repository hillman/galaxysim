"use strict";
/* ------------------------------------------------------------------ shaders: shared GLSL (hashes, noise, camera, atmosphere, terrain) */
const COMMON = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
#define PI 3.14159265359
uint pcg(uint v){uint s=v*747796405u+2891336453u;uint w=((s>>((s>>28u)+4u))^s)*277803737u;return (w>>22u)^w;}
float hash3(ivec3 p){return float(pcg(uint(p.x)+pcg(uint(p.y)+pcg(uint(p.z)))))*2.3283064e-10;}
float hash2(ivec2 p){return float(pcg(uint(p.x)+pcg(uint(p.y)+0x9e3779b9u)))*2.3283064e-10;}
float hashf(float x){return float(pcg(floatBitsToUint(x)+12345u))*2.3283064e-10;}
float vnoise3(vec3 p){
  vec3 i=floor(p); vec3 f=p-i; vec3 u=f*f*f*(f*(f*6.-15.)+10.);
  ivec3 b=ivec3(i)+ivec3(1<<20);
  float a=hash3(b), c=hash3(b+ivec3(1,0,0)), e=hash3(b+ivec3(0,1,0)), g=hash3(b+ivec3(1,1,0));
  float h=hash3(b+ivec3(0,0,1)), j=hash3(b+ivec3(1,0,1)), k=hash3(b+ivec3(0,1,1)), l=hash3(b+ivec3(1,1,1));
  return mix(mix(mix(a,c,u.x),mix(e,g,u.x),u.y),mix(mix(h,j,u.x),mix(k,l,u.x),u.y),u.z);
}
float vnoise2(vec2 p){
  vec2 i=floor(p); vec2 f=p-i; vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  ivec2 b=ivec2(i)+ivec2(1<<21);
  return mix(mix(hash2(b),hash2(b+ivec2(1,0)),u.x),mix(hash2(b+ivec2(0,1)),hash2(b+ivec2(1,1)),u.x),u.y);
}
uniform vec3 uF,uR,uU; uniform vec2 uFull;
/* lens: uProj 0 rectilinear, 1 equisolid fisheye, 2 cylindrical panorama; focal length in full-frame mm */
uniform int uProj; uniform float uFocal,uMmPerPx,uHead,uPitchR;
vec3 camRay(vec2 gp,out float pa,out float cz){
  vec2 m=(gp-uFull*0.5)*uMmPerPx;
  if(uProj==1){
    float r=length(m), sn=r/(2.*uFocal);
    if(sn>=0.7071){ pa=-1.; cz=0.; return vec3(0.,-1.,0.); }
    float th=2.*asin(sn); vec2 dir=r>1e-6?m/r:vec2(0.);
    pa=uMmPerPx/(uFocal*cos(th*0.5)); cz=cos(min(th,1.5)*0.6);
    return normalize(cos(th)*uF+sin(th)*(dir.x*uR+dir.y*uU));
  }
  if(uProj==2){
    float az=uHead+m.x/uFocal, e=clamp(uPitchR+atan(m.y/uFocal),-1.5707,1.5707);
    pa=uMmPerPx/uFocal; cz=1./sqrt(1.+dot(m,m)/(uFocal*uFocal*16.));
    return vec3(sin(az)*cos(e),sin(e),cos(az)*cos(e));
  }
  vec3 d=normalize(uF*uFocal+m.x*uR+m.y*uU); cz=dot(d,uF); pa=uMmPerPx/uFocal*cz*cz;
  return d;
}
bool camProject(vec3 d,out vec2 gp,out float pa){
  vec2 m;
  if(uProj==1){
    float th=acos(clamp(dot(d,uF),-1.,1.)); if(th>1.5708) return false;
    vec2 q=vec2(dot(d,uR),dot(d,uU)); float l=length(q);
    m=(l>1e-6?q/l:vec2(0.))*2.*uFocal*sin(th*0.5); pa=uMmPerPx/(uFocal*cos(th*0.5));
  } else if(uProj==2){
    float az=atan(d.x,d.z)-uHead; az=atan(sin(az),cos(az));
    float e=asin(clamp(d.y,-1.,1.))-uPitchR; if(abs(e)>1.45) return false;
    m=vec2(az,tan(e))*uFocal; pa=uMmPerPx/uFocal;
  } else {
    float z=dot(d,uF); if(z<0.02) return false;
    m=vec2(dot(d,uR),dot(d,uU))/z*uFocal; pa=uMmPerPx/uFocal*z*z;
  }
  gp=m/uMmPerPx+uFull*0.5; return true;
}
uniform vec2 uTileOrigin; uniform float uMargin; uniform vec2 uTexSize;
uniform vec3 uSeedOff;
uniform float uHaze;
float airmass(float alt){ float a=max(alt,0.); return 1./(sin(a)+0.50572*pow(a*57.29578+6.07995,-1.6364)); }
vec3 extinct(float X){ return exp(-X*uHaze*vec3(0.105,0.16,0.27)); }
/* sea stacks: profile in angle space */
uniform vec3 uRock; uniform vec3 uRockN; uniform float uRockBase;
uniform vec4 uLandA,uLandB; uniform vec3 uLandC; uniform float uLandExt;
uniform int uLandscape;
uniform vec4 uLake;
uniform float uRelief;
float terrainRidge(float azimuth,float layer,float pixelAngle){
  vec2 circle=vec2(cos(azimuth),sin(azimuth));
  float seed=uLandB.z+layer*71.;
  float broad=vnoise3(vec3(circle*3.2,seed));
  float ridge=0.,amplitude=0.5,frequency=7.;
  for(int octave=0;octave<7;octave++){
    float detail=1.-abs(vnoise3(vec3(circle*frequency,seed+13.))-0.5)*2.;
    ridge+=amplitude*detail*exp(-pow(frequency*pixelAngle,2.));
    frequency*=2.13; amplitude*=0.48;
  }
  float height=uRelief*(0.018+0.16*pow(broad,2.)+0.07*ridge)*(1.-layer*0.23)-layer*0.014;
  float spacing=0.0026+layer*0.0011;
  float cell=floor((azimuth+PI)/spacing);
  float forest=0.;
  for(int neighbor=-1;neighbor<=1;neighbor++){
    float index=cell+float(neighbor);
    float chance=hashf(index+seed*31.);
    if(chance>uLandB.x*vnoise3(vec3(circle*37.,seed))*0.8) continue;
    float center=(index+0.2+0.6*hashf(index+seed))*spacing-PI;
    float width=spacing*(0.3+0.3*hashf(index*7.+seed));
    float shape=max(0.,1.-abs(azimuth-center)/width);
    forest=max(forest,pow(shape,0.9)*spacing*(0.45+chance*1.2));
  }
  return height+forest*smoothstep(0.005,0.15,uRelief);
}
float rockProfile(float x,float s){
  float b=1.-x*x; if(b<=0.) return -1.;
  float n=0.,fq=2.2,a=0.5;
  for(int i=0;i<6;i++){ n+=a*(vnoise2(vec2(x*fq+s,s*1.7))-0.5); fq*=2.13; a*=0.5; }
  float shoulder=smoothstep(-1.,-0.55,x)*smoothstep(1.,0.6,x);
  return pow(b,0.28)*(0.72+0.7*n)*mix(0.75,1.,shoulder);
}
float rockTop(float azm){
  if(uRock.z<=0.) return -1.;
  float best=-1.;
  for(int k=0;k<4;k++){
    float fk=float(k);
    float hk=hashf(uLandB.z*7.1+fk*3.3), hk2=hashf(uLandB.z*5.3+fk*9.1);
    if(k>0 && hk>uLandC.y) continue;
    float off = k==0?0.:(hk2*2.-1.)*(1.3+2.4*hashf(fk+uLandB.z));
    float sc  = k==0?1.:0.08+0.3*hk2*hk2;
    float c=uRock.x+off*uRock.y;
    float w=uRock.y*(k==0?1.:sc*(1.2+hk));
    float dz=atan(sin(azm-c),cos(azm-c));
    float x=dz/w;
    if(abs(x)<1.){ best=max(best,rockProfile(x,uRockN[k%3]+fk*17.3+uLandB.z)*uRock.z*sc*(k==0?uLandC.z:1.)); }
  }
  return best;
}
/* headland: x = side, y = tip azimuth, z = height (rad), w = distance (m)
   uLandB: x = tree cover, y = distant hills, z = seed, w = waterline angle at the headland */
float landTop(float azm){
  if(uLandA.z<=0.) return -9.;
  float rel=atan(sin(azm-uLandA.y),cos(azm-uLandA.y))*uLandA.x;
  if(rel<-0.05) return -9.;
  float sd=uLandB.z;
  float x=max(rel,0.);
  if(x>uLandExt+0.3) return -9.;
  float rise=1.-exp(-x*(6.+6.*hashf(sd+1.)));
  float n=0.,fq=1.2,a=.5;
  for(int i=0;i<8;i++){ n+=a*(vnoise2(vec2(x*fq*5.,sd))-0.5); fq*=2.1; a*=.5; }
  float shape=rise*(0.8+0.9*n)*(1.+0.6*(vnoise2(vec2(x*1.5,sd+3.))-0.5))*smoothstep(uLandExt+0.3,uLandExt-0.15,x);
  float dl=uLandA.w/(1.+x*3.);
  float top=-atan(uLandC.x/dl)+min(uLandA.z*(1.+x*2.),0.7)*shape;
  /* tree canopy: rounded crowns in clumps along the ridge */
  if(uLandB.x>0.){
    float crown=0.010*600./uLandA.w;
    float cx=x/crown; float ci=floor(cx); float tr=0.;
    for(int j=-1;j<=1;j++){
      float cc=ci+float(j); float h=hashf(cc+sd*13.);
      float ctr=cc+0.5+(h-0.5)*0.6; float r=0.55+0.5*hashf(cc*1.7+sd);
      float dd=(cx-ctr)/r;
      if(abs(dd)<1.) tr=max(tr,(0.5+0.9*h)*pow(1.-dd*dd,0.6));
    }
    float clump=smoothstep(0.45,0.7,vnoise2(vec2(x*9.,sd+7.))+uLandB.x*0.45-0.2);
    tr+=0.25*(vnoise2(vec2(x*900./uLandA.w*40.,sd))-0.5);
    top+=tr*crown*2.2*clump*smoothstep(0.05,0.3,rise);
  }
  return top;
}
float hillsTop(float azm){
  if(uLandB.y<=0.) return -9.;
  float sd=uLandB.z;
  float n=0.,fq=1.,a=.5;
  vec2 cs=vec2(cos(azm),sin(azm));
  for(int i=0;i<7;i++){ n+=a*vnoise3(vec3(cs*fq*2.,sd+40.+float(i)*3.)); fq*=2.2; a*=.5; }
  float mask=smoothstep(0.42,0.6,vnoise3(vec3(cs*1.3,sd+50.)));
  return (n-0.35)*0.05*uLandB.y*mask;
}
`;
