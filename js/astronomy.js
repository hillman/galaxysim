"use strict";
/* ------------------------------------------------------------------ astronomy */
const T_GAL=[[-0.0548755604,-0.8734370902,-0.4838350155],[0.4941094279,-0.4448296300,0.7469822445],[-0.8676661490,-0.1980763734,0.4559837762]];
function mul(A,B){ const C=[[0,0,0],[0,0,0],[0,0,0]]; for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)C[i][j]+=A[i][k]*B[k][j]; return C; }
function tr(A){ return [[A[0][0],A[1][0],A[2][0]],[A[0][1],A[1][1],A[2][1]],[A[0][2],A[1][2],A[2][2]]]; }
function colMajor(A){ return new Float32Array([A[0][0],A[1][0],A[2][0],A[0][1],A[1][1],A[2][1],A[0][2],A[1][2],A[2][2]]); }
function apply(A,v){ return [A[0][0]*v[0]+A[0][1]*v[1]+A[0][2]*v[2],A[1][0]*v[0]+A[1][1]*v[1]+A[1][2]*v[2],A[2][0]*v[0]+A[2][1]*v[1]+A[2][2]*v[2]]; }
const RAD=Math.PI/180;
function lstHours(doy,time){ return ((6.656+0.0657098*(doy-1)+1.00274*time)%24+24)%24; }
function observer(){
  const th=lstHours(P.doy,P.time)*15*RAD, ph=P.lat*RAD;
  const E=[-Math.sin(th),Math.cos(th),0], Z=[Math.cos(ph)*Math.cos(th),Math.cos(ph)*Math.sin(th),Math.sin(ph)], N=[-Math.sin(ph)*Math.cos(th),-Math.sin(ph)*Math.sin(th),Math.cos(ph)];
  const M=[[E[0],Z[0],N[0]],[E[1],Z[1],N[1]],[E[2],Z[2],N[2]]]; // eq = M * local
  return {eqFromLocal:M, localFromEq:tr(M), galFromLocal:mul(T_GAL,M)};
}
function gcAltAz(obs){
  const a=266.405*RAD, d=-28.936*RAD;
  const l=apply(obs.localFromEq,[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)]);
  return {alt:Math.asin(l[1])/RAD, az:((Math.atan2(l[0],l[2])/RAD)+360)%360};
}

/* aim: solve solar time + heading that put the galactic centre at (coreAlt, coreOff) */
let aimNote="";
function applyAim(){
  aimNote="";
  if(!P.aimCore) return;
  const dec=-28.936, ra=266.405/15, ph=P.lat*RAD;
  const maxAlt=90-Math.abs(P.lat-dec);
  let alt=P.coreAlt;
  if(maxAlt<=-1){ aimNote="The galactic centre never rises at this latitude."; return; }
  if(alt>maxAlt-0.05){ alt=maxAlt-0.05; aimNote=`At this latitude the core peaks at ${maxAlt.toFixed(0)}°.`; }
  const c=(Math.sin(alt*RAD)-Math.sin(ph)*Math.sin(dec*RAD))/(Math.cos(ph)*Math.cos(dec*RAD));
  const H=Math.acos(Math.max(-1,Math.min(1,c)))/RAD/15*(P.coreSide<0?-1:1);
  let t=(((ra+H-6.656-0.0657098*(P.doy-1))/1.00274)%24+24)%24;
  if(t<12) t+=24;
  P.time=Math.round(t*100)/100;
  const gc=gcAltAz(observer());
  P.heading=Math.round((((gc.az-P.coreOff)%360)+360)%360*10)/10;
  const tt=t%24;
  if(tt>4.5&&tt<20.5) aimNote=`That puts the core there at ${fmtTime(t)} solar time, in daylight or twilight on ${fmtDate(P.doy)}. Try a date between May and August.`;
}
