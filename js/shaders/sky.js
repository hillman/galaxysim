"use strict";
/* ------------------------------------------------------------------ shaders: sky radiance (galaxy, dust, nebulae, airglow, light pollution) */
const SKY = `
uniform mat3 uGalFromLocal;
uniform float uStarDust,uFront,uRiftGlow,uRed,uTintVar;
uniform float uReal,uMWC,uIsoK,uIsoG,uCatK,uDustS,uCoreK,uBulgeDust,uDustThr,uCoreMix,uBulgeN,uFil,uKnot,uSCK,uLane,uLaneSharp;
uniform float uSkyGlow,uGlowWarm;
uniform float uMW,uDust,uDustScale,uNeb,uAirglow,uAgHue,uLP,uLpAz,uLpWarm;
/* octave-limited noise: stops adding octaves once they'd be smaller than a pixel at this distance */
float octs(float f0,float tm,float pixA){ return clamp(log(1./(f0*tm*pixA*1.5))/log(2.07)+1.,1.,9.); }
float fbmL(vec3 p,float n){
  float a=.5,s=0.,w=0.;
  for(int i=0;i<9;i++){ float k=clamp(n-float(i),0.,1.); if(k<=0.) break;
    s+=a*k*vnoise3(p); w+=a*k; p=p*2.07+vec3(13.7,-7.1,5.3); a*=.52; }
  return s/max(w,1e-4);
}
/* ridged + turbulent dust: filaments, sheets and sharp-edged lanes */
float dustL(vec3 p,float n){
  float a=.5,s=0.,w=0.,prev=1.;
  for(int i=0;i<9;i++){ float k=clamp(n-float(i),0.,1.); if(k<=0.) break;
    float v=vnoise3(p); float r=1.-abs(2.*v-1.); r*=r;
    float o=mix(v,r*prev,0.65); prev=clamp(r*1.6,0.,1.);
    s+=a*k*o; w+=a*k; p=p*2.07+vec3(-5.3,11.9,3.1); a*=.56; }
  return s/max(w,1e-4);
}
/* line-of-sight integration through a simple model galaxy, sun at 8.2 kpc */
vec4 galaxy(vec3 g,float jit,int steps,float pixA){
  vec3 S=vec3(-8.2,0.,0.017);
  float t0=0.012,t1=28.;
  float lr=log(t1/t0)/float(steps);
  vec3 L=vec3(0.),T=vec3(1.); float Lnd=0.;
  float ca=cos(0.47),sa=sin(0.47);
  for(int i=0;i<160;i++){
    if(i>=steps) break;
    float ta=t0*exp(lr*float(i)), tb=ta*exp(lr);
    float ds=tb-ta, tm=ta+ds*jit;
    vec3 p=S+g*tm;
    float R=length(p.xy), az=abs(p.z);
    if(az>3.5 && p.z*g.z>0.) break;
    vec3 ns=p*uDustScale+uSeedOff;
    float diskR=exp(-(R-8.2)/2.6);
    float wz=p.z-0.12*(vnoise3(ns*1.3+7.)-0.5)-0.06*(vnoise3(ns*3.7+3.)-0.5);
    float thin=exp(-abs(wz)/0.12), thick=0.02*exp(-az/0.8);
    float th=atan(p.y,p.x);
    float arm=0.5+0.5*cos(2.*(th-log(max(R,1.))/0.24)+1.3); arm*=arm; arm*=arm;
    /* star clouds: patchy, high contrast, detailed down to the pixel */
    float cn=fbmL(ns*5.,octs(5.*uDustScale,tm,pixA)*0.9);
    float cloud=smoothstep(0.32,0.74,cn); cloud=0.1+2.6*cloud*cloud*cloud;
    cloud=mix(0.55,cloud,smoothstep(0.6,2.5,tm));
    float st=diskR*(thin*(0.5+1.1*arm)*cloud+thick);
    vec3 e=st*mix(vec3(0.95,0.96,1.02),vec3(0.8,0.9,1.12),arm*exp(-az/0.12));
    vec2 q=vec2(ca*p.x+sa*p.y,-sa*p.x+ca*p.y);
    float m2=q.x*q.x/1.2+q.y*q.y/0.45+p.z*p.z/0.5;
    e+=11.*exp(-3.2*pow(m2,0.6))*vec3(1.,0.86,0.72)*(0.25+1.5*cn*cn);
    if(uNeb>0. && az<0.25){
      float hn=vnoise3(ns*9.+31.);
      e+=uNeb*7.*smoothstep(0.66,0.92,hn)*(0.3+arm)*exp(-az/0.05)*diskR*vec3(1.,0.27,0.42);
    }
    Lnd+=dot(e,vec3(.3,.55,.15))*ds;
    L+=T*e*ds;
    /* smooth diffuse dust: ~1.5 mag/kpc in the mid-plane, so the far disk is hidden like the real sky */
    T*=exp(-uDust*1.0*ds*exp(-(R-8.2)/3.3)*exp(-abs(wz)/0.09)*smoothstep(0.05,0.3,tm)*vec3(0.85,1.,1.2));
    float db=exp(-(R-8.2)/3.3)*exp(-abs(wz)/0.13);
    if(db>1e-3 && uDust>0.){
      float n=dustL(ns*4.2,octs(4.2*uDustScale,tm,pixA));
      float c=smoothstep(0.32,0.7,n); c=c*c*5.5;
      float d=db*c*smoothstep(0.02,0.09,tm);
      T*=exp(-uDust*(1.-0.25*uReal)*2.2*d*ds*vec3(0.82,1.,1.2));
    }
  }
  return vec4(L,dot(L,vec3(.3,.55,.15))/max(Lnd,1e-6));
}
float fbmN(vec3 p,float n){ float a=.5,s=0.,w=0.; for(int i=0;i<4;i++){ float k=clamp(n-float(i),0.,1.); if(k<=0.) break; s+=a*k*vnoise3(p); w+=a*k; p=p*2.03+vec3(1.3,7.1,4.7); a*=.5; } return s/max(w,1e-4); }
/* ---- real-sky landmarks, in galactic (l, b) degrees ---- */
const int NKN=24;
/* M8 Lagoon; M8 core/Hourglass; M20 Trifid; M20 reflection; M17 Omega; M16 Eagle; NGC6559; Sh2-30/31 near M8; NGC6357; NGC6334; IC4604 rho Oph; IC4606 Antares; IC4592 Blue Horse; Sh2-9 sigma Sco; NGC6188; Eta Carinae; IC2944; M42 Orion; NGC7000; IC1396; Rosette; California; IC5070 Pelican; Gamma Cyg Sadr */
const vec4 KN[NKN]=vec4[NKN](
  vec4(5.965,-1.162,0.500,0.292),
  vec4(5.970,-1.176,0.083,0.058),
  vec4(7.086,-0.287,0.133,0.133),
  vec4(7.159,-0.230,0.117,0.083),
  vec4(15.095,-0.746,0.183,0.117),
  vec4(16.954,0.793,0.250,0.217),
  vec4(6.718,-1.939,0.117,0.075),
  vec4(6.908,-1.047,0.333,0.250),
  vec4(-6.824,0.881,0.375,0.333),
  vec4(-8.730,0.565,0.333,0.267),
  vec4(-6.314,17.682,0.458,0.333),
  vec4(-8.052,15.067,0.417,0.417),
  vec4(-5.618,23.019,1.000,0.500),
  vec4(-8.691,16.992,0.333,0.333),
  vec4(-22.952,-1.863,0.250,0.167),
  vec4(-72.319,-0.795,0.750,0.667),
  vec4(-65.509,-1.371,0.500,0.417),
  vec4(-150.988,-19.383,0.417,0.375),
  vec4(85.480,-1.006,0.917,0.750),
  vec4(99.302,3.743,1.250,1.083),
  vec4(-153.746,-2.044,0.583,0.500),
  vec4(160.237,-12.406,1.167,0.333),
  vec4(84.618,0.091,0.417,0.333),
  vec4(78.285,1.922,0.500,0.500));
const vec3 KP[NKN]=vec3[NKN](
  vec3(2.628,0.8,0.),
  vec3(1.057,0.45,0.),
  vec3(1.055,0.80,0.),
  vec3(1.055,0.45,1.),
  vec3(-3.108,0.90,0.),
  vec3(1.078,0.55,0.),
  vec3(1.065,0.35,0.),
  vec3(1.059,0.20,0.),
  vec3(0.974,0.35,0.),
  vec3(0.964,0.35,0.),
  vec3(1.374,0.40,1.),
  vec3(0.849,0.35,2.),
  vec3(1.005,0.18,1.),
  vec3(0.830,0.20,0.),
  vec3(0.858,0.35,0.),
  vec3(-0.485,1.00,0.),
  vec3(-0.292,0.35,0.),
  vec3(-1.101,1.20,0.),
  vec3(0.857,0.35,0.),
  vec3(0.726,0.20,0.),
  vec3(-1.091,0.35,0.),
  vec3(1.534,0.22,0.),
  vec3(0.881,0.25,0.),
  vec3(0.964,0.25,0.));

float segD(vec2 p,vec2 b){ float h=clamp(dot(p,b)/dot(b,b),0.,1.); return length(p-b*h); }
vec2 lbRel(vec2 lb,vec2 c){ return vec2(mod(lb.x-c.x+540.,360.)-180.,lb.y-c.y); }
float ridge2(vec2 p,float n){
  float a=.5,s=0.,w=0.;
  for(int i=0;i<9;i++){ float k=clamp(n-float(i),0.,1.); if(k<=0.) break;
    float v=vnoise2(p); float r=1.-abs(2.*v-1.);
    s+=a*k*mix(v,r*r,0.6); w+=a*k; p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(5.2,1.3); a*=.56; }
  return s/max(w,1e-4);
}
const int NSC=11;
/* bright star-cloud windows (galactic l, b, half-widths in degrees): Sagittarius cloud, M24, Scutum, Cygnus, Norma, Carina,
   Centaurus, Aquila, the Lagoon-to-M24 stream, the M7/M6 field, and the M17-to-Scutum stream */
const vec4 SC[NSC]=vec4[NSC](
  vec4(2.,-5.5,4.5,3.), vec4(12.2,-1.1,1.4,0.9), vec4(27.,-2.8,2.5,2.), vec4(75.,0.5,5.,2.5),
  vec4(-30.,-0.5,5.,2.5), vec4(-73.,-1.,4.,2.5), vec4(-55.,0.,5.,2.), vec4(40.,-3.,4.,2.), vec4(8.8,-1.5,4.2,1.1), vec4(-5.,-3.,3.,2.), vec4(19.5,-1.7,5.,1.3));
const float SG[NSC]=float[NSC](1.1,1.5,1.3,1.,1.,1.2,0.7,0.6,1.1,0.6,0.9);
/* catalogue dust: optical depth computed at start-up from 1,882 Lynds + Barnard dark nebulae,
   red = optical depth / 4, green = HII emission, blue = reflection nebulae */
uniform sampler2D uDustMap;
uniform sampler2D uDustHP;  /* SFD dust, log detail relative to its 0.7° mean, |b|<40 */
float realSky(vec3 g,float pixDeg,out float boost,out vec3 neb,out vec4 info,out float lnEf,out float clump,out float fil,out float hpo){
  hpo=0.;
  vec2 lb=vec2(atan(g.y,g.x),asin(clamp(g.z,-1.,1.)))*57.29578;
  float n=clamp(log2(1./(0.3*pixDeg*1.5))+1.,1.,9.);
  /* clumpy dust: the rift is not a uniform sheet; denser cloud elements and gaps let star clouds through.
     soft, roughly round clumps from about 1.5° down to the pixel, a little longer along the plane */
  { vec3 cp=vec3(g.xy*55.,g.z*80.)+uSeedOff*0.7;
    /* domain warp turns blobs into wisps */
    cp+=(vec3(vnoise3(cp*0.45+3.),vnoise3(cp*0.45+17.),vnoise3(cp*0.45+31.))-0.5)*2.4;
    float nc=clamp(log2(1./(0.95*pixDeg*1.5))+1.,1.,8.), cf=0.,ca=.5,cw=0.;
    for(int i=0;i<8;i++){ float k=clamp(nc-float(i),0.,1.); if(k<=0.) break; cf+=ca*k*vnoise3(cp); cw+=ca*k; cp=cp*2.05+vec3(4.1,9.3,2.7); ca*=.6; }
    clump=smoothstep(0.22,0.8,cf/max(cw,1e-4)); }
  fil=0.;
  /* domain warp: ragged, wind-blown cloud edges instead of catalogue ellipses */
  vec3 sp=g*60.;
  vec2 w1=vec2(vnoise3(sp*0.9+uSeedOff),vnoise3(sp*0.9+uSeedOff+17.))-0.5;
  vec2 w2=vec2(vnoise3(sp*3.4+uSeedOff+5.),vnoise3(sp*3.4+uSeedOff+29.))-0.5;
  vec2 q=lb+w1*0.9+w2*0.3;
  q.x=mod(q.x+180.,360.)-180.;
  vec4 m=texture(uDustMap,vec2((q.x+180.)/360.,clamp((q.y+90.)/180.,0.,1.)));
  float tau=m.r*4.;
  /* fractal texture down to the pixel: filaments and holes inside every cloud */
  float f=0.,a=.5,ws=0.; vec3 fp=sp*1.6+uSeedOff.yzx;
  for(int i=0;i<9;i++){ float k=clamp(n-float(i),0.,1.); if(k<=0.) break;
    float v=vnoise3(fp); float r=1.-abs(2.*v-1.); f+=a*k*mix(v,r,0.35); ws+=a*k; fp=fp*2.03+vec3(5.2,1.3,7.7); a*=.55; }
  f/=max(ws,1e-4);
  tau*=mix(0.35,1.55,smoothstep(0.28,0.78,f))*0.25*uCatK;
  /* measured dust (Schlegel, Finkbeiner & Davis far-infrared map) at 6′: real lanes, streamers and windows */
  if(abs(lb.y)<39.9){
    vec2 dh=texture(uDustHP,vec2((lb.x+180.)/360.,(40.-lb.y)/80.)).rg;
    float hp0=dh.r*2.2-0.8;
    /* lane contrast: gain on the measured fine dust for the band's outer light, with denser lanes sharpened a little.
       The bulge keeps the plain measured value, so the core is not spotted */
    float hp=uLane*hp0*(1.+uLaneSharp*max(hp0,0.)); hpo=hp;
    /* the smooth column is read at a noise-warped position: near the plane it is almost constant along the plane, and an
       unwarped lookup would draw a ruler-straight rift edge */
    /* the rift's edges in visible light are lobed and fingered on 1–3° scales; the far-infrared map's smooth plane
       gradient is not, so near the plane the lookup is warped strongly (three octaves, mostly across the plane) */
    float near=exp(-abs(lb.y)/4.);
    vec2 wl=lb+(vec2(vnoise2(lb*0.32+uSeedOff.zy+3.),vnoise2(lb*0.32+uSeedOff.xz+21.))-0.5)*vec2(1.6,1.2+3.2*near)
              +(vec2(vnoise2(lb*0.9+uSeedOff.yx+8.),vnoise2(lb*0.9+uSeedOff.zx+2.))-0.5)*vec2(0.9,0.8+1.6*near)
              +(vec2(vnoise2(lb*2.6+uSeedOff.yx),vnoise2(lb*2.6+uSeedOff.zx+13.))-0.5)*vec2(0.4,0.3+0.7*near);
    float gW=texture(uDustHP,vec2((wl.x+180.)/360.,clamp((40.-wl.y)/80.,0.,1.))).g;
    lnEf=gW>0.?gW*9.3-4.+hp0:-4.;
    tau+=uCatK*1.75*hp;
    /* large-scale dust column: thick dust (the Great Rift along the plane) darkens the band;
       moderate dust also mottles the Ophiuchus side. The bulge term below keeps the Sagittarius cloud bright */
    if(gW>0.){ float lnE=gW*9.3-4.; tau+=uDustS*smoothstep(0.,1.,clamp((lnE-log(uDustThr))/2.5,0.,1.))*2.8*mix(0.35,1.4,clump); }
  }
  boost=0.;
  if(abs(lb.y)>=39.9) lnEf=-4.;
  /* warp the window shapes so their edges are ragged rather than smooth ellipses */
  vec2 wq=lb+(vec2(vnoise2(lb*0.45+uSeedOff.xy),vnoise2(lb*0.45+uSeedOff.yz+9.))-0.5)*2.2+(vec2(vnoise2(lb*1.6+uSeedOff.zx),vnoise2(lb*1.6+uSeedOff.xz+5.))-0.5)*0.8;
  for(int i=0;i<NSC;i++){
    vec2 p=lbRel(wq,SC[i].xy)/SC[i].zw; boost+=SG[i]*exp(-0.5*pow(dot(p,p),0.8));
  }
  boost*=0.4+1.2*smoothstep(0.3,0.78,vnoise2(lb*0.6+uSeedOff.yz)*0.45+vnoise2(lb*2.2+uSeedOff.zx)*0.35+vnoise2(lb*7.+uSeedOff.xz)*0.2);
  neb=(m.g*vec3(1.,.3,.5)*1.3+m.b*vec3(.45,.6,1.)*0.9)*(0.45+0.9*f);
  vec2 bq=lb/vec2(16.,9.);
  info=vec4(m.a*5.,f,exp(-dot(bq,bq)),abs(lb.y));
  return tau;
}
vec4 skyRad(vec3 d,int steps,float jit,float pixA,float gran){
  float a=max(asin(clamp(d.y,-1.,1.)),0.);
  float X=airmass(a);
  vec3 ext=extinct(X);
  vec3 gd=uGalFromLocal*d;
  /* real sky: brightness from the traced isophotes, fine structure procedural, small dark clouds from the catalogue.
     the 3D model is only marched when it is visible in the blend */
  vec4 G=uReal<0.999?galaxy(gd,jit,steps,pixA):vec4(0.,0.,0.,1.);
  if(uReal>0.){
    float bo; vec3 nb; vec4 info; float lnEf=-4., clump=0.5, fil=0., hpo=0.;
    float tau=realSky(gd,pixA*57.29578,bo,nb,info,lnEf,clump,fil,hpo);
    float B=info.x, fd=info.y, bw=info.z, ab=info.w;
    tau=max(tau,-0.55);
    /* dust reddens what it lets through: brown-red lane edges, bluer windows */
    /* dust reddening: partly obscured light at lane edges turns brown-orange; uRed scales the colour difference */
    vec3 kRed=vec3(1.-0.3*uRed,1.-0.06*uRed,1.+0.5*uRed);
    vec3 tr=exp(-tau*kRed);
    /* brightness from isophote level; the brightest level (the Sagittarius cloud and bulge) gets an extra lift */
    float S=uIsoK*(exp2(B*uIsoG)-1.)+0.01;
    float mott=mix(1.,mix(0.6,1.4,fd),0.4+0.5*smoothstep(0.5,3.5,B));
    vec3 tint=mix(vec3(1.3,0.88,0.8),vec3(1.45,0.86,0.62),bw);
    /* colour varies cloud to cloud: older, warmer star clouds and younger, bluer ones, plus a lavender cast in places */
    { vec3 cq=gd*24.+uSeedOff.yzx; float cv1=vnoise3(cq)*0.65+vnoise3(cq*2.7)*0.35, cv2=vnoise3(cq*0.6+11.);
      vec3 cw=mix(vec3(1.1,0.98,0.88),vec3(0.94,0.93,1.12),smoothstep(0.3,0.7,cv1));
      cw=mix(cw,vec3(1.08,0.9,1.12),smoothstep(0.55,0.8,cv2)*0.7);
      tint*=mix(vec3(1.),cw,uTintVar);
      tint*=mix(vec3(1.05,0.99,0.93),vec3(0.95,0.99,1.07),smoothstep(0.35,0.7,fd)); }
    /* light from in front of the dust is faint and reddened: warm brown-purple lane interiors */
    /* near the galactic centre the hand-traced isophotes are least reliable (they over-rate patches north of the plane),
       so there the bulge model below carries more of the light */
    vec2 lbc=vec2(atan(gd.y,gd.x),asin(clamp(gd.z,-1.,1.)))*57.29578;
    float cz=exp(-pow((lbc.x-3.)/17.,4.)-pow(lbc.y/12.,4.));
    S*=1.-uCoreMix*cz*mix(0.75,1.,clump);
    vec3 Rl=tint*S*mott*(uFront*vec3(1.08,0.94,0.9)+(1.-uFront)*tr)*(1.+0.15*bo);
    /* central bulge: smooth old-star light around the galactic centre (slightly boxy, brighter on the near side of the bar),
       seen through the measured dust column, so only the low-dust windows (Sagittarius cloud, Baade's window) shine */
    if(uCoreK>0.){
      vec2 gl2=vec2(atan(gd.y,gd.x),asin(clamp(gd.z,-1.,1.)))*57.29578;
      /* ragged coordinates, so no contour of the smooth light model runs as a straight line along the plane */
      vec2 gw=gl2+(vec2(vnoise2(gl2*0.5+uSeedOff.yz+7.),vnoise2(gl2*0.5+uSeedOff.zx+29.))-0.5)*vec2(1.6,1.4)
                 +(vec2(vnoise2(gl2*1.9+uSeedOff.xy+3.),vnoise2(gl2*1.9+uSeedOff.yx+17.))-0.5)*0.6;
      float hN=mix(5.5,uBulgeN,smoothstep(-1.5,1.5,gw.y));          /* flatter to the north, blended smoothly */
      vec2 q2=vec2((gw.x-1.5)/mix(8.,10.,smoothstep(0.,3.,gw.x)),gw.y/hN);
      float rb=pow(pow(abs(q2.x),2.4)+pow(abs(q2.y),2.4),1./2.4);
      float bulc=exp(-2.*rb), disk=0.32*exp(-abs(gw.x)/20.)*exp(-sqrt(gw.y*gw.y+0.3)/2.4);
      /* thin dark filaments across the bright core: ridges of a lightly warped noise field, soft-edged, where dust is moderate */
      vec3 fq=gd*115.+uSeedOff*1.9;
      fq+=(vec3(vnoise3(fq*0.33+5.),vnoise3(fq*0.33+19.),vnoise3(fq*0.33+41.))-0.5)*3.2;
      float fl=0.,fa=.5,fw=0.; float nf=clamp(log2(1./(3.3*pixA*57.29578*1.5))+1.,0.,6.);
      for(int i=0;i<3;i++){ float k=clamp(nf-float(i),0.,1.); if(k<=0.) break; float v=1.-abs(2.*vnoise3(fq)-1.); fl+=fa*k*pow(v,6.); fw+=fa*k; fq=fq*2.1+vec3(1.7,3.9,8.2); fa*=.4; }
      fl=fw>0.?fl/fw:0.;
      float fmod=smoothstep(-1.6,-0.4,lnEf)*(1.-smoothstep(0.6,1.6,lnEf));
      float Ef=exp(lnEf)*mix(0.6,1.25,clump)*(1.+uFil*3.*fl*fmod);
      vec3 Tb=exp(-uBulgeDust*Ef*2.86*kRed);
      /* disk star clouds (M24, M8, M23...) lie in front of most plane dust: capped extinction, so they show as knots */
      vec3 Td=Tb;
      Rl+=uCoreK*vec3(1.32,0.95,0.86)*(bulc*Tb+disk*Td)*mix(1.,mott,0.6);
      /* the rift is not empty: faint, dusty foreground starlight in irregular patches; the gaps between patches are its
         darker lanes. Domain-warped noise, stretched along the plane, so gaps run as long ragged lanes */
      { vec2 rq=gw*vec2(0.42,0.95)+uSeedOff.xy;
        rq+=(vec2(vnoise2(rq*0.6+4.),vnoise2(rq*0.6+19.))-0.5)*0.8;
        float rp=vnoise2(rq)*0.6+vnoise2(rq*2.4+7.)*0.4;
        /* glow sits on the rift's flanks; its densest spine (E(B-V) above ~4) stays dark, giving the main lane */
        float spine=smoothstep(1.,1.7,lnEf+0.35*(rp-0.5));
        float inRift=smoothstep(-0.6,0.6,lnEf)*(1.-spine)*exp(-abs(gw.y)/3.5)*exp(-abs(gw.x)/28.);
        Rl+=uCoreK*uRiftGlow*inRift*smoothstep(0.3,0.8,rp)*vec3(1.18,0.94,0.8)*mix(1.,mott,0.5); }
      /* foreground disk stars in front of the rift dust: a faint warm, patchy glow, so the rift is never bare sky */
      float fgd=exp(-abs(gl2.y)/3.5)*exp(-abs(gl2.x)/35.)*smoothstep(0.,0.8,lnEf+0.3);
      Rl+=uCoreK*0.0035*fgd*mix(1.3,0.35,clump)*vec3(1.02,0.95,0.92)*mix(1.,mott,0.5);
    }
    /* diffuse hydrogen-alpha along the plane, plus catalogued HII and reflection nebulae */
    /* star-cloud windows lie in front of most of the plane's dust: add them dimmed only by the local fine dust structure */
    { float loc=uCatK*1.75*max(hpo,0.)+0.6*uFil*clump*clump+0.18*clamp(exp(lnEf)-1.2,0.,5.);
      vec3 tl=exp(-loc*kRed);
      /* windows break up into separate knots and patches, never a smooth elongated glow */
      float pk=smoothstep(0.2,0.85,vnoise2(lbc*1.1+uSeedOff.yx)*0.5+vnoise2(lbc*3.3+uSeedOff.xz)*0.32+vnoise2(lbc*9.+uSeedOff.zy)*0.18);
      Rl+=uSCK*bo*(0.45+0.9*pk)*vec3(1.,0.97,1.06)*tl*mix(1.,mott,0.75)*(1.+0.35*fd); }
    /* bright named nebulae as compact knots at their true positions and sizes (Lagoon, Trifid, Omega, Eagle, rho Oph...) */
    { vec3 kn=vec3(0.);
      for(int i=0;i<NKN;i++){
        vec2 dlb=vec2(mod(lbc.x-KN[i].x+540.,360.)-180.,lbc.y-KN[i].y); dlb.x*=cos(KN[i].y*0.01745);
        if(abs(dlb.x)>KN[i].z*3.5||abs(dlb.y)>KN[i].z*3.5) continue;
        float sp=sin(KP[i].x), cp=cos(KP[i].x);
        float u=(dlb.x*sp+dlb.y*cp)/KN[i].z, v=(dlb.x*cp-dlb.y*sp)/KN[i].w;
        float r2=(u*u+v*v)*0.45+0.15*max(u*u,v*v)+0.4*dot(dlb,dlb)/(KN[i].z*KN[i].z); float f=exp(-1.6*r2)*(0.5+0.7*fd);
        vec3 kc=KP[i].z<0.5?vec3(1.,0.5,0.85):(KP[i].z<1.5?vec3(0.42,0.62,1.):vec3(1.,0.72,0.35));
        kn+=kc*KP[i].y*KP[i].y*f;
      }
      Rl+=uKnot*kn*(0.35+0.65*tr.g); }
    vec3 gd2=gd*40.+uSeedOff;
    float ha=exp(-ab/4.5)*(0.25+1.1*smoothstep(0.4,0.85,vnoise3(gd2)*0.6+vnoise3(gd2*3.1)*0.4))*(1.+1.6*smoothstep(0.15,1.,tau));
    Rl+=uNeb*(0.09*ha*S*vec3(1.,0.3,0.68)*(0.4+0.6*tr.r)+0.55*nb*tr.g*(0.25+0.75*S));
    G.rgb=mix(G.rgb,Rl,uReal);
    /* transmission for faint background stars: they sit mostly behind the dust, so the measured column counts in full */
    /* the dimming of background stars varies cloud to cloud (ragged, never a ruled edge) */
    float tvar=mix(0.45,1.45,smoothstep(0.25,0.75,vnoise3(gd*45.+uSeedOff.zxy)*0.6+vnoise3(gd*140.+uSeedOff)*0.4));
    float ta=exp(-0.6*max(tau,0.)*tvar)*exp(-uStarDust*clamp(exp(lnEf)-0.35,0.,5.)*tvar);
    G.a=mix(G.a,ta,uReal);
  }
  float gl=dot(G.rgb,vec3(.3,.55,.15));
  G.rgb*=pow(max(gl,1e-5)/0.5,uMWC-1.);
  vec3 col=G.rgb*uMW*1.5*ext*gran;
  float c=cos(a); float vr=1./sqrt(1.-0.9721*c*c);
  float azm=atan(d.x,d.z);
  float w=0.7+0.6*vnoise3(vec3(cos(azm)*2.6,sin(azm)*2.6,a*5.)+uSeedOff);
  vec3 agc=mix(vec3(0.36,1.,0.5),vec3(1.,0.34,0.24),uAgHue);
  col+=uAirglow*0.07*vr*w*agc*exp(-X*uHaze*0.08);
  col+=0.10*vec3(0.5,0.62,1.)*(0.75+0.25*vr)*exp(-X*uHaze*0.05);
  float da=azm-uLpAz; da=atan(sin(da),cos(da));
  vec3 lpc=mix(vec3(0.82,0.88,1.),vec3(1.,0.5,0.17),uLpWarm);
  col+=uLP*lpc*(exp(-a/0.08)*(0.12+1.1*exp(-da*da/0.45))+0.04*exp(-a/0.3));
  /* broad skyglow: scattered light from distant towns, bluish-violet, rising toward the horizon and toward the dome */
  col+=uSkyGlow*mix(vec3(0.62,0.66,1.),vec3(1.,0.8,0.55),uGlowWarm)*(exp(-a/0.55)*(0.55+0.45*exp(-da*da/1.4)));
  return vec4(col,G.a);
}
`;
