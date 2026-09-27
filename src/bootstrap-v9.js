// V9 bootstrap: preload the generated middle-finger sprite, then let the existing
// game build its hand obstacle canvas from that artwork instead of the older
// procedural hand. Pencil/knife canvases are left untouched.
const HAND_URL = './assets/hand-middle-finger-2.png';

async function loadImage(src){
  const img=new Image();
  img.decoding='async';
  img.src=src;
  try{await img.decode()}catch{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
  }
  return img;
}

function alphaBounds(img){
  const c=document.createElement('canvas');
  c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;
  const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(img,0,0);
  const d=x.getImageData(0,0,c.width,c.height).data;
  let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
  for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
    if(d[(y*c.width+xx)*4+3]>12){if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(y<minY)minY=y;if(y>maxY)maxY=y}
  }
  if(maxX<minX||maxY<minY)return {x:0,y:0,w:c.width,h:c.height};
  return {x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
}

function drawGeneratedHand(target,img){
  const ctx=target.getContext('2d');
  const b=alphaBounds(img);
  target.width=420;target.height=1500;
  ctx.clearRect(0,0,420,1500);

  // Fit the accurate hand to the obstacle width while keeping its proportions.
  const handW=390;
  const handH=handW*b.h/b.w;
  const handX=(420-handW)/2;
  const handY=8;

  // Extend the lower wrist/forearm first so the long obstacle still reads as one arm.
  // A narrow slice from the bottom-centre of the generated sprite provides matching
  // skin colour/shading instead of inventing a second visual style.
  const sliceH=Math.max(24,Math.round(b.h*.10));
  const sliceW=Math.max(40,Math.round(b.w*.32));
  const sx=Math.round(b.x+(b.w-sliceW)/2),sy=Math.round(b.y+b.h-sliceH);
  const armTop=Math.min(360,Math.max(250,handY+handH*.72));
  const armW=142,armX=(420-armW)/2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(armX,armTop,armW,1500-armTop+24,52);
  ctx.clip();
  ctx.drawImage(img,sx,sy,sliceW,sliceH,armX,armTop,armW,1500-armTop+28);
  // Soft highlight keeps the stretched forearm from looking flat.
  const hi=ctx.createLinearGradient(armX,0,armX+armW,0);
  hi.addColorStop(0,'rgba(92,42,40,.18)');hi.addColorStop(.32,'rgba(255,235,210,.14)');hi.addColorStop(.72,'rgba(255,255,255,.05)');hi.addColorStop(1,'rgba(82,38,38,.20)');
  ctx.fillStyle=hi;ctx.fillRect(armX,armTop,armW,1500-armTop+24);
  ctx.restore();

  // Draw the clean generated hand over the arm junction.
  ctx.drawImage(img,b.x,b.y,b.w,b.h,handX,handY,handW,handH);
}

try{
  const handImage=await loadImage(HAND_URL);
  const originalGetContext=HTMLCanvasElement.prototype.getContext;
  let obstacleCanvasCount=0;

  HTMLCanvasElement.prototype.getContext=function(type,...args){
    const ctx=originalGetContext.call(this,type,...args);
    if(type!=='2d'||!ctx||this.width!==420||this.height!==1500)return ctx;
    obstacleCanvasCount++;
    // obstacleTex() is created in a fixed order: pencil, knife, hand.
    if(obstacleCanvasCount!==3)return ctx;

    drawGeneratedHand(this,handImage);

    // Keep the raster art intact while obstacleTex('hand') executes its old fallback
    // drawing commands. Property assignments are allowed; drawing/path calls are ignored.
    const ignored=new Set(['beginPath','closePath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','arc','ellipse','rect','roundRect','fillRect','strokeRect','clearRect','fill','stroke','drawImage','save','restore','translate','rotate','scale','transform','setTransform']);
    return new Proxy(ctx,{
      get(target,prop){
        if(ignored.has(prop))return ()=>{};
        const v=Reflect.get(target,prop,target);
        return typeof v==='function'?v.bind(target):v;
      },
      set(target,prop,value){Reflect.set(target,prop,value,target);return true}
    });
  };

  await import('./game-v8.js');
  HTMLCanvasElement.prototype.getContext=originalGetContext;
}catch(err){
  console.warn('Generated hand sprite unavailable; falling back to procedural hand.',err);
  await import('./game-v8.js');
}
