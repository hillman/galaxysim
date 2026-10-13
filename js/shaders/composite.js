"use strict";
/* ------------------------------------------------------------------ shaders: composite (sea, shore, land, camera development) */
const FS_COMP = COMMON + `
uniform sampler2D uSky,uStars,uEnv;
uniform vec2 uEnvSize, uFragOffset;
uniform float uCamH,uBeachD,uSlope,uPebble,uSea,uSilk,uSurf,uSwellLen,uWaveDir,uSeedW,uFogDist;
uniform vec2 uFwdH;
uniform float uExpo,uSat,uContrast,uGrain,uVig,uBlack; uniform vec3 uWB;
out vec4 o;
vec2 envUV(float azm,float alt){ return vec2(azm/(2.*PI)+0.5, clamp(alt,0.,PI*0.5)/(PI*0.5)); }
vec3 envRough(vec3 r,float sAlt,float sAz){
  float azm=atan(r.x,r.z), alt=asin(clamp(r.y,-1.,1.));
  float lod=clamp(log2(max(sAz,1e-5)*uEnvSize.x/(2.*PI)),0.,9.);
  vec3 acc=vec3(0.); float ws=0.;
  for(int i=-4;i<=4;i++){
    float k=float(i)*0.5, w=exp(-0.5*k*k);
    acc+=w*textureLod(uEnv,envUV(azm,abs(alt+k*sAlt)),lod).rgb; ws+=w;
  }
  return acc/ws;
}
float fbm2f(vec2 p,float fp){
  float a=0.5,s=0.,f=1.;
  for(int i=0;i<6;i++){
    float k=exp(-pow(f*fp*1.2,2.));
    s+=a*mix(0.5,vnoise2(p),k);
    p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(3.1,7.7); f*=2.; a*=0.5;
  }
  return s/0.984;
}
vec3 water(vec3 d,vec3 p,float t,float pa,float shoreDist,vec3 skyAvg){
  vec2 rad=normalize(d.xz+1e-6), lat=vec2(-rad.y,rad.x);
  float fpL=t*pa, fpR=t*pa/max(-d.y,1e-4);
  vec2 grad=vec2(0.); float var=0.0004, crest=0.;
  for(int i=0;i<12;i++){
    float fi=float(i);
    float lam=uSwellLen*pow(0.66,fi), k=2.*PI/lam;
    float ang=uWaveDir+(hashf(fi+uSeedW)-0.5)*(i<3?0.45:1.7);
    vec2 dir=vec2(sin(ang),cos(ang));
    float S=uSea*0.11*(i<3?1.15:1.);
    float keep=i<3?1.-0.2*uSilk:exp(-uSilk*fi*0.33);
    float fpD=length(vec2(dot(dir,rad)*fpR,dot(dir,lat)*fpL));
    float filt=exp(-0.5*pow(k*fpD*0.6,2.));
    float Sk=S*keep;
    float ph=k*dot(dir,p.xz)+6.2832*hashf(fi*3.1+uSeedW);
    grad+=dir*Sk*cos(ph)*filt;
    var+=0.5*(S*S*(1.-keep*keep)*0.6+Sk*Sk*(1.-filt*filt));
    if(i==0) crest=sin(ph)*filt;
  }
  vec3 n=normalize(vec3(-grad.x,1.,-grad.y));
  float sg=sqrt(var);
  vec3 r=reflect(d,n); r.y=abs(r.y)+0.001;
  float ct=max(dot(-d,n),0.);
  float F=0.02+0.98*pow(1.-ct,5.);
  F=mix(F,0.06+0.5*F,smoothstep(0.05,0.3,sg));
  vec3 refl=envRough(r,2.*sg,2.*sg*clamp(-d.y*3.+0.1,0.1,1.));
  vec3 body=vec3(0.01,0.1,0.09)*skyAvg*3.;
  vec3 col=F*refl+(1.-F)*body;
  /* foam: domain-warped streaks drawn out along the crests by the long exposure */
  vec2 wd=vec2(sin(uWaveDir),cos(uWaveDir)), wl=vec2(-wd.y,wd.x);
  vec2 wp=vec2(dot(p.xz,wl),dot(p.xz,wd));
  float warp=fbm2f(wp*vec2(0.035,0.09),fpL*0.09)-0.5;
  vec2 fq=vec2(wp.x/5.+warp*3.,wp.y/0.7+warp*8.);
  float fn=fbm2f(fq,fpL/0.7);
  float zone=uBeachD>0.?exp(-max(shoreDist,0.)/(9.*uSurf+1.)):0.;
  float cr=smoothstep(-0.2,1.,crest);
  float streak=smoothstep(0.52,0.8,fn*0.85+cr*0.28+zone*0.1); streak*=streak;
  float cover=streak*(0.22*uSurf+zone*0.6*uSurf)*(0.5+0.7*cr);
  cover=clamp(cover,0.,0.92);
  vec3 foam=skyAvg*0.75+F*refl*0.3;
  col=mix(col,foam,cover);
  return col;
}
vec3 pebbles(vec2 q,float fp,vec3 d,float wet,vec3 skyAvg){
  vec2 c=q/uPebble; vec2 ic=floor(c), fc=c-ic;
  float F1=9.; vec2 best=vec2(0.); float bid=0.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    ivec2 cc=ivec2(ic)+ivec2(i,j)+ivec2(1<<21);
    vec2 pt=vec2(float(i),float(j))+vec2(hash2(cc),hash2(cc+ivec2(7919,0)))*0.8+0.1-fc;
    float dd=length(pt*vec2(1.,1.25));
    if(dd<F1){F1=dd;best=pt;bid=hash2(cc+ivec2(0,3571));}
  }
  float rr=0.43+0.12*bid;
  vec2 v=-best*vec2(1.,1.25)/rr; float l2=dot(v,v);
  vec2 tilt=(vec2(hash2(ivec2(bid*9e5,3)),hash2(ivec2(bid*7e5,5)))-0.5)*0.9;
  vec3 n=l2<1.?normalize(vec3(v.x+tilt.x,sqrt(1.-l2)*0.8,v.y+tilt.y)):vec3(0.,1.,0.);
  float inside=smoothstep(1.,0.82,sqrt(l2));
  float alb=0.03+0.22*pow(fract(bid*13.7),2.);
  vec3 tint=mix(vec3(0.9,0.96,1.05),vec3(1.05,0.99,0.92),fract(bid*7.13));
  vec3 diff=alb*tint*skyAvg*(0.35+0.65*n.y)*mix(0.15,1.,inside);
  float F=0.04+0.96*pow(1.-max(dot(-d,n),0.),5.);
  vec3 spec=envRough(reflect(d,n),0.2,0.2)*F*wet*inside*0.6;
  vec3 det=diff+spec;
  vec3 avg=0.07*skyAvg*0.8+wet*0.05*envRough(reflect(d,vec3(0.,1.,0.)),0.35,0.35);
  return mix(det,avg,smoothstep(0.12,0.55,fp/uPebble));
}
float gauss(ivec2 p,int s){ return (hash2(p+ivec2(s,0))+hash2(p+ivec2(0,s))+hash2(p+ivec2(s,s))+hash2(p-ivec2(s,0))-2.)*1.73; }
vec3 aces(vec3 x){ return clamp(x*(2.51*x+0.03)/(x*(2.43*x+0.59)+0.14),0.,1.); }
`+FOREGROUND+`
/* ridges and valley fog sheets: everything beyond the near ground, also used for the lake's reflection */
vec3 landBackdrop(float azimuth,float altitude,float pixelAngle,vec3 sky,vec3 skyAverage,vec3 horizon,out float groundCoverage){
  vec3 colour=sky;
  groundCoverage=0.;
  for(int layer=0;layer<3;layer++){
    float depth=float(layer);
    float ridge=terrainRidge(azimuth,depth,pixelAngle);
    float coverage=clamp((ridge-altitude)/pixelAngle+0.5,0.,1.);
    groundCoverage=max(groundCoverage,coverage);
    vec2 mountain=vec2(azimuth,altitude)*vec2(190.,260.);
    float crag=fbm2f(mountain+depth*43.+uLandB.z,pixelAngle*260.);
    vec3 rock=skyAverage*vec3(0.045,0.052,0.065)*(0.45+crag)*mix(1.,uFgBright,0.5-0.15*depth);
    float ravine=fbm2f(vec2(azimuth*380.,altitude*40.)+crag*2.+depth*43.+uLandB.z,pixelAngle*380.);
    /* gullies run downhill; under a mist veil they would read as vertical streaks, so they fade with the veil */
    rock*=1.+(ravine*0.6-0.3)*(uFog.x>0.?max(1.-uFog.x*2.,0.):1.);
    rock+=horizon*0.035*(1.-depth*0.3);
    vec3 fogC=fogColour(azimuth,altitude,skyAverage,horizon);
    if(uFog.x>0.) rock=mix(rock,fogC*0.8,fogVeil(layer)+ridgeHaze(layer,azimuth,altitude));
    colour=mix(colour,rock,coverage);
    if(uFog.x>0.) colour=mix(colour,fogC,fogOpacity(layer,azimuth,altitude,pixelAngle));
  }
  return colour;
}
/* what the misty foot of the nearest ridge looks like on average: built only from smooth terms, so the plain can fade
   into it without copying any column detail */
vec3 mistHorizon(float azimuth,float altitude,vec3 skyAverage,vec3 horizon){
  vec3 fogC=fogColour(azimuth,altitude,skyAverage,horizon);
  vec3 foot=skyAverage*vec3(0.045,0.052,0.065)*mix(1.,uFgBright,0.2);
  foot=mix(foot,fogC*0.8,fogVeil(2)+uFog.x*0.2);
  return mix(foot,fogC,fogBase(2,azimuth,0.002));
}
/* mist lying out on the plain: looking down through a shallow layer, the plain fades toward the misty horizon */
vec3 groundFog(vec3 colour,float azimuth,float dist,float pa,vec3 skyAverage,vec3 horizon){
  if(uFog.x<=0.) return colour;
  float alt=-atan(uCamH/max(dist,0.1));
  return mix(colour,mistHorizon(azimuth,alt,skyAverage,horizon),groundFogOpacity(azimuth,alt,dist,pa));
}
vec3 dryLandscape(vec3 direction,float azimuth,float altitude,float pixelAngle,vec3 sky,vec3 skyAverage,vec3 horizon,out float groundCoverage){
  vec3 colour=landBackdrop(azimuth,altitude,pixelAngle,sky,skyAverage,horizon,groundCoverage);
  /* just above the horizon the ridge foot converges on the same misty average the plain fades to */
  if(uFog.x>0.&&altitude>=0.){
    colour=mix(colour,mistHorizon(azimuth,altitude,skyAverage,horizon),(1.-smoothstep(0.,0.006,altitude))*0.9);
    /* mist near the horizon is foreground for the sky black point, easing out above it, so there is no step at the horizon */
    groundCoverage=max(groundCoverage,1.-smoothstep(0.,0.02,altitude));
  }
  if(altitude<0.){
    groundCoverage=1.;
    float distance=uCamH/max(-direction.y,0.0001);
    vec2 ground=direction.xz*distance;
    float footprint=distance*pixelAngle/max(-direction.y,0.04);
    float grass=fbm2f(ground*vec2(1.4,0.6)+uLandB.z,footprint*1.4);
    float patches=fbm2f(ground*0.035+uLandB.z,footprint*0.035);
    float stones=fbm2f(ground*7.+uLandB.z+9.,footprint*7.);
    vec3 tint=mix(vec3(0.038,0.05,0.025),vec3(0.046,0.043,0.034),smoothstep(1.,3.,uFgBright));
    vec3 soil=skyAverage*tint*(0.3+grass*0.7+patches*0.8)*mix(1.,0.75+0.5*stones,smoothstep(1.,3.,uFgBright))*uFgBright;
    soil=groundFog(soil,azimuth,distance,pixelAngle,skyAverage,horizon);
    /* ridge bases fade into the ground; with fog the sheets must not bleed onto the near ground, so keep that edge tight */
    colour=uFog.x>0.?soil:mix(soil,colour,smoothstep(-0.09,0.,altitude));
  }
  return colour;
}
/* the lake: the mirrored sky comes from the sky and star passes (computed for the reflected ray below the horizon);
   resolved ripples shift the lookup, unresolved ones blur it vertically, as long-exposure reflections do */
vec3 lakeWater(vec3 d,vec2 gp,float azm,float alt,float pa,vec3 skyAvg,vec3 horizon,out float F,out float skyShare){
  float t=uCamH/max(-d.y,1e-5);
  vec2 p=d.xz*t;
  vec2 rad=normalize(d.xz+1e-7), lat=vec2(-rad.y,rad.x);
  float fpL=t*pa, fpR=t*pa/max(-d.y,1e-4);
  float patchy=smoothstep(0.3,0.8,fbm2f(p*0.012+uLake.z,fpR*0.012));
  /* light airs leave glassy patches between ruffled ones; a stronger breeze ruffles everything */
  float amp=uLake.y*mix(0.03+0.97*patchy*patchy,1.,smoothstep(0.2,0.8,uLake.y));
  vec2 g=vec2(0.); float var=1e-8;
  for(int i=0;i<9;i++){
    float fi=float(i);
    float lam=3.*pow(0.62,fi), k=2.*PI/lam;
    /* wind ripples: short wavelets in a broad spread of directions; long trains kept weak so no regular bands form */
    float ang=uLake.z*3.+(hashf(fi+uLake.z)-0.5)*3.6;
    vec2 dir=vec2(sin(ang),cos(ang));
    float S=amp*0.03*pow(0.85,fi)*(i<3?0.35:1.);
    float fpD=length(vec2(dot(dir,rad)*fpR,dot(dir,lat)*fpL));
    float filt=exp(-0.5*pow(k*fpD*0.6,2.));
    float ph=k*dot(dir,p)+6.2832*hashf(fi*3.1+uLake.z);
    g+=dir*S*cos(ph)*filt;
    var+=0.5*S*S*(1.-filt*filt);
  }
  float sR=dot(g,rad), sL=dot(g,lat);
  float sig=2.*sqrt(var);
  float altR=max(-alt+2.*sR,0.0003), azR=azm+2.*sL*(-d.y);
  F=0.02+0.98*pow(1.-clamp(-d.y,0.,1.),5.);
  vec3 lookDir=vec3(sin(azR)*cos(altR),-sin(altR),cos(azR)*cos(altR));
  vec2 q; float pq;
  vec4 m=vec4(0.);
  float sigPx=sig/pa;
  if(camProject(lookDir,q,pq)){
    vec2 c=q-uTileOrigin+uMargin;
    float ws=0.;
    for(int k=-3;k<=3;k++){
      float o=float(k)*max(sigPx,0.3)*0.7;
      float w=exp(-0.5*pow(float(k)*0.7,2.));
      vec2 tq=clamp(c+vec2(0.,o),vec2(0.),uTexSize-1.);
      vec4 sk=texelFetch(uSky,ivec2(tq),0);
      m+=w*vec4(sk.rgb+texelFetch(uStars,ivec2(tq),0).rgb,sk.a); ws+=w;
    }
    m/=ws;
  }
  vec3 rdir=vec3(sin(azR)*cos(altR),sin(altR),cos(azR)*cos(altR));
  vec3 rough=envRough(rdir,sig+pa,sig*max(-d.y,0.02)+pa);
  m.rgb=mix(m.rgb,rough,smoothstep(18.,45.,sigPx));
  float cover;
  vec3 refl=landBackdrop(azR,altR,sqrt(pa*pa+sig*sig),m.rgb,skyAvg,horizon,cover);
  refl=mix(refl,skyAvg*vec3(0.009,0.007,0.005),m.a);
  skyShare=F*(1.-max(cover,m.a));
  vec3 body=skyAvg*vec3(0.006,0.008,0.007)*uFgBright;
  vec3 col=F*refl+(1.-F)*body;
  return groundFog(col,azm,t,pa,skyAvg,horizon);
}
void main(){
  vec2 gp=gl_FragCoord.xy+uFragOffset;
  ivec2 tp=ivec2(gp-uTileOrigin+uMargin);
  float pa,cz; vec3 d=camRay(gp,pa,cz);
  if(pa<0.){ o=vec4(0.,0.,0.,1.); return; }
  float azm=atan(d.x,d.z), alt=asin(clamp(d.y,-1.,1.));
  vec3 skyAvg=textureLod(uEnv,vec2(0.5),10.).rgb;
  vec3 sky=texelFetch(uSky,tp,0).rgb+texelFetch(uStars,tp,0).rgb;
  float tw=d.y<0.?uCamH/-d.y:1e9;
  vec3 col;
  float blackWeight=1.;
  float rt=rockTop(azm);
  float rockDist=uCamH/tan(max(-uRockBase,1e-5));
  vec3 horizon=textureLod(uEnv,envUV(azm,0.004),3.).rgb;
  float tb=1e9, s=0.;
  if(uBeachD>0. && d.y<0.){
    float sd=dot(d.xz,uFwdH);
    float den=d.y+uSlope*sd;
    if(den<0.){ tb=(uSlope*uBeachD-uCamH)/den; s=tb*sd; }
    if(tb<=0.) tb=1e9;
  }
  float tSurf=min(tb,tw);
  float lt=landTop(azm);
  float lrel=max(atan(sin(azm-uLandA.y),cos(azm-uLandA.y))*uLandA.x,0.);
  float ldist=uLandA.w/(1.+lrel*3.);
  bool landPix=alt<lt && tSurf>ldist;
  bool rockPix=rt>0. && alt<uRockBase+rt && tSurf>rockDist;
  if(uLandscape==1){
    float groundCoverage;
    bool lakeOn=uLake.x>0.&&d.y<0.;
    col=dryLandscape(d,azm,alt,pa,lakeOn?vec3(0.):sky,skyAvg,horizon,groundCoverage);
    if(lakeOn){
      float u, shore=lakeShoreAt(azm,u);
      float shoreAlt=-atan(uCamH/shore);
      float lc=clamp((alt-shoreAlt)/pa+0.5,0.,1.);
      /* a damp band just on the shore side of the waterline, darker soil that mirrors some sky */
      float wetBand=clamp((alt-(-atan(uCamH/max(shore-0.12,0.3))))/pa,0.,1.)*(1.-lc)*(0.5+vnoise2(vec2(u*3.,uLake.z)));
      col=mix(col,col*0.85+horizon*0.012*uFgBright,clamp(wetBand,0.,1.));
      if(lc>0.){
        float F,skyShare; vec3 w=lakeWater(d,gp,azm,alt,pa,skyAvg,horizon,F,skyShare);
        /* the sky black point applies only to reflected sky, not to reflected ridges or trees */
        col=mix(col,w,lc); groundCoverage=mix(groundCoverage,1.-skyShare,lc);
      }
    }
    float treeCoverage=texelFetch(uStars,tp,0).a;
    col=mix(col,skyAvg*vec3(0.009,0.007,0.005)*uFgBright,treeCoverage);
    blackWeight=1.-max(groundCoverage,treeCoverage);
  } else if(landPix){
    float edge=(lt-alt)/pa;
    vec2 lq=vec2(azm,alt)*ldist;
    float tex=fbm2f(lq*0.7,pa*ldist*0.7);
    float strata=vnoise2(vec2(lq.x*0.15,lq.y*3.));
    vec3 lc=skyAvg*0.035*(0.35+tex*0.9+0.35*strata)*vec3(1.,0.97,0.92);
    lc+=horizon*0.07*exp(-edge/1.5);
    lc=mix(lc,horizon,(1.-exp(-ldist/uFogDist))*0.6);
    float bf=exp(-abs(alt+atan(uCamH/ldist))/(pa*4.+1e-4))*uSurf;
    lc=mix(lc,skyAvg*0.5,clamp(bf*(0.3+0.7*vnoise2(vec2(azm*4000.,1.))),0.,0.8));
    col=mix(d.y>=0.?sky:lc,lc,clamp(edge,0.,1.));
  } else if(rockPix){
    float edge=(uRockBase+rt-alt)/pa;
    float tex=vnoise2(vec2(azm,alt)*2400.)*0.6+vnoise2(vec2(azm,alt)*700.)*0.4;
    vec3 rc=skyAvg*0.045*(0.55+0.8*tex);
    rc+=horizon*0.12*exp(-edge/2.5);
    float fogT=1.-exp(-rockDist/uFogDist);
    rc=mix(rc,horizon,fogT*0.7);
    float baseFoam=exp(-max(alt-uRockBase,0.)/(pa*6.))*uSurf*0.5;
    rc=mix(rc,skyAvg*0.55,clamp(baseFoam*(0.5+vnoise2(vec2(azm*3000.,0.))),0.,1.));
    col=mix(d.y>=0.?sky:rc,rc,clamp(edge,0.,1.));
  } else if(d.y>=0.){
    col=sky;
    float ht=hillsTop(azm);
    if(ht>0.){ float hv=0.6+0.25*vnoise2(vec2(azm,alt)*300.); col=mix(col,horizon*hv,clamp((ht-alt)/pa,0.,1.)*0.85); }
  } else {
    if(tb<tw){
      vec3 p=d*tb;
      float along=dot(p.xz,vec2(uFwdH.y,-uFwdH.x));
      float u=uBeachD-s-(vnoise2(vec2(along*0.18,1.3))-0.5)*1.2*uSurf;
      float fp=tb*pa/max(-d.y,0.05);
      float lace=fbm2f(vec2(along,s)*vec2(0.9,2.2),fp);
      float swW=0.4+1.4*uSurf;
      float film=1.-smoothstep(0.,swW,u+(lace-0.5)*swW*1.2);
      float wet=mix(0.35,1.,1.-smoothstep(0.,4.,u));
      col=pebbles(p.xz,fp,d,wet,skyAvg);
      vec3 wcol=water(d,p,tb,pa,max(-u,0.),skyAvg);
      col=mix(col,wcol,film*0.95);
      float edgeFoam=exp(-abs(u-(lace-0.45)*swW*1.4)/(0.05+fp))*uSurf;
      col=mix(col,skyAvg*0.55,clamp(edgeFoam*0.6,0.,0.9));
    } else {
      vec3 p=d*tw;
      float shoreDist=uBeachD>0.?dot(p.xz,uFwdH)-uBeachD:1e4;
      col=water(d,p,tw,pa,shoreDist,skyAvg);
      col=mix(col,horizon,(1.-exp(-tw/uFogDist))*0.9);
    }
  }
  /* camera */
  col*=uExpo*uWB;
  col=max(col-uBlack*blackWeight*uExpo*uWB*vec3(0.10,0.11,0.13),0.);
  float L=dot(col,vec3(.2126,.7152,.0722));
  col=max(mix(vec3(L),col,uSat),0.);
  col*=mix(1.,cz*cz*cz*cz,uVig);
  ivec2 ip=ivec2(gp)+ivec2(1<<20);
  float nl=gauss(ip,101);
  vec3 nc=vec3(gauss(ip,211),gauss(ip,307),gauss(ip,401));
  col+=uGrain*0.035*sqrt(col+0.0006)*(nl+0.45*nc);
  col=max(col,0.);
  col=pow(col/0.18+1e-6,vec3(uContrast))*0.18;
  col=aces(col);
  col=mix(col*12.92,1.055*pow(col,vec3(1./2.4))-0.055,step(0.0031308,col));
  col+=(hash2(ip+ivec2(0,99))-0.5)/255.;
  o=vec4(col,1.);
}`;
