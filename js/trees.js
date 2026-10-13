"use strict";

let treeVAO, treeBuffer, treeCount=0, treeKey="", progTrees;

function buildTree(){
  const key=`${P.landSeed}:${P.treeType}`;
  if(key===treeKey) return;
  const random=mulberry((P.landSeed|0)*7919+127);
  const segments=[];
  const tips=[];
  const pine=P.treeType==="pine";
  const unit=vector=>{ const length=Math.hypot(...vector); return vector.map(value=>value/length); };
  function grow(start,direction,length,radius,depth){
    let position=start, heading=unit(direction);
    const bend=[(random()-0.5)*0.5,0.01+random()*0.06,(random()-0.5)*0.45];
    const nodes=[start];
    for(let step=0;step<5;step++){
      const nextHeading=unit(heading.map((value,axis)=>value+bend[axis]*0.22+(random()-0.5)*0.15));
      const next=position.map((value,axis)=>value+nextHeading[axis]*length/5);
      segments.push({start:position,end:next,base:radius*(1-step*0.09),tip:radius*(1-(step+1)*0.09)});
      position=next; heading=nextHeading; nodes.push(next);
    }
    if(depth<=0){ tips.push(position); return; }
    const count=depth>5?3:2+(random()<0.22?1:0);
    const phase=random()*Math.PI*2;
    for(let child=0;child<count;child++){
      const angle=phase+child*2.39996+(random()-0.5)*0.8;
      const spread=0.35+random()*0.7;
      const childDirection=unit([heading[0]*0.95+Math.cos(angle)*spread,heading[1]*0.82+(random()-0.35)*0.5,heading[2]*0.95+Math.sin(angle)*spread]);
      const node=child===0?5:2+Math.floor(random()*4);
      grow(nodes[node],childDirection,length*(0.57+random()*0.22),radius*(child===0?0.61:0.43+random()*0.14),depth-1);
    }
    if(depth>=3){
      const angle=random()*Math.PI*2;
      grow(nodes[1+Math.floor(random()*3)],[heading[0]*0.5+Math.cos(angle)*0.8,0.3+random()*0.5,heading[2]*0.5+Math.sin(angle)*0.8],length*(0.32+random()*0.15),radius*0.3,depth-2);
    }
  }
  if(pine){
    grow([0,0,0],[0.04,1,0],1,0.024,0);
    for(let level=0;level<22;level++){
      const height=0.16+level*0.037;
      const phase=random()*6.283;
      for(let arm=0;arm<5;arm++){
        const angle=phase+arm*1.257;
        grow([height*0.025,height,0],[Math.cos(angle),-0.16+random()*0.23,Math.sin(angle)],(1-height)*(0.3+random()*0.15),0.005*(1-height),3);
      }
    }
  } else {
    grow([0,-0.012,0],[0.08,1,0.02],0.29,0.025,0);
    const root=segments[segments.length-1].end;
    grow(root,[-0.7,0.7,0.13],0.3,0.017,8);
    grow(root,[0.29,1,-0.12],0.36,0.019,8);
    grow([root[0],root[1]*0.72,root[2]],[0.86,0.68,0.08],0.34,0.015,8);
  }
  if(P.treeType==="oak"||pine){
    for(const tip of tips){
      for(let leaf=0;leaf<10;leaf++){
        const offset=Array.from({length:3},()=> (random()-0.5)*(pine?0.025:0.055));
        const start=tip.map((value,axis)=>value+offset[axis]);
        const end=start.map((value,axis)=>value+(random()-0.5)*0.025+(axis===1?0.008:0));
        segments.push({start,end,base:pine?0.0035:0.004+random()*0.006,tip:0.0006});
      }
    }
  }
  const height=segments.reduce((highest,segment)=>Math.max(highest,segment.end[1]),0);
  const vertices=[];
  for(const segment of segments){
    const start=segment.start.map((value,axis)=>value/height*(axis===0&&!pine?1.12:1)), end=segment.end.map((value,axis)=>value/height*(axis===0&&!pine?1.12:1));
    for(const [along,side] of [[0,-1],[1,-1],[0,1],[0,1],[1,-1],[1,1]]){
      vertices.push(...start,...end,along,side,(along?segment.tip:segment.base)/height);
    }
  }
  if(!treeVAO){
    treeVAO=gl.createVertexArray(); treeBuffer=gl.createBuffer();
  }
  gl.bindVertexArray(treeVAO); gl.bindBuffer(gl.ARRAY_BUFFER,treeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  for(let attribute=0;attribute<3;attribute++){
    gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,36,attribute*12);
  }
  gl.bindVertexArray(null);
  treeCount=vertices.length/9; treeKey=key;
}

const VS_TREES=COMMON+`
in vec3 aStart,aEnd,aShape;
uniform vec3 uTree;
uniform float uCamH,uTreeMirror;
out float vEdge,vWidth;
vec3 treePoint(vec3 point){
  vec2 forward=vec2(sin(uTree.x),cos(uTree.x));
  vec2 right=vec2(forward.y,-forward.x);
  vec2 horizontal=forward*(uTree.y+point.z*uTree.z)+right*point.x*uTree.z;
  /* the mirror pass draws the tree's reflection in a lake, flipped about the water surface */
  return vec3(horizontal.x,(uTreeMirror>0.5?-point.y:point.y)*uTree.z-uCamH,horizontal.y);
}
void main(){
  gl_Position=vec4(-10.,-10.,0.,1.); vEdge=0.; vWidth=1.;
  vec3 start=treePoint(aStart),end=treePoint(aEnd);
  vec2 startPixel,endPixel; float startScale,endScale;
  if(!camProject(normalize(start),startPixel,startScale)||!camProject(normalize(end),endPixel,endScale)) return;
  if(uProj==2 && abs(endPixel.x-startPixel.x)>PI*uFocal/uMmPerPx) return;
  vec2 axis=normalize(endPixel-startPixel+vec2(1e-6));
  float radius=aShape.z*uTree.z/mix(length(start)*startScale,length(end)*endScale,aShape.x);
  vWidth=radius; vEdge=aShape.y*(radius+0.7);
  vec2 pixel=mix(startPixel,endPixel,aShape.x)+vec2(-axis.y,axis.x)*vEdge;
  pixel+=axis*(aShape.x*2.-1.)*0.35;
  gl_Position=vec4((pixel-uTileOrigin+uMargin)/uTexSize*2.-1.,0.,1.);
}
`;
const FS_TREES=`#version 300 es
precision highp float;
in float vEdge,vWidth;
out vec4 o;
void main(){
  float coverage=clamp(vWidth+0.5-abs(vEdge),0.,1.);
  o=vec4(0.,0.,0.,coverage);
}
`;

function drawTree(uniformValues,tileUniforms,mirror){
  if(P.landscape!=="land"||P.treeHeight<0.1) return;
  setU(progTrees,uniformValues); setU(progTrees,tileUniforms); setU(progTrees,{uTreeMirror:["f",mirror?1:0]});
  gl.colorMask(false,false,false,true);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(treeVAO); gl.drawArrays(gl.TRIANGLES,0,treeCount); gl.bindVertexArray(null);
  gl.colorMask(true,true,true,true); gl.disable(gl.BLEND);
}
