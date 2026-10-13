"use strict";
/* ------------------------------------------------------------------ shaders: optional foreground (lake, valley fog).
   Camera at the origin; land at y = -uCamH. */
const FOREGROUND = `
/* uLake (in COMMON): x near-shore distance (m, 0 = none), y ripple, z seed
   uFog: x density, y level (0-1), z seed */
uniform vec4 uFog;
uniform float uFgBright;

/* noise around the horizon circle, so nothing jumps where the azimuth wraps; f is cycles per radian */
float azNoise(float azm,float f,float seed){ return vnoise3(vec3(cos(azm)*f,sin(azm)*f,seed)); }

/* ---------------- valley fog: a sheet over the lower slopes of each ridge layer, plus mist lying out on the plain */
float ridgeMean(int layer){ return uRelief*0.11*(1.-0.23*float(layer))-0.014*float(layer); }
/* the fog top is level in the world, so it shows in the saddles of each ridge; billowy (rounded, like the tops of
   cumulus) at large scale, wispy at small scale */
float fogLevelAt(int layer){ return max(ridgeMean(layer),0.)*(0.15+0.75*uFog.y)-0.002+0.01*uFog.y; }
/* broad swells only: the depth below this sets the density, so density never varies column by column */
float fogTopSmooth(int layer,float azm){
  float l=float(layer);
  float b1=1.-abs(2.*azNoise(azm,9.,uFog.z+l*7.)-1.);
  return fogLevelAt(layer)+(b1-0.5)*0.014+(azNoise(azm,31.,uFog.z+l*3.)-0.5)*0.005;
}
/* the visible top adds smaller billows, which only shape the feathered edge */
float fogTop(int layer,float azm){
  float l=float(layer);
  float b3=1.-abs(2.*azNoise(azm,90.,uFog.z+l*5.)-1.);
  return fogTopSmooth(layer,azm)+(b3-0.5)*0.004;
}
float fogOpacity(int layer,float azm,float alt,float pa){
  float thick=0.006+0.003*float(layer)+0.006*uRelief;
  float body=1.-exp(-max(fogTopSmooth(layer,azm)-alt,0.)/thick);
  float below=fogTop(layer,azm)-alt;
  float feather=smoothstep(-0.008,0.006,below);
  vec3 wq=vec3(cos(azm)*60.,sin(azm)*60.,alt*300.+uFog.z+float(layer)*11.);
  float wisp=vnoise3(wq)*0.7+vnoise3(wq*2.1+5.)*0.3;
  float stray=smoothstep(0.55,0.8,wisp)*exp(-max(-below,0.)/0.006)*0.25*(1.-step(0.,below));
  return clamp(uFog.x*(max(body,feather*0.35)*feather*(0.8+0.4*wisp)+stray),0.,0.95);
}
/* the sheet's opacity without its wisps, for quantities that must not vary column by column */
float fogBase(int layer,float azm,float alt){
  float below=fogTopSmooth(layer,azm)-alt;
  float thick=0.006+0.003*float(layer)+0.006*uRelief;
  return clamp(uFog.x*(1.-exp(-max(below,0.)/thick))*smoothstep(-0.008,0.006,below),0.,0.95);
}
/* aerial perspective through the mist: each farther ridge is veiled a little more */
float fogVeil(int layer){ return uFog.x*(0.5-0.18*float(layer)); }
/* mist lying on the plain below eye level: a ray looking down at angle a crosses a layer of thickness h over a
   horizontal run of about h/a, so opacity climbs smoothly toward the horizon, where it meets the nearest sheet's
   opacity; patches of thicker and thinner mist make the visible boundary wander */
float groundFogOpacity(float azm,float alt,float dist,float pa){
  vec2 g=vec2(sin(azm),cos(azm))*dist;
  /* thickness varies a little over the ground in 2D, never per column; patches stay smaller than the frame is wide, and
     each octave fades out once a pixel's run of ground exceeds it (otherwise they collapse into thin straight lines) */
  float fp=dist*pa/max(-alt,1e-4);
  float n=(vnoise2(g*0.012+uFog.z)-0.5)*exp(-pow(0.012*fp,2.))+(vnoise2(g*0.035+uFog.z+7.)-0.5)*0.6*exp(-pow(0.035*fp,2.));
  float k=0.02*(1.+0.5*n);
  return 1.-exp(-k/max(-alt,1e-4));
}
/* haze just above a mist sheet: ridges lighten toward where they meet it */
float ridgeHaze(int layer,float azm,float alt){
  return uFog.x*0.2*exp(-max(alt-fogTopSmooth(layer,azm),0.)/0.02);
}
/* brightness drifts in soft patches about four times wider than tall, never in columns */
/* lit by the whole low sky: a heavily blurred horizon sample, so stars and the Milky Way in it don't streak the mist */
vec3 fogColour(float azm,float alt,vec3 skyAvg,vec3 horizon){ return mix(skyAvg,textureLod(uEnv,envUV(azm,0.004),6.).rgb,0.6)*0.95*(0.85+0.3*vnoise3(vec3(cos(azm)*22.,sin(azm)*22.,alt*90.+uFog.z+31.))); }

/* ---------------- lake: the near shore runs across the view at uLake.x metres, wandering into coves.
   u is the position along the shore (m), so the shapes stay put as the camera turns */
float lakeShoreAt(float azm,out float u){
  float rel=atan(sin(azm-uHead),cos(azm-uHead));
  float c=max(cos(rel),0.17);
  float s=uLake.x;
  u=s*sin(rel)/c;
  float cove=vnoise2(vec2(u/(1.3*s+2.),uLake.z))-0.5;
  float perp=s*(1.+0.55*cove+0.035*u/s)+0.9*(vnoise2(vec2(u/1.8,uLake.z+8.))-0.5)+0.3*(vnoise2(vec2(u/0.8,uLake.z+4.))-0.5);
  return max(perp,0.6)/c;
}
`;
