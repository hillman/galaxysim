"use strict";
/* ------------------------------------------------------------------ galaxy map: isophotes, catalogue dust and the SFD dust texture */
/* even-odd fill on the sphere: a pixel is inside a level when a ray from it to the south galactic pole
   crosses that level's rings an odd number of times; then a light blur turns the five steps into a ramp */
function isophoteLevels(){
  const N=DMW*DMH, sum=new Float32Array(N), tog=new Uint8Array((DMH+1)*DMW), lev=new Float32Array(N), tmp=new Float32Array(N);
  /* faint isophotes are soft-edged, bright ones tighter: blur radius per level, in pixels of 0.15° */
  const RAD_PX=[7,6,5,5,4];
  function boxH(src,dst,r){ const w=1/(2*r+1); for(let j=0;j<DMH;j++){ const o=j*DMW; let a=0; for(let k=-r;k<=r;k++) a+=src[o+((k+DMW)%DMW)];
      for(let i=0;i<DMW;i++){ dst[o+i]=a*w; a+=src[o+(i+r+1)%DMW]-src[o+(i-r+DMW)%DMW]; } } }
  function boxV(src,dst,r){ const w=1/(2*r+1); for(let i=0;i<DMW;i++){ let a=0; for(let k=-r;k<=r;k++) a+=src[Math.min(DMH-1,Math.max(0,k))*DMW+i];
      for(let j=0;j<DMH;j++){ dst[j*DMW+i]=a*w; a+=src[Math.min(DMH-1,j+r+1)*DMW+i]-src[Math.max(0,j-r)*DMW+i]; } } }
  MW_ISO.forEach((rings,li)=>{
    tog.fill(0);
    for(const r of rings){
      let l1=r[0]/100, b1=r[1]/100, L=r[0], B=r[1];
      for(let k=2;k<=r.length;k+=2){
        let l2,b2;
        if(k<r.length){ L+=r[k]; B+=r[k+1]; l2=L/100; b2=B/100; } else { l2=r[0]/100+(Math.round((L-r[0])/36000)*360); b2=r[1]/100; }
        if(l2!==l1){
          const c1=Math.ceil((l1+180)/DMS-0.5-1e-9), c2=Math.ceil((l2+180)/DMS-0.5-1e-9);
          const lo=Math.min(c1,c2), hi=Math.max(c1,c2);
          for(let ci=lo;ci<hi;ci++){
            const cl=-180+(ci+0.5)*DMS, t=(cl-l1)/(l2-l1), bb=b1+t*(b2-b1);
            const row=Math.min(Math.max(Math.ceil((bb+90)/DMS-0.5),0),DMH);
            tog[row*DMW+(((ci%DMW)+DMW)%DMW)]^=1;
          }
        }
        l1=l2; b1=b2;
      }
    }
    for(let i=0;i<DMW;i++){ let par=0; for(let j=0;j<DMH;j++){ par^=tog[j*DMW+i]; lev[j*DMW+i]=par; } }
    const r=RAD_PX[li]||2;
    for(let pass=0;pass<3;pass++){ boxH(lev,tmp,r); boxV(tmp,lev,r); }
    for(let q=0;q<N;q++) sum[q]+=lev[q];
  });
  const out=sum;
  return out;
}
const DMW=2400, DMH=1200, DMS=360/DMW;
let dustHPTex=null;
function loadDustHP(){
  return new Promise((resolve,reject)=>{
  dustHPTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,dustHPTex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RG8,1,1,0,gl.RG,gl.UNSIGNED_BYTE,new Uint8Array([93,0]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const im=new Image();
  im.onload=()=>{
    try{
      const c=document.createElement("canvas"); c.width=im.width; c.height=im.height;
      const x=c.getContext("2d",{willReadFrequently:true}); x.drawImage(im,0,0);
      const d=x.getImageData(0,0,im.width,im.height).data, n=im.width*im.height, r=new Uint8Array(n*2);
      for(let i=0;i<n;i++){ r[i*2]=d[i*4]; r[i*2+1]=d[i*4+1]; }
      gl.bindTexture(gl.TEXTURE_2D,dustHPTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RG8,im.width,im.height,0,gl.RG,gl.UNSIGNED_BYTE,r);
      dustHPReady=true; schedule("full");
      resolve();
    }catch(e){ reject(e); }
  };
  im.onerror=()=>reject(new Error("The embedded dust map could not be decoded."));
  im.src=DUST_HP_PNG;
  });
}
let dustHPReady=false;
let dustTex=null;
function buildDustMap(){
  const N=DMW*DMH, tau=new Float32Array(N), ha=new Float32Array(N), rn=new Float32Array(N);
  const OP=[0,0.22,0.36,0.55,0.8,1.1,1.45];
  function splat(arr,stride,target,amp){
    for(let o=0;o<arr.length;o+=stride){
      const l=arr[o], b=arr[o+1], A0=arr[o+2]/2, C0=arr[o+3]/2, A=Math.max(A0,0.2), C=Math.max(C0,0.2), pa=arr[o+4]*RAD;
      const k=amp(arr,o)*Math.min(1,Math.pow((A0*C0+0.003)/(A*C),0.4)), ext=A*2.2+0.1, sp=Math.sin(pa), cp=Math.cos(pa);
      const j0=Math.max(0,Math.floor((b-ext+90)/DMS)), j1=Math.min(DMH-1,Math.ceil((b+ext+90)/DMS));
      for(let j=j0;j<=j1;j++){
        const bc=-90+(j+0.5)*DMS, cb=Math.max(Math.cos(bc*RAD),0.02), db=bc-b;
        const span=ext/cb, i0=Math.floor((l-span+180)/DMS), i1=Math.ceil((l+span+180)/DMS);
        for(let i=i0;i<=i1;i++){
          const ii=((i%DMW)+DMW)%DMW, lc=-180+(i+0.5)*DMS;
          const dl=(((lc-l+540)%360)-180)*cb;
          const u=(dl*sp+db*cp)/A, v=(dl*cp-db*sp)/C, r2=u*u+v*v;
          if(r2>5) continue;
          target[j*DMW+ii]+=k*Math.exp(-1.1*r2);
        }
      }
    }
  }
  splat(CAT_DN,6,tau,(a,o)=>OP[a[o+5]]||0.5);
  const iso=isophoteLevels();
  splat(CAT_HII,5,ha,(a,o)=>0.5);
  splat(CAT_RN,5,rn,(a,o)=>0.6);
  const px=new Uint8Array(N*4);
  for(let q=0;q<N;q++){
    const t=2.8*(1-Math.exp(-tau[q]/2.8));
    px[q*4]=Math.min(255,Math.round(t/4*255));
    px[q*4+1]=Math.min(255,Math.round((1-Math.exp(-ha[q]))*255));
    px[q*4+2]=Math.min(255,Math.round((1-Math.exp(-rn[q]))*255));
    px[q*4+3]=Math.min(255,Math.round(iso[q]/5*255));
  }
  dustTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,dustTex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,DMW,DMH,0,gl.RGBA,gl.UNSIGNED_BYTE,px);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
