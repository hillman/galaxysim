"use strict";
/* ------------------------------------------------------------------ shaders: full-screen sky and environment passes */
const VS_QUAD = `#version 300 es
void main(){ vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2); gl_Position=vec4(p*2.-1.,0.,1.); }`;

const FS_SKY = COMMON + SKY + `
uniform int uSteps; uniform float uGrainMW;
out vec4 o;
void main(){
  vec2 g=gl_FragCoord.xy+uTileOrigin-uMargin;
  float pixA,cz; vec3 d=camRay(g,pixA,cz);
  if(pixA<0.){o=vec4(0.,0.,0.,1.);return;}
  /* below the horizon over a lake, compute the sky for the mirrored ray, so the composite can look up reflections */
  if(d.y<0.&&uLake.x>0.&&uLandscape==1) d.y=-d.y;
  else if(d.y<-0.004){o=vec4(0.,0.,0.,1.);return;}
  float jit=hash2(ivec2(g)+ivec2(1<<20));
  /* unresolved stars: sparse sub-pixel points that carry part of the galaxy light */
  float gs=0.; const float P=0.2;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    ivec2 c=ivec2(floor(g))+ivec2(i,j)+ivec2(1<<20);
    if(hash2(c+ivec2(7777,0))>1.-P){
      vec2 dv=vec2(i,j)+vec2(hash2(c+ivec2(0,555)),hash2(c+ivec2(555,0)))-0.5;
      gs+=-log(max(hash2(c+ivec2(99,99)),1e-4))*exp(-dot(dv,dv)/0.72)/2.26;
    }
  }
  vec4 s=skyRad(d,uSteps,jit,pixA,mix(1.,min(gs/P,8.),uGrainMW));
  o=s;
}`;

const FS_ENV = COMMON + SKY + `
uniform vec2 uEnvSize;
out vec4 o;
void main(){
  vec2 uv=gl_FragCoord.xy/uEnvSize;
  float azm=(uv.x-0.5)*2.*PI, alt=uv.y*PI*0.5;
  vec3 d=vec3(sin(azm)*cos(alt),sin(alt),cos(azm)*cos(alt));
  vec4 s=skyRad(d,30,0.5,2.*PI/uEnvSize.x,1.);
  vec3 c=s.rgb+0.10*extinct(airmass(alt));
  if(uLandscape==0){
    float rt=rockTop(azm);
    if(rt>0. && alt<uRockBase+rt) c=vec3(0.012,0.015,0.022);
    float ht=hillsTop(azm); if(alt<ht) c=mix(c,s.rgb*0.55,0.6);
    if(alt<landTop(azm)) c=vec3(0.008,0.01,0.014);
  }
  o=vec4(c,1.);
}`;
