"use strict";
/* ------------------------------------------------------------------ star field */
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function bvTemp(bv){ bv=Math.max(-0.4,Math.min(2,bv)); return 4600*(1/(0.92*bv+1.7)+1/(0.92*bv+0.62)); }
function buildStars(seed,real){
  const rnd=mulberry(seed*7919+13);
  const MLIM=Math.min(12.2,Math.max(11,Math.ceil((P.maglim+0.4)*2)/2)), N=Math.round(Math.pow(10,0.44*MLIM+1.07));
  const data=new Float32Array(N*7);
  const TT=tr(T_GAL);
  const lap=s=>{ const u=rnd()-0.5; return -s*Math.sign(u)*Math.log(1-2*Math.abs(u)); };
  const gau=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd());
  const lut=[]; for(let i=0;i<=200;i++){ const c=bbLin(2400+i*150); const L=0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; lut.push(c.map(x=>x/L)); }
  for(let i=0;i<N;i++){
    let m=MLIM+Math.log10(rnd()+1e-12)/0.44; if(m<-1.4) m=-1.4+rnd()*0.6;
    if(real && m<8.0) m=8.0+rnd()*rnd()*2.;   /* the real catalogue supplies everything brighter than mag 8 */
    const pPlane=Math.min(0.72,Math.max(0.12,0.12+0.075*(m-2))), pBulge=m>7?0.07*(m-7)/4:0;
    const r=rnd(); let l,b,g;
    if(r<pBulge){ l=gau()*7*RAD; b=gau()*5*RAD; }
    else if(r<pBulge+pPlane){ const sc=(22-15*Math.min(1,Math.max(0,(m-2)/9)))*RAD; b=lap(sc); l=rnd()<0.28?lap(40*RAD):rnd()*2*Math.PI; }
    else { const z=rnd()*2-1; b=Math.asin(z); l=rnd()*2*Math.PI; }
    b=Math.max(-Math.PI/2,Math.min(Math.PI/2,b));
    g=[Math.cos(b)*Math.cos(l),Math.cos(b)*Math.sin(l),Math.sin(b)];
    const e=apply(TT,g);
    const T=m<3.5?3400+16000*Math.pow(rnd(),1.7):(rnd()<0.12?3300+1200*rnd():4800+8500*Math.pow(rnd(),1.3));
    const c=lut[Math.min(200,Math.max(0,Math.round((T-2400)/150)))];
    const o=i*7; data[o]=e[0];data[o+1]=e[1];data[o+2]=e[2];data[o+3]=m;data[o+4]=c[0];data[o+5]=c[1];data[o+6]=c[2];
  }
  const extra=real?realAndClusterStars(lut,mulberry(seed*104729+5)):new Float32Array(0);
  const all=new Float32Array(data.length+extra.length); all.set(data); all.set(extra,data.length);
  gl.bindVertexArray(starVAO); gl.bindBuffer(gl.ARRAY_BUFFER,starBuf); gl.bufferData(gl.ARRAY_BUFFER,all,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,1,gl.FLOAT,false,28,12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,3,gl.FLOAT,false,28,16);
  gl.bindVertexArray(null);
  starCount=all.length/7; starSeed=seed; starReal=real; starMlim=MLIM;
}

function eqVec(raDeg,decDeg){ const a=raDeg*RAD, d=decDeg*RAD; return [Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)]; }
function realAndClusterStars(lut,rnd){
  const out=[]; const col=T=>lut[Math.min(200,Math.max(0,Math.round((T-2400)/150)))];
  const bin=atob(REAL_STARS_B64), u=new Uint16Array(bin.length/2);
  for(let i=0;i<u.length;i++) u[i]=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);
  for(let i=0;i<u.length;i+=4){
    const e=eqVec(u[i]/65535*360,u[i+1]/65535*180-90), c=col(bvTemp(u[i+3]/10000-1));
    out.push(e[0],e[1],e[2],u[i+2]/1000-2+200,c[0],c[1],c[2]);
  }
  for(let i=0;i<CLUSTERS.length;i+=5){
    const ra=CLUSTERS[i]/100, de=CLUSTERS[i+1]/100, V=CLUSTERS[i+2]/100, rad=CLUSTERS[i+3]/10/2/60*RAD, glob=CLUSTERS[i+4]===1;
    const c0=eqVec(ra,de), E=[-Math.sin(ra*RAD),Math.cos(ra*RAD),0], N=[-Math.sin(de*RAD)*Math.cos(ra*RAD),-Math.sin(de*RAD)*Math.sin(ra*RAD),Math.cos(de*RAD)];
    const Ftot=Math.pow(10,-0.4*V);
    /* globulars: mostly unresolved light in a compact Plummer-like ball; open clusters: a scatter of members with a few bright ones */
    const nRes=glob?Math.round(18+30*Math.min(1,Ftot/Math.pow(10,-2.4))):Math.round(Math.min(160,10+60*Math.sqrt(Ftot/Math.pow(10,-2.4))));
    const nGlow=glob?90:Math.round(nRes*0.6);
    const fGlow=glob?0.7:0.35, ws=[];
    for(let k=0;k<nRes;k++) ws.push(Math.pow(rnd()+0.02,glob?-0.9:-1.7));
    const wsum=ws.reduce((a,b)=>a+b,0);
    const place=(core)=>{ const u=rnd()*0.97; let r=core*Math.sqrt(u/(1-u)); r=Math.min(r,rad*1.1); const t=rnd()*2*Math.PI;
      const v=[c0[0]+r*(Math.cos(t)*E[0]+Math.sin(t)*N[0]),c0[1]+r*(Math.cos(t)*E[1]+Math.sin(t)*N[1]),c0[2]+r*(Math.cos(t)*E[2]+Math.sin(t)*N[2])];
      const n=Math.hypot(v[0],v[1],v[2]); return [v[0]/n,v[1]/n,v[2]/n]; };
    for(let k=0;k<nRes;k++){
      const f=Ftot*(1-fGlow)*ws[k]/wsum, m=-2.5*Math.log10(f), v=place(glob?rad*0.18:rad*0.45);
      const c=col(glob?4200+1800*rnd():3800+9000*Math.pow(rnd(),1.6)); out.push(v[0],v[1],v[2],m+200,c[0],c[1],c[2]);
    }
    for(let k=0;k<nGlow;k++){
      const m=-2.5*Math.log10(Ftot*fGlow/nGlow)+100, v=place(glob?rad*0.12:rad*0.4);
      const c=col(glob?5000:6500); out.push(v[0],v[1],v[2],m,c[0],c[1],c[2]);
    }
  }
  return new Float32Array(out);
}
