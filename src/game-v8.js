import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import { HERO_IMAGE_URL } from './hero-data.js';
import { HURT_AUDIO_URL } from './audio-hurt.js';
import { LAUGH_AUDIO_URL } from './audio-laugh.js';
import { JUMP_AUDIO_URL } from './audio-jump-v8.js';
import { BGM_MIDI_BASE64, BGM_LOOP_SECONDS, BGM_NOTES } from './bgm-midi-v8.js';

const W=9,H=16,HW=4.5,HH=8,PX=-1.72,PW=1.075,PH=1.435,HITW=.60,HITH=.78,OW=1.78,OH=11.8;
const GRAV=-15.2,JUMP=5.72,MAX_HP=3,MOVE_SCORE=20,START_Y=-1.25;
const PICKUP_GUARANTEE={poison:5,dorayaki:10,star:15},STAR_SECONDS=5;
const shell=document.querySelector('#game-shell'),host=document.querySelector('#canvas-host');
const scoreEl=document.querySelector('#score'),bestEl=document.querySelector('#best'),heartsEl=document.querySelector('#hearts');
const finalScoreEl=document.querySelector('#final-score'),finalBestEl=document.querySelector('#final-best');
const startPanel=document.querySelector('#start-panel'),overPanel=document.querySelector('#game-over-panel');
const startBtn=document.querySelector('#start-button'),restartBtn=document.querySelector('#restart-button');

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(shell.clientWidth,shell.clientHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-HW,HW,HH,-HH,.1,100);
camera.position.z=10;
const obstacleLayer=new THREE.Group(),pickupLayer=new THREE.Group(),startLayer=new THREE.Group(),fxLayer=new THREE.Group();
scene.add(obstacleLayer,pickupLayer,startLayer,fxLayer);

const rand=(a,b)=>a+Math.random()*(b-a);
function tex(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;return t}
function rr(x,a,b,w,h,r){x.beginPath();x.roundRect(a,b,w,h,r)}
function outline(x,draw,c='#33284d',w=8){for(let i=0;i<2;i++){x.save();x.translate(rand(-1.1,1.1),rand(-1.1,1.1));x.strokeStyle=i?`${c}66`:c;x.lineWidth=w-i*3;draw();x.stroke();x.restore()}}

function bgTex(){
  const c=document.createElement('canvas');c.width=720;c.height=1280;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,1280);g.addColorStop(0,'#070d1b');g.addColorStop(.54,'#10162c');g.addColorStop(1,'#231329');
  x.fillStyle=g;x.fillRect(0,0,720,1280);
  for(const [cx,cy,col,r] of [[130,180,'rgba(86,85,255,.16)',230],[585,390,'rgba(33,190,255,.12)',210],[135,1000,'rgba(255,55,116,.12)',220]]){
    const q=x.createRadialGradient(cx,cy,0,cx,cy,r);q.addColorStop(0,col);q.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=q;x.fillRect(cx-r,cy-r,r*2,r*2)
  }
  for(let i=0;i<95;i++){x.fillStyle=`rgba(255,255,255,${rand(.14,.55)})`;x.beginPath();x.arc(rand(0,720),rand(0,1280),rand(.8,3.2),0,Math.PI*2);x.fill()}
  return tex(c)
}
const bg=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:bgTex(),depthWrite:false}));bg.position.z=-8;scene.add(bg);

function obstacleTex(type){
  const c=document.createElement('canvas');c.width=420;c.height=1500;const x=c.getContext('2d');
  x.lineJoin=x.lineCap='round';x.shadowColor='rgba(0,0,0,.32)';x.shadowBlur=18;x.shadowOffsetY=8;
  if(type==='pencil'){
    x.fillStyle='#e9bb86';x.beginPath();x.moveTo(210,8);x.lineTo(80,270);x.lineTo(340,270);x.closePath();x.fill();
    outline(x,()=>{x.beginPath();x.moveTo(210,8);x.lineTo(80,270);x.lineTo(340,270);x.closePath()},'#66536f');
    x.fillStyle='#aaa0b4';x.beginPath();x.moveTo(210,8);x.lineTo(172,92);x.lineTo(248,92);x.closePath();x.fill();
    outline(x,()=>{x.beginPath();x.moveTo(210,8);x.lineTo(172,92);x.lineTo(248,92);x.closePath()},'#efe4ef',5);
    const g=x.createLinearGradient(80,0,340,0);g.addColorStop(0,'#f9a900');g.addColorStop(.5,'#ffe967');g.addColorStop(1,'#f07b00');
    x.fillStyle=g;rr(x,80,250,260,980,30);x.fill();outline(x,()=>rr(x,80,250,260,980,30));
    x.fillStyle='#becbdd';rr(x,80,1210,260,90,18);x.fill();x.fillStyle='#f65374';rr(x,94,1285,232,170,30);x.fill();
  }else if(type==='knife'){
    // Snap-off utility blade: one slanted cutting tip, parallel sides and scored segments.
    const metal=x.createLinearGradient(145,0,280,0);metal.addColorStop(0,'#8cabc2');metal.addColorStop(.32,'#f5fcff');metal.addColorStop(1,'#b4cbd9');
    const blade=()=>{x.beginPath();x.moveTo(278,8);x.lineTo(146,104);x.lineTo(146,355);x.lineTo(278,355);x.closePath()};
    x.fillStyle=metal;blade();x.fill();outline(x,blade,'#526879',7);
    x.strokeStyle='#758f9f';x.lineWidth=4;
    for(const y of [100,185,270]){x.beginPath();x.moveTo(150,y+88);x.lineTo(274,y);x.stroke()}
    x.strokeStyle='#ffffff';x.lineWidth=5;x.beginPath();x.moveTo(278,12);x.lineTo(150,105);x.lineTo(150,350);x.stroke();
    const grip=x.createLinearGradient(86,0,330,0);grip.addColorStop(0,'#d48a15');grip.addColorStop(.35,'#ffe36c');grip.addColorStop(1,'#edab24');
    const body=()=>{x.beginPath();x.moveTo(127,296);x.lineTo(288,296);x.quadraticCurveTo(326,316,326,374);x.lineTo(326,1394);x.quadraticCurveTo(326,1472,264,1472);x.lineTo(141,1472);x.quadraticCurveTo(88,1465,88,1400);x.lineTo(88,408);x.quadraticCurveTo(88,336,127,296);x.closePath()};
    x.fillStyle=grip;body();x.fill();outline(x,body,'#63471f',9);
    x.shadowColor='transparent';x.fillStyle='#465465';rr(x,136,306,152,78,10);x.fill();
    x.fillStyle='#233146';rr(x,164,405,96,773,27);x.fill();
    x.strokeStyle='#7d90a0';x.lineWidth=5;for(let y=433;y<1145;y+=35){x.beginPath();x.moveTo(177,y);x.lineTo(248,y);x.stroke()}
    x.fillStyle='#586a7b';rr(x,151,602,121,168,20);x.fill();x.strokeStyle='#172535';x.lineWidth=6;rr(x,151,602,121,168,20);x.stroke();
    x.strokeStyle='#c2d1dc';x.lineWidth=6;for(let y=625;y<754;y+=25){x.beginPath();x.moveTo(170,y);x.lineTo(252,y);x.stroke()}
    x.strokeStyle='#b67e1b';x.lineWidth=7;for(let y=840;y<1320;y+=56){x.beginPath();x.moveTo(107,y);x.lineTo(139,y+16);x.moveTo(283,y+16);x.lineTo(311,y);x.stroke()}
    x.fillStyle='#253449';rr(x,107,1344,201,102,24);x.fill();x.fillStyle='#9badbc';x.beginPath();x.arc(209,1395,21,0,Math.PI*2);x.fill();x.fillStyle='#172535';x.beginPath();x.arc(209,1395,11,0,Math.PI*2);x.fill();
  }else if(type==='hand'){
    // Back-of-fist middle finger: layered forearm, fist, knuckle rolls, raised finger and wrapping thumb.
    const skin=x.createLinearGradient(100,0,340,0);skin.addColorStop(0,'#c67c59');skin.addColorStop(.42,'#f8c49a');skin.addColorStop(.72,'#edac80');skin.addColorStop(1,'#bc7051');
    const fillPart=(draw,w=9)=>{x.fillStyle=skin;draw();x.fill();outline(x,draw,'#613d3c',w)};
    const forearm=()=>{x.beginPath();x.moveTo(162,308);x.quadraticCurveTo(152,314,152,340);x.lineTo(150,1500);x.lineTo(276,1500);x.lineTo(274,340);x.quadraticCurveTo(274,314,264,308);x.closePath()};
    const fist=()=>{x.beginPath();x.moveTo(122,170);x.quadraticCurveTo(102,238,118,300);x.quadraticCurveTo(126,330,146,332);x.lineTo(278,332);x.quadraticCurveTo(298,330,306,300);x.quadraticCurveTo(326,238,302,170);x.closePath()};
    const finger=()=>{x.beginPath();x.moveTo(181,192);x.lineTo(183,64);x.quadraticCurveTo(183,10,208,8);x.quadraticCurveTo(233,10,233,64);x.lineTo(235,192);x.closePath()};
    fillPart(forearm);fillPart(fist);
    x.shadowColor='transparent';
    // Curled index, ring and pinky rolls flank the raised finger.
    fillPart(()=>{rr(x,122,132,60,82,30)});fillPart(()=>{rr(x,236,132,58,78,29)});fillPart(()=>{rr(x,296,164,40,56,21)},7);
    fillPart(finger);
    x.fillStyle='#ffe0c5';rr(x,193,22,30,34,12);x.fill();x.strokeStyle='#a66650';x.lineWidth=4;rr(x,193,22,30,34,12);x.stroke();
    fillPart(()=>{rr(x,108,238,172,62,31)});
    x.strokeStyle='#a66650';x.lineWidth=5;
    x.beginPath();
    x.moveTo(132,158);x.quadraticCurveTo(152,166,172,156);
    x.moveTo(130,188);x.quadraticCurveTo(152,196,174,186);
    x.moveTo(246,156);x.quadraticCurveTo(266,164,288,154);
    x.moveTo(244,186);x.quadraticCurveTo(266,194,290,184);
    x.moveTo(302,188);x.quadraticCurveTo(316,194,330,186);
    x.moveTo(126,218);x.quadraticCurveTo(150,228,178,216);
    x.moveTo(242,214);x.quadraticCurveTo(266,224,290,212);
    x.stroke();
    x.lineWidth=4;
    x.beginPath();x.moveTo(185,74);x.quadraticCurveTo(208,82,231,74);x.moveTo(185,112);x.quadraticCurveTo(208,120,231,112);x.stroke();
    x.beginPath();x.moveTo(254,244);x.quadraticCurveTo(268,269,254,294);x.stroke();
    x.lineWidth=6;x.beginPath();x.moveTo(150,346);x.quadraticCurveTo(210,358,270,344);x.moveTo(152,364);x.quadraticCurveTo(210,375,268,362);x.stroke();
    x.strokeStyle='rgba(255,228,199,.34)';x.lineWidth=18;x.beginPath();x.moveTo(170,380);x.quadraticCurveTo(160,900,166,1480);x.stroke();
  }else{
    // Placeholder poles for the generated-art pillar types; bootstrap-v9 repaints
    // these canvases with the real sprites once they finish loading.
    const pole={winter:['#efe3c8','#9a7b52'],wig:['#e8c88f','#8a6a3c'],scream:['#ffb066','#e2601a'],geek:['#ff9e4a','#d1501a']}[type]||['#cfd6e6','#5d6b8a'];
    const g=x.createLinearGradient(105,0,315,0);g.addColorStop(0,pole[1]);g.addColorStop(.45,pole[0]);g.addColorStop(1,pole[1]);
    x.fillStyle=g;rr(x,132,0,156,1500,58);x.fill();outline(x,()=>rr(x,132,0,156,1500,58));
    x.fillStyle=pole[1];for(let y=560;y<1450;y+=232){rr(x,132,y,156,50,25);x.fill()}
  }
  x.shadowColor='transparent';return tex(c)
}
const obstacleTexs={pencil:obstacleTex('pencil'),knife:obstacleTex('knife'),hand:obstacleTex('hand'),winter:obstacleTex('winter'),wig:obstacleTex('wig'),scream:obstacleTex('scream'),geek:obstacleTex('geek')},types=Object.keys(obstacleTexs);

function pickupTex(type){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.lineJoin=x.lineCap='round';x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=14;x.shadowOffsetY=7;
  if(type==='dorayaki'){
    x.fillStyle='#f2a04c';x.beginPath();x.ellipse(128,82,84,45,0,0,Math.PI*2);x.fill();
    x.fillStyle='#6d2730';rr(x,60,112,136,42,18);x.fill();
    x.fillStyle='#c76539';x.beginPath();x.ellipse(128,164,84,45,0,0,Math.PI*2);x.fill();
    outline(x,()=>{x.beginPath();x.ellipse(128,123,92,87,0,0,Math.PI*2)},'#633843',7);
  }else if(type==='star'){
    x.shadowColor='#ffd83d';x.shadowBlur=20;
    const g=x.createLinearGradient(0,25,0,230);g.addColorStop(0,'#fff8b5');g.addColorStop(.5,'#ffe24f');g.addColorStop(1,'#ff9b22');
    x.fillStyle=g;x.strokeStyle='#b97719';x.lineWidth=8;x.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?45:102,px=128+Math.cos(a)*r,py=128+Math.sin(a)*r;if(i===0)x.moveTo(px,py);else x.lineTo(px,py)}
    x.closePath();x.fill();x.stroke();x.shadowColor='transparent';x.fillStyle='#594022';
    rr(x,103,104,13,34,6);x.fill();rr(x,140,104,13,34,6);x.fill();
  }else{
    const g=x.createLinearGradient(70,60,190,210);g.addColorStop(0,'#89ff70');g.addColorStop(1,'#10aa45');
    x.fillStyle=g;rr(x,72,66,112,140,25);x.fill();outline(x,()=>rr(x,72,66,112,140,25),'#14572d',7);
    x.fillStyle='#405167';rr(x,94,34,68,46,10);x.fill();x.fillStyle='#f3fff0';x.beginPath();x.arc(128,135,38,0,Math.PI*2);x.fill();
    x.strokeStyle='#1a5b31';x.lineWidth=10;x.beginPath();x.moveTo(108,116);x.lineTo(148,154);x.moveTo(148,116);x.lineTo(108,154);x.stroke();
  }
  return tex(c)
}
const pickupTexs={dorayaki:pickupTex('dorayaki'),poison:pickupTex('poison'),star:pickupTex('star')};

function cloudTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle='#ffd9e8dd';x.strokeStyle='#d78cae88';x.lineWidth=4;
  [[40,70,25],[64,52,31],[88,70,23]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill();x.stroke()});
  return tex(c)
}
function sparkleTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,0,64,64,58);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,224,239,.95)');g.addColorStop(.45,'rgba(255,130,195,.48)');g.addColorStop(1,'rgba(255,90,170,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);
  x.save();x.translate(64,64);x.fillStyle='#fff2f7';x.beginPath();x.moveTo(0,-45);x.quadraticCurveTo(7,-8,45,0);x.quadraticCurveTo(7,8,0,45);x.quadraticCurveTo(-7,8,-45,0);x.quadraticCurveTo(-7,-8,0,-45);x.fill();x.restore();
  return tex(c)
}
function dropTex(color,splat=false){
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.fillStyle=color;x.strokeStyle='#190d1e88';x.lineWidth=4;
  if(!splat){x.beginPath();x.moveTo(48,8);x.quadraticCurveTo(75,42,70,62);x.arc(48,62,22,0,Math.PI*2);x.fill();x.stroke()}
  else for(let i=0;i<5;i++){x.beginPath();x.arc(rand(24,72),rand(24,72),rand(8,16),0,Math.PI*2);x.fill();x.stroke()}
  return tex(c)
}
function crossGlowTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,0,64,64,58);g.addColorStop(0,'rgba(255,220,170,.95)');g.addColorStop(.4,'rgba(255,150,190,.55)');g.addColorStop(1,'rgba(255,120,180,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);
  x.fillStyle='#fff6ec';rr(x,57,36,14,56,7);x.fill();rr(x,36,57,56,14,7);x.fill();
  return tex(c)
}
function starRayTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,0,64,64,60);g.addColorStop(0,'rgba(255,248,200,1)');g.addColorStop(.3,'rgba(255,214,90,.8)');g.addColorStop(1,'rgba(255,170,30,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);
  x.save();x.translate(64,64);x.fillStyle='#fff2b0';x.beginPath();
  for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?18:60;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
  x.closePath();x.fill();x.restore();
  return tex(c)
}
function circleRingTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.strokeStyle='#ffffff';x.lineWidth=11;x.beginPath();x.arc(64,64,50,0,Math.PI*2);x.stroke();
  return tex(c)
}
function meteorTex(){
  const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');
  // Tapered streak: long tail fades to the left, bright head leads at the right end.
  const g=x.createLinearGradient(0,0,256,0);g.addColorStop(0,'rgba(120,190,255,0)');g.addColorStop(.5,'rgba(150,215,255,.45)');g.addColorStop(.82,'rgba(225,243,255,.9)');g.addColorStop(1,'rgba(255,255,255,1)');
  x.fillStyle=g;x.beginPath();x.moveTo(4,32);x.quadraticCurveTo(150,20,226,32);x.quadraticCurveTo(150,44,4,32);x.fill();
  const r=x.createRadialGradient(238,32,0,238,32,22);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.45,'rgba(210,240,255,.85)');r.addColorStop(1,'rgba(140,200,255,0)');
  x.fillStyle=r;x.fillRect(212,6,52,52);
  return tex(c)
}
const smokeTex=cloudTex(),glowTex=sparkleTex(),healFxTex=crossGlowTex(),starFxTex=starRayTex(),ringFxTex=circleRingTex(),bloodTex=dropTex('#ff234c'),poisonFxTex=dropTex('#48ff58',true),meteorMap=meteorTex();

function cliffTex(){
  const c=document.createElement('canvas');c.width=900;c.height=560;const x=c.getContext('2d');
  x.clearRect(0,0,c.width,c.height);
  const edge=[648,638,657,642,665,652,645,661,650,668,641];
  x.beginPath();x.moveTo(0,115);for(let i=0;i<edge.length;i++)x.lineTo(edge[i],115+i*38);x.lineTo(0,560);x.closePath();
  const g=x.createLinearGradient(0,90,0,560);g.addColorStop(0,'#66748d');g.addColorStop(.18,'#4e5a70');g.addColorStop(1,'#24293a');x.fillStyle=g;x.fill();
  x.strokeStyle='#9badc5';x.lineWidth=12;x.beginPath();x.moveTo(0,112);x.lineTo(632,112);x.stroke();
  x.strokeStyle='rgba(18,23,34,.55)';x.lineWidth=8;
  for(let i=0;i<22;i++){const ax=rand(30,620),ay=rand(155,520);x.beginPath();x.moveTo(ax,ay);x.lineTo(ax+rand(-55,55),ay+rand(20,75));x.stroke()}
  x.fillStyle='rgba(107,141,122,.8)';for(let i=0;i<36;i++){x.fillRect(rand(0,620),rand(88,118),rand(8,24),rand(5,12))}
  return tex(c)
}
function toiletTex(){
  const c=document.createElement('canvas');c.width=256;c.height=384;const x=c.getContext('2d');
  x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=16;x.shadowOffsetY=8;
  x.fillStyle='#63a8e6';x.beginPath();x.moveTo(38,76);x.lineTo(218,76);x.lineTo(230,344);x.lineTo(26,344);x.closePath();x.fill();
  x.fillStyle='#8fc6f2';x.beginPath();x.moveTo(26,76);x.lineTo(52,40);x.lineTo(204,40);x.lineTo(230,76);x.closePath();x.fill();
  x.strokeStyle='#245985';x.lineWidth=8;x.strokeRect(64,104,128,216);
  x.fillStyle='#2b6798';for(let i=0;i<4;i++)x.fillRect(92+i*18,58,10,8);
  x.fillStyle='#d9efff';x.beginPath();x.arc(128,140,19,0,Math.PI*2);x.fill();x.fillStyle='#3473aa';x.font='bold 18px sans-serif';x.textAlign='center';x.fillText('WC',128,146);
  x.fillStyle='#1f507d';x.beginPath();x.arc(170,212,7,0,Math.PI*2);x.fill();
  x.shadowColor='transparent';return tex(c)
}
const cliff=new THREE.Sprite(new THREE.SpriteMaterial({map:cliffTex(),transparent:true,depthTest:false}));
// Align the visible platform (texture row 112/560) with the player's feet.
const START_SURFACE_Y=START_Y-PH/2;
cliff.scale.set(7.0,4.35,1);cliff.position.set(-2.95,START_SURFACE_Y-4.35*(.5-112/560),.25);startLayer.add(cliff);
const toiletMap=toiletTex();
[[-4.15,.95],[-3.18,.88],[-2.38,.82]].forEach(([x,s],i)=>{
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:toiletMap,transparent:true,depthTest:false,opacity:.94-i*.06}));
  // The visible base is at row 344/384; exclude the transparent bottom margin.
  sp.scale.set(s,1.62*s,1);sp.position.set(x,START_SURFACE_Y+1.62*s*(344/384-.5),.55+i*.02);startLayer.add(sp)
});

const playerMat=new THREE.SpriteMaterial({transparent:true,depthTest:false,depthWrite:false});
const rainbowTime={value:-1};
playerMat.onBeforeCompile=shader=>{
  shader.uniforms.rainbowTime=rainbowTime;
  shader.fragmentShader='uniform float rainbowTime;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    #ifdef USE_MAP
    if(rainbowTime>=0.0){
      vec3 rainbow=0.5+0.5*cos(6.2831853*(vMapUv.y*0.85-rainbowTime*0.8+vec3(0.0,0.3333,0.6667)));
      float shade=dot(diffuseColor.rgb,vec3(0.299,0.587,0.114));
      diffuseColor.rgb=mix(diffuseColor.rgb,rainbow*(0.55+shade*0.65),0.85);
    }
    #endif`);
};
const player=new THREE.Sprite(playerMat);player.position.set(PX,START_Y,3);player.scale.set(PW,PH,1);scene.add(player);
new THREE.TextureLoader().load(HERO_IMAGE_URL,t=>{t.colorSpace=THREE.SRGBColorSpace;playerMat.map=t;playerMat.needsUpdate=true});

// Star invincibility countdown pinned above the hero's head.
const cdCanvas=document.createElement('canvas');cdCanvas.width=256;cdCanvas.height=128;
const cdCtx=cdCanvas.getContext('2d');
const countdownMat=new THREE.SpriteMaterial({map:tex(cdCanvas),transparent:true,depthTest:false,depthWrite:false});
const countdown=new THREE.Sprite(countdownMat);countdown.scale.set(1.05,.525,1);countdown.visible=false;scene.add(countdown);
let cdShown='';
function drawCountdown(text,blink){
  const x=cdCtx;x.clearRect(0,0,256,128);x.lineJoin=x.lineCap='round';
  x.fillStyle=blink?'#3a122dee':'#33284dd9';rr(x,14,30,228,68,34);x.fill();
  x.strokeStyle=blink?'#ff5d7d':'#9badc5';x.lineWidth=7;rr(x,14,30,228,68,34);x.stroke();
  x.fillStyle=blink?'#ff8ba3':'#ffe24f';x.strokeStyle=blink?'#ff5d7d':'#b97719';x.lineWidth=5;x.beginPath();
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?9:22,px=58+Math.cos(a)*r,py=64+Math.sin(a)*r;if(i===0)x.moveTo(px,py);else x.lineTo(px,py)}
  x.closePath();x.fill();x.stroke();
  x.fillStyle='#fff';x.font='bold 46px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,152,66);
  countdownMat.map.needsUpdate=true
}

const jumpAudio=new Audio(JUMP_AUDIO_URL);jumpAudio.preload='auto';jumpAudio.volume=.18;jumpAudio.load();
const hurtAudio=new Audio(HURT_AUDIO_URL);hurtAudio.preload='auto';hurtAudio.volume=.32;hurtAudio.load();
const laughAudio=new Audio(LAUGH_AUDIO_URL);laughAudio.preload='auto';laughAudio.volume=.55;laughAudio.load();
let jumpBuf=null,hurtBuf=null,laughBuf=null;
function playSfx(buf,el,vol){
  // Prefer the pre-decoded buffer (instant); HTML audio is the fallback for setups where fetch/decode failed (e.g. file://).
  if(buf&&audioCtx?.state==='running'){const s=audioCtx.createBufferSource();s.buffer=buf;const g=audioCtx.createGain();g.gain.value=vol;s.connect(g);g.connect(audioCtx.destination);s.start();return}
  try{el.pause();el.currentTime=0;el.volume=vol;const p=el.play();if(p?.catch)p.catch(()=>{})}catch{}
}
function playJump(){playSfx(jumpBuf,jumpAudio,.18)}
function playHurt(){playSfx(hurtBuf,hurtAudio,.32)}
function playLaugh(){playSfx(laughBuf,laughAudio,.55)}

let audioCtx=null,bgmMaster=null,bgmTimer=null,bgmStarted=false,nextBgmTime=0,starMusicOn=false,bgmSeq=null,bgmIdx=0;const bgmVoices=[];
function ensureAudio(){
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  if(!audioCtx){
    audioCtx=new C();
    bgmMaster=audioCtx.createGain();
    bgmMaster.gain.value=1.5;
    bgmMaster.connect(audioCtx.destination)
  }
  if(audioCtx.state==='suspended')void audioCtx.resume();
  return audioCtx
}
function withAudio(fn){
  const a=ensureAudio();if(!a)return;
  if(a.state==='running')fn(a);else a.resume().then(()=>fn(a)).catch(()=>{})
}
// Pre-decode the SFX at load (decodeAudioData runs while suspended) so the first hit never stalls on fetch+decode.
if(ensureAudio()){
  const decSfx=async u=>{try{return await audioCtx.decodeAudioData(await(await fetch(u)).arrayBuffer())}catch{return null}};
  decSfx(JUMP_AUDIO_URL).then(b=>{if(b)jumpBuf=b});
  decSfx(HURT_AUDIO_URL).then(b=>{if(b)hurtBuf=b});
  decSfx(LAUGH_AUDIO_URL).then(b=>{if(b)laughBuf=b});
}
function synthFail(){
  withAudio(a=>{
    const n=a.currentTime,master=a.createGain();master.gain.setValueAtTime(.0001,n);master.gain.exponentialRampToValueAtTime(.16,n+.025);master.gain.exponentialRampToValueAtTime(.0001,n+1.05);master.connect(a.destination);
    [[196,74,'sawtooth'],[147,55,'triangle'],[98,42,'square']].forEach(([f0,f1,type],i)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,n+i*.025);o.frequency.exponentialRampToValueAtTime(f1,n+.88);o.detune.setValueAtTime(i*7-6,n);g.gain.value=i===2?.18:.35;o.connect(g);g.connect(master);o.start(n+i*.025);o.stop(n+1.08)})
  })
}
function toneHeal(){
  withAudio(a=>{const n=a.currentTime;[540,700,870].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),d=i*.08;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,n+d);g.gain.exponentialRampToValueAtTime(.07,n+d+.015);g.gain.exponentialRampToValueAtTime(.0001,n+d+.15);o.connect(g);g.connect(a.destination);o.start(n+d);o.stop(n+d+.17)})})
}
function toneStar(){
  withAudio(a=>{const n=a.currentTime;[659,880,1175,1568].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),d=i*.055;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,n+d);g.gain.exponentialRampToValueAtTime(.08,n+d+.012);g.gain.exponentialRampToValueAtTime(.0001,n+d+.17);o.connect(g);g.connect(a.destination);o.start(n+d);o.stop(n+d+.19)})})
}
const midiHz=n=>440*Math.pow(2,(n-69)/12);
function scheduleMidiNote(a,e,base){
  // Star mode pitches the loop up a fifth and plays it 1.25x faster for the invincibility theme.
  const ts=starMusicOn?.8:1,shift=starMusicOn?7:0;
  const start=base+e.t*ts,dur=Math.max(.04,e.d*ts),vel=e.v/127;
  const o=a.createOscillator(),g=a.createGain(),lp=a.createBiquadFilter();
  if(e.c===0){o.type='triangle';lp.frequency.value=2400}
  else if(e.c===1){o.type='sine';lp.frequency.value=900}
  else if(e.c===2){o.type='triangle';lp.frequency.value=1700}
  else{o.type='sine';lp.frequency.value=3600}
  if(starMusicOn)lp.frequency.value*=1.4;
  o.frequency.value=midiHz(e.n+shift);
  const peak=(e.c===0?.052:e.c===1?.038:.022)*vel;
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),start+.018);g.gain.exponentialRampToValueAtTime(.0001,start+dur*.9);
  lp.type='lowpass';o.connect(lp);lp.connect(g);g.connect(bgmMaster);o.start(start);o.stop(start+dur+.04);
  let h=null,hg=null;
  if(e.c===0&&e.v>100){
    h=a.createOscillator();hg=a.createGain();h.type='sine';h.frequency.value=midiHz(e.n+12);hg.gain.setValueAtTime(.0001,start);hg.gain.exponentialRampToValueAtTime(.008*vel,start+.015);hg.gain.exponentialRampToValueAtTime(.0001,start+dur*.7);h.connect(hg);hg.connect(bgmMaster);h.start(start);h.stop(start+dur)
  }
  bgmVoices.push({o,g,h,hg,end:start+dur+.04})
}
function setStarMusic(on){
  // The whole 25.6s loop is pre-scheduled, so a mode change must kill pending
  // notes and restart scheduling instead of waiting for the loop boundary.
  if(starMusicOn===on)return;starMusicOn=on;
  if(!audioCtx||!bgmMaster)return;
  const n=audioCtx.currentTime;
  bgmMaster.gain.setTargetAtTime(on?1.9:1.5,n,.06);
  for(const k of bgmVoices){
    try{
      k.g.gain.cancelScheduledValues(n);k.g.gain.setValueAtTime(k.g.gain.value,n);k.g.gain.linearRampToValueAtTime(.0001,n+.05);k.o.stop(n+.06);
      if(k.hg){k.hg.gain.cancelScheduledValues(n);k.hg.gain.setValueAtTime(k.hg.gain.value,n);k.hg.gain.linearRampToValueAtTime(.0001,n+.05);k.h.stop(n+.06)}
    }catch{}
  }
  bgmVoices.length=0;nextBgmTime=n+.07;bgmIdx=0;
}
function scheduleMidiCycle(){
  if(audioCtx?.state==='running'&&bgmMaster){
    const n=audioCtx.currentTime;
    for(let i=bgmVoices.length-1;i>=0;i--)if(bgmVoices[i].end<=n)bgmVoices.splice(i,1);
    // Chunked look-ahead: phones hitch badly when hundreds of WebAudio nodes are
    // created inside one tick, so notes go out in a short window per tick instead
    // of the whole 25.6s loop at each boundary.
    if(!bgmSeq)bgmSeq=[...BGM_NOTES].sort((a,b)=>a.t-b.t);
    const ts=starMusicOn?.8:1,horizon=n+1.5;
    // The anchor stays put while the pointer consumes notes; only a clearly
    // overdue pointer (tab throttling) realigns the loop to "now" from the top.
    if(nextBgmTime+bgmSeq[Math.min(bgmIdx,bgmSeq.length-1)].t*ts<n-.25){nextBgmTime=n+.055;bgmIdx=0}
    for(let guard=0;guard<64;guard++){
      if(bgmIdx>=bgmSeq.length){nextBgmTime+=BGM_LOOP_SECONDS*ts;bgmIdx=0;continue}
      if(nextBgmTime+bgmSeq[bgmIdx].t*ts>=n+1.3)break;
      scheduleMidiNote(audioCtx,bgmSeq[bgmIdx],nextBgmTime);
      bgmIdx++;
    }
  }
  bgmTimer=setTimeout(scheduleMidiCycle,100)
}
function startMidiBgm(){
  if(bgmStarted)return;bgmStarted=true;
  void BGM_MIDI_BASE64;
  const a=ensureAudio();if(!a)return;
  const go=()=>{if(!bgmTimer)scheduleMidiCycle()};
  if(a.state==='running')go();else a.resume().then(go).catch(()=>{})
}

const smoke=[],particles=[],sparkles=[],obstacles=[],pickups=[],meteors=[];
let state='ready',score=0,best=Number(localStorage.getItem('flappyTestBest')||0)||0,hp=MAX_HP,vy=0,spawn=.45,pulse=0,invuln=0,starTime=0,gameTime=0,pickupCooldown=3.5,launchTime=0,rounds=0,pity={poison:false,dorayaki:false,star:false},meteorTimer=rand(1.5,4);
bestEl.textContent=best;finalBestEl.textContent=best;
function hearts(){[...heartsEl.querySelectorAll('.heart')].forEach((e,i)=>e.classList.toggle('empty',i>=hp))}hearts();

function puff(){
  const ex=player.position.x-PW*.38,ey=player.position.y-PH*.1;
  for(let i=0;i<7;i++){
    const m=new THREE.SpriteMaterial({map:smokeTex,transparent:true,opacity:rand(.4,.7),depthTest:false}),s=new THREE.Sprite(m),z=rand(.14,.25),life=rand(.38,.62);
    s.scale.set(z,z,1);s.position.set(ex+rand(-.04,.04),ey+rand(-.05,.05),2.6);fxLayer.add(s);
    smoke.push({s,vx:rand(-2.4,-1.4),vy:rand(-.45,.45),life,max:life,grow:rand(.45,.72)})
  }
}
function sparkleBurst(){
  const ex=player.position.x-PW*.35,ey=player.position.y-PH*.08;
  for(let i=0;i<10;i++){
    const m=new THREE.SpriteMaterial({map:glowTex,transparent:true,opacity:rand(.55,.95),depthTest:false,blending:THREE.AdditiveBlending,depthWrite:false}),s=new THREE.Sprite(m);
    const z=rand(.08,.19),life=rand(.28,.56);
    s.scale.set(z,z,1);s.position.set(ex+rand(-.08,.12),ey+rand(-.14,.14),3.5);fxLayer.add(s);
    sparkles.push({s,vx:rand(-2.2,-.35),vy:rand(-.25,1.35),life,max:life,spin:rand(-7,7),tw:rand(7,14),base:z})
  }
}
function ringFlash(color,grow){
  const m=new THREE.SpriteMaterial({map:ringFxTex,transparent:true,opacity:.65,depthTest:false,color,blending:THREE.AdditiveBlending,depthWrite:false}),s=new THREE.Sprite(m);
  s.scale.set(.55,.55,1);s.position.set(player.position.x,player.position.y,3.3);fxLayer.add(s);
  smoke.push({s,vx:0,vy:0,life:.4,max:.4,grow})
}
function healBurst(){
  for(let i=0;i<10;i++){
    const m=new THREE.SpriteMaterial({map:healFxTex,transparent:true,opacity:rand(.6,.95),depthTest:false,blending:THREE.AdditiveBlending,depthWrite:false}),s=new THREE.Sprite(m);
    const z=rand(.1,.22),life=rand(.45,.75);
    s.scale.set(z,z,1);s.position.set(player.position.x+rand(-.5,.5),player.position.y+rand(-.55,.15),3.4);fxLayer.add(s);
    sparkles.push({s,vx:rand(-.3,.3),vy:rand(.5,1.4),life,max:life,spin:rand(-3,3),tw:rand(5,9),base:z})
  }
  ringFlash('#ff9ad5',2.4)
}
function starBurst(){
  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2,m=new THREE.SpriteMaterial({map:starFxTex,transparent:true,opacity:rand(.7,1),depthTest:false,blending:THREE.AdditiveBlending,depthWrite:false}),s=new THREE.Sprite(m);
    const z=rand(.16,.3),life=rand(.3,.5);
    s.scale.set(z,z,1);s.position.set(player.position.x,player.position.y,3.4);fxLayer.add(s);
    sparkles.push({s,vx:Math.cos(a)*rand(2.1,3.6),vy:Math.sin(a)*rand(2.1,3.6),life,max:life,spin:rand(-9,9),tw:rand(9,16),base:z})
  }
  ringFlash('#ffd76a',4)
}
function burst(kind){
  const t=kind==='poison'?poisonFxTex:bloodTex,n=kind==='poison'?10:30;
  for(let i=0;i<n;i++){
    const m=new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}),s=new THREE.Sprite(m),z=rand(.07,.16),life=rand(.36,.75);
    s.scale.set(z,z,1);s.position.set(player.position.x+rand(-.15,.15),player.position.y+rand(-.15,.15),4);fxLayer.add(s);
    particles.push({s,vx:rand(-2.2,2.2),vy:rand(-.5,2.7),life,max:life})
  }
}
function updateFx(dt){
  for(let i=smoke.length-1;i>=0;i--){
    const p=smoke[i];p.life-=dt;p.s.position.x+=p.vx*dt;p.s.position.y+=p.vy*dt;
    const z=p.s.scale.x+p.grow*dt;p.s.scale.set(z,z,1);p.s.material.opacity=.65*Math.max(0,p.life/p.max);
    if(p.life<=0){fxLayer.remove(p.s);p.s.material.dispose();smoke.splice(i,1)}
  }
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.life-=dt;p.vy-=4.8*dt;p.s.position.x+=p.vx*dt;p.s.position.y+=p.vy*dt;p.s.material.opacity=Math.max(0,p.life/p.max);
    if(p.life<=0){fxLayer.remove(p.s);p.s.material.dispose();particles.splice(i,1)}
  }
  for(let i=sparkles.length-1;i>=0;i--){
    const p=sparkles[i];p.life-=dt;p.s.position.x+=p.vx*dt;p.s.position.y+=p.vy*dt;p.s.material.rotation+=p.spin*dt;
    const k=Math.max(0,p.life/p.max),tw=.72+.34*Math.sin((p.max-p.life)*p.tw);const z=p.base*(.65+tw*.55);
    p.s.scale.set(z,z,1);p.s.material.opacity=k*tw;
    if(p.life<=0){fxLayer.remove(p.s);p.s.material.dispose();sparkles.splice(i,1)}
  }
}
function clearFx(){
  for(const p of [...smoke,...particles,...sparkles]){fxLayer.remove(p.s);p.s.material.dispose()}
  smoke.length=0;particles.length=0;sparkles.length=0
}

// Ambient shooting stars: an occasional streak crossing the night sky, drawn
// between the background and every gameplay layer.
function spawnMeteor(){
  const m=new THREE.SpriteMaterial({map:meteorMap,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending}),s=new THREE.Sprite(m);
  const len=rand(1.4,2.4),spd=rand(7,11),dir=Math.random()<.5?-1:1,ang=rand(.3,.6);
  const vx=dir*spd*Math.cos(ang),vy=-spd*Math.sin(ang);
  s.scale.set(len,len/4,1);m.rotation=Math.atan2(vy,vx);
  s.position.set(rand(-HW-2,HW+2),rand(1.2,HH+1.5),-6);
  const life=rand(.9,1.5);s.material.opacity=0;scene.add(s);
  meteors.push({s,vx,vy,life,max:life})
}
function updateMeteors(dt){
  meteorTimer-=dt;
  if(meteorTimer<=0){meteorTimer=rand(3,5);spawnMeteor()}
  for(let i=meteors.length-1;i>=0;i--){
    const m=meteors[i];m.life-=dt;m.s.position.x+=m.vx*dt;m.s.position.y+=m.vy*dt;
    m.s.material.opacity=.95*Math.sin(Math.PI*Math.min(1,1-m.life/m.max));
    if(m.life<=0){scene.remove(m.s);m.s.material.dispose();meteors.splice(i,1)}
  }
}

function gap(){return 3.55-Math.min(score*.024,.62)}
function speed(){return 3.35+Math.min(score*.055,1.65)}
function interval(){return 1.52-Math.min(score*.0075,.21)}
function maybeSpawnPickup(cy,g,x){
  // Pity timers: shortest window first, one guaranteed drop of each pickup type.
  const forced=Object.keys(PICKUP_GUARANTEE).find(t=>rounds>=PICKUP_GUARANTEE[t]&&!pity[t])||null;
  if(!forced&&pickupCooldown>0)return;
  const r=Math.random(),type=forced||(r<.08?'dorayaki':r<.16?'poison':r<.18?'star':null);if(!type)return;
  pity[type]=true;
  const m=new THREE.SpriteMaterial({map:pickupTexs[type],transparent:true,depthTest:false}),s=new THREE.Sprite(m),size=type==='star'?.85:type==='dorayaki'?.68:.64;
  s.scale.set(size,size,1);s.position.set(x+rand(.3,.75),cy+rand(-g*.2,g*.2),2.2);pickupLayer.add(s);pickups.push({type,s,r:size*.34,bob:rand(0,Math.PI*2)});pickupCooldown=6.2
}
function spawnPair(){
  const type=types[Math.floor(Math.random()*types.length)],g=gap(),moving=score>=MOVE_SCORE,baseCy=rand(moving?-1.65:-2.35,moving?1.65:2.35),group=new THREE.Group(),bm=new THREE.SpriteMaterial({map:obstacleTexs[type],transparent:true,depthTest:false}),tm=bm.clone();
  tm.rotation=Math.PI;
  const bottom=new THREE.Sprite(bm),top=new THREE.Sprite(tm);bottom.scale.set(OW,OH,1);top.scale.set(OW,OH,1);
  bottom.position.set(0,baseCy-g/2-OH/2,1);top.position.set(0,baseCy+g/2+OH/2,1);group.add(bottom,top);group.position.x=HW+1.4;obstacleLayer.add(group);
  const amp=moving?Math.min(1.05,.58+(score-MOVE_SCORE)*.012):0,freq=moving?rand(1.65,2.15):0;
  obstacles.push({group,baseCy,currentCy:baseCy,g,scored:false,moving,amp,freq,phase:rand(0,Math.PI*2)});rounds++;maybeSpawnPickup(baseCy,g,group.position.x)
}
function flap(){vy=JUMP;pulse=1;puff();sparkleBurst();playJump()}
function damage(kind='spike'){
  if(state!=='playing'||invuln>0||starTime>0||hp<=0)return false;
  hp--;invuln=.95;hearts();burst(kind==='poison'?'poison':'blood');playHurt();vy=Math.max(vy,2.1);
  if(hp<=0)end('hp');return true
}
function updateStarVisual(){
  if((starTime>0)!==starMusicOn)setStarMusic(starTime>0);
  rainbowTime.value=starTime>0?gameTime:-1;
  countdown.visible=starTime>0;
  if(starTime>0){
    countdown.position.set(player.position.x,Math.min(player.position.y+PH*.5+.62,HH-.32),3.6);
    const txt=starTime.toFixed(1)+'s',blink=starTime<=1&&Math.floor(gameTime*6)%2===0,key=txt+(blink?'!':'');
    if(key!==cdShown){cdShown=key;drawCountdown(txt,blink)}
  }
}
function collectStar(){starTime=STAR_SECONDS;invuln=0;playerMat.opacity=1;updateStarVisual();toneStar();starBurst()}
function heal(){if(hp<MAX_HP){hp++;hearts()}toneHeal();healBurst()}
function clearPickups(){for(const p of pickups){pickupLayer.remove(p.s);p.s.material.dispose()}pickups.length=0}
function reset(){
  for(const o of obstacles){obstacleLayer.remove(o.group);o.group.traverse(n=>n.material?.dispose())}
  obstacles.length=0;clearPickups();clearFx();score=0;hp=MAX_HP;invuln=0;starTime=0;updateStarVisual();vy=0;spawn=-.35;gameTime=0;pickupCooldown=3.5;launchTime=0;rounds=0;pity={poison:false,dorayaki:false,star:false};
  startLayer.visible=true;startLayer.position.set(0,0,0);
  player.position.set(PX,START_Y,3);playerMat.rotation=0;playerMat.opacity=1;player.scale.set(PW,PH,1);
  scoreEl.textContent='0';bestEl.textContent=best;hearts()
}
function start(){
  reset();state='playing';launchTime=.72;startPanel.classList.remove('visible');overPanel.classList.remove('visible');flap()
}
function end(reason='hp'){
  if(state!=='playing')return;
  state='gameover';starTime=0;updateStarVisual();playerMat.opacity=1;
  if(score>best){best=score;localStorage.setItem('flappyTestBest',String(best))}
  bestEl.textContent=best;finalScoreEl.textContent=score;finalBestEl.textContent=best;
  overPanel.querySelector('h2').textContent=reason==='fall'?'看吧，还是掉下去了':'三颗心，交代得挺干净';
  overPanel.classList.add('visible');synthFail();
  // The heavy mocking laugh lands a beat after the fail jingle; guard against instant restarts.
  setTimeout(()=>{if(state==='gameover')playLaugh()},450)
}
function hitObstacle(o){
  const dx=Math.abs(o.group.position.x-PX);if(dx>=OW*.37+HITW/2)return false;
  const lo=o.currentCy-o.g/2,hi=o.currentCy+o.g/2;
  return player.position.y-HITH/2<lo||player.position.y+HITH/2>hi
}
function hitPickup(p){const dx=p.s.position.x-PX,dy=p.s.position.y-player.position.y;return dx*dx+dy*dy<(p.r+HITW*.35)**2}
function updatePickups(dt){
  const spd=speed();pickupCooldown=Math.max(0,pickupCooldown-dt);
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i];p.s.position.x-=spd*dt;p.bob+=dt*4.1;p.s.position.y+=Math.sin(p.bob)*.0022;p.s.material.rotation=Math.sin(p.bob*.7)*.08;
    if(hitPickup(p)){if(p.type==='dorayaki')heal();else if(p.type==='star')collectStar();else damage('poison');pickupLayer.remove(p.s);p.s.material.dispose();pickups.splice(i,1);continue}
    if(p.s.position.x<-HW-1){pickupLayer.remove(p.s);p.s.material.dispose();pickups.splice(i,1)}
  }
}
function update(dt){
  gameTime+=dt;invuln=Math.max(0,invuln-dt);starTime=Math.max(0,starTime-dt);updateStarVisual();
  if(launchTime>0){launchTime-=dt;startLayer.position.x-=5.2*dt;if(launchTime<=0)startLayer.visible=false}
  playerMat.opacity=invuln>0&&Math.floor(invuln*15)%2?.38:1;
  vy+=GRAV*dt;player.position.y+=vy*dt;
  playerMat.rotation=THREE.MathUtils.lerp(playerMat.rotation,THREE.MathUtils.clamp(vy*.055,-.55,.28),.14);
  pulse=Math.max(0,pulse-dt*6);const sq=1+pulse*.055;player.scale.set(PW/sq,PH*sq,1);
  spawn+=dt;if(spawn>=interval()){spawn=0;spawnPair()}
  const spd=speed();
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i];o.group.position.x-=spd*dt;
    if(o.moving){const off=Math.sin(gameTime*o.freq+o.phase)*o.amp;o.currentCy=o.baseCy+off;o.group.position.y=off}else{o.currentCy=o.baseCy;o.group.position.y=0}
    if(!o.scored&&o.group.position.x<PX){o.scored=true;score++;scoreEl.textContent=score}
    if(hitObstacle(o)){if(damage('spike'))player.position.y+=player.position.y>o.currentCy?-.14:.14}
    if(o.group.position.x<-HW-1.8){obstacleLayer.remove(o.group);o.group.traverse(n=>n.material?.dispose());obstacles.splice(i,1)}
  }
  updatePickups(dt);
  if(player.position.y+HITH/2<-HH){
    if(starTime>0){player.position.y=-HH+PH/2;vy=JUMP}else{end('fall');return}
  }
  if(player.position.y+HITH/2>HH-.03){player.position.y=HH-HITH/2-.06;vy=Math.min(vy,-2);damage('spike')}
}
function action(){if(state==='ready'||state==='gameover')start();else flap()}
function beginFromGesture(){
  ensureAudio();
  action();
  startMidiBgm()
}
startBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();beginFromGesture()});
restartBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();beginFromGesture()});
shell.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;e.preventDefault();beginFromGesture()});
window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();beginFromGesture()}});
window.addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(shell.clientWidth,shell.clientHeight,false)});

const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const dt=Math.min(clock.getDelta(),1/30);
  if(state==='ready'){
    player.position.set(PX,START_Y,3);playerMat.rotation=0;
  }else if(state==='playing')update(dt);
  updateFx(dt);updateMeteors(dt);renderer.render(scene,camera)
});
