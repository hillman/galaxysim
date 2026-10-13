"use strict";
/* planets: JPL Keplerian elements for approximate positions (valid 1800–2050), geocentric, J2000 equatorial.
   Solar time is used as UT, which moves a planet by well under a degree. Magnitudes from the classic phase-angle formulas. */
const PL_EL={
  Mercury:[[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593],[0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081]],
  Venus:[[0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255],[0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418]],
  Earth:[[1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0],[0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0]],
  Mars:[[1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],[0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343]],
  Jupiter:[[5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909],[-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106]],
  Saturn:[[9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448],[-0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794]],
};
const PL_LOOK={ Mercury:{T:5200,mag:(i)=>-0.42+0.0380*i-0.000273*i*i+0.000002*i*i*i},
  Venus:{T:6400,mag:(i)=>-4.40+0.0009*i+0.000239*i*i-0.00000065*i*i*i},
  Mars:{T:3700,mag:(i)=>-1.52+0.016*i}, Jupiter:{T:6000,mag:(i)=>-9.40+0.005*i}, Saturn:{T:5600,mag:(i)=>-8.88+0.044*i} };
function helio(n,T){
  const [e0,r]=PL_EL[n]; const v=e0.map((x,k)=>x+r[k]*T); let [a,e,I,L,w,O]=v;
  const M=((((L-w)%360)+540)%360-180)*RAD, om=(w-O)*RAD; I*=RAD; O*=RAD;
  let E=M+e*Math.sin(M); for(let k=0;k<8;k++) E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  const xp=a*(Math.cos(E)-e), yp=a*Math.sqrt(1-e*e)*Math.sin(E);
  const co=Math.cos(om), so=Math.sin(om), cO=Math.cos(O), sO=Math.sin(O), cI=Math.cos(I), sI=Math.sin(I);
  return [(co*cO-so*sO*cI)*xp+(-so*cO-co*sO*cI)*yp, (co*sO+so*cO*cI)*xp+(-so*sO+co*cO*cI)*yp, so*sI*xp+co*sI*yp];
}
function planetsAt(jd){
  const T=(jd-2451545)/36525, ea=helio("Earth",T), eps=23.43928*RAD, out=[];
  for(const n of ["Mercury","Venus","Mars","Jupiter","Saturn"]){
    const h=helio(n,T), g=[h[0]-ea[0],h[1]-ea[1],h[2]-ea[2]];
    const q=[g[0],g[1]*Math.cos(eps)-g[2]*Math.sin(eps),g[1]*Math.sin(eps)+g[2]*Math.cos(eps)];
    const D=Math.hypot(...q), r=Math.hypot(...h), Re=Math.hypot(...ea);
    const ph=Math.acos(Math.max(-1,Math.min(1,(r*r+D*D-Re*Re)/(2*r*D))))/RAD;
    out.push({name:n,eq:q.map(x=>x/D),mag:PL_LOOK[n].mag(ph)+5*Math.log10(r*D),T:PL_LOOK[n].T});
  }
  return out;
}
function julianDay(){ return Date.UTC(P.year|0,0,1)/86400000+2440587.5+(P.doy-1)+P.time/24; }
function updatePlanets(){
  if(!planetBuf) return;
  planetInfo=P.planets?planetsAt(julianDay()):[];
  const d=new Float32Array(7*8);
  planetInfo.forEach((p,k)=>{ const c=bbLin(p.T), L=0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
    d.set([p.eq[0],p.eq[1],p.eq[2],p.mag+200,c[0]/L,c[1]/L,c[2]/L],k*7); });
  gl.bindBuffer(gl.ARRAY_BUFFER,planetBuf); gl.bufferSubData(gl.ARRAY_BUFFER,0,d);
  planetCount=planetInfo.length;
}
