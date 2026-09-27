import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import { HERO_IMAGE_URL } from './hero-data.js';
import { HURT_AUDIO_URL } from './audio-hurt.js';
import { JUMP_AUDIO_URL } from './audio-jump-v8.js';
import { BGM_MIDI_BASE64, BGM_LOOP_SECONDS, BGM_NOTES } from './bgm-midi-v8.js';

const W=9,H=16,HW=4.5,HH=8,PX=-1.72,PW=1.075,PH=1.435,HITW=.60,HITH=.78,OW=1.78,OH=11.8;
const GRAV=-15.2,JUMP=5.72,MAX_HP=3,MOVE_SCORE=20,START_Y=-1.25;
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
    const g=x.createLinearGradient(85,0,335,0);g.addColorStop(0,'#b8d2e8');g.addColorStop(.5,'#ffffff');g.addColorStop(1,'#8eacc7');
    x.fillStyle=g;x.beginPath();x.moveTo(210,8);x.lineTo(335,190);x.lineTo(310,610);x.lineTo(110,610);x.lineTo(85,190);x.closePath();x.fill();
    outline(x,()=>{x.beginPath();x.moveTo(210,8);x.lineTo(335,190);x.lineTo(310,610);x.lineTo(110,610);x.lineTo(85,190);x.closePath()},'#879bb1');
    for(let y=160;y<560;y+=65){x.strokeStyle='#9aabbaaa';x.lineWidth=4;x.beginPath();x.moveTo(130,y);x.lineTo(290,y+20);x.stroke()}
    const h=x.createLinearGradient(70,0,350,0);h.addColorStop(0,'#087fca');h.addColorStop(.5,'#4bddff');h.addColorStop(1,'#0a4f9e');
    x.fillStyle=h;rr(x,68,560,284,870,50);x.fill();outline(x,()=>rr(x,68,560,284,870,50),'#234c78');
    x.fillStyle='#ffb536';rr(x,135,720,150,140,35);x.fill();
  }else{
    x.fillStyle='#aebfd7';x.beginPath();x.moveTo(210,8);x.lineTo(175,115);x.lineTo(245,115);x.closePath();x.fill();
    outline(x,()=>{x.beginPath();x.moveTo(210,8);x.lineTo(175,115);x.lineTo(245,115);x.closePath()},'#edf3ff',5);
    x.strokeStyle='#8298b5';x.lineWidth=20;x.beginPath();x.moveTo(210,100);x.lineTo(210,1340);x.stroke();
    const g=x.createLinearGradient(110,0,310,0);g.addColorStop(0,'#6748ce');g.addColorStop(.5,'#aa90ff');g.addColorStop(1,'#432ba1');
    x.fillStyle=g;x.beginPath();x.moveTo(210,130);x.quadraticCurveTo(315,300,320,520);x.lineTo(290,1190);x.quadraticCurveTo(210,1260,130,1190);x.lineTo(100,520);x.quadraticCurveTo(105,300,210,130);x.closePath();x.fill();
    outline(x,()=>{x.beginPath();x.moveTo(210,130);x.quadraticCurveTo(315,300,320,520);x.lineTo(290,1190);x.quadraticCurveTo(210,1260,130,1190);x.lineTo(100,520);x.quadraticCurveTo(105,300,210,130);x.closePath()},'#4d3b7b');
    x.strokeStyle='#8298b5';x.lineWidth=22;x.beginPath();x.moveTo(210,1320);x.lineTo(210,1400);x.quadraticCurveTo(210,1470,135,1450);x.stroke();
  }
  x.shadowColor='transparent';return tex(c)
}
const obstacleTexs={pencil:obstacleTex('pencil'),knife:obstacleTex('knife'),umbrella:obstacleTex('umbrella')},types=Object.keys(obstacleTexs);

function pickupTex(type){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.lineJoin=x.lineCap='round';x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=14;x.shadowOffsetY=7;
  if(type==='dorayaki'){
    x.fillStyle='#f2a04c';x.beginPath();x.ellipse(128,82,84,45,0,0,Math.PI*2);x.fill();
    x.fillStyle='#6d2730';rr(x,60,112,136,42,18);x.fill();
    x.fillStyle='#c76539';x.beginPath();x.ellipse(128,164,84,45,0,0,Math.PI*2);x.fill();
    outline(x,()=>{x.beginPath();x.ellipse(128,123,92,87,0,0,Math.PI*2)},'#633843',7);
  }else{
    const g=x.createLinearGradient(70,60,190,210);g.addColorStop(0,'#89ff70');g.addColorStop(1,'#10aa45');
    x.fillStyle=g;rr(x,72,66,112,140,25);x.fill();outline(x,()=>rr(x,72,66,112,140,25),'#14572d',7);
    x.fillStyle='#405167';rr(x,94,34,68,46,10);x.fill();x.fillStyle='#f3fff0';x.beginPath();x.arc(128,135,38,0,Math.PI*2);x.fill();
    x.strokeStyle='#1a5b31';x.lineWidth=10;x.beginPath();x.moveTo(108,116);x.lineTo(148,154);x.moveTo(148,116);x.lineTo(108,154);x.stroke();
  }
  return tex(c)
}
const pickupTexs={dorayaki:pickupTex('dorayaki'),poison:pickupTex('poison')};

function cloudTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle='#ffffffdd';x.strokeStyle='#a4b4d888';x.lineWidth=4;
  [[40,70,25],[64,52,31],[88,70,23]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill();x.stroke()});
  return tex(c)
}
function sparkleTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,0,64,64,58);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,248,176,.95)');g.addColorStop(.45,'rgba(114,223,255,.48)');g.addColorStop(1,'rgba(80,170,255,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);
  x.save();x.translate(64,64);x.fillStyle='#fffde9';x.beginPath();x.moveTo(0,-45);x.quadraticCurveTo(7,-8,45,0);x.quadraticCurveTo(7,8,0,45);x.quadraticCurveTo(-7,8,-45,0);x.quadraticCurveTo(-7,-8,0,-45);x.fill();x.restore();
  return tex(c)
}
function dropTex(color,splat=false){
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.fillStyle=color;x.strokeStyle='#190d1e88';x.lineWidth=4;
  if(!splat){x.beginPath();x.moveTo(48,8);x.quadraticCurveTo(75,42,70,62);x.arc(48,62,22,0,Math.PI*2);x.fill();x.stroke()}
  else for(let i=0;i<5;i++){x.beginPath();x.arc(rand(24,72),rand(24,72),rand(8,16),0,Math.PI*2);x.fill();x.stroke()}
  return tex(c)
}
const smokeTex=cloudTex(),glowTex=sparkleTex(),bloodTex=dropTex('#ff234c'),poisonFxTex=dropTex('#48ff58',true);

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
cliff.scale.set(7.0,4.35,1);cliff.position.set(-2.95,-4.05,.25);startLayer.add(cliff);
const toiletMap=toiletTex();
[[-4.15,-1.02,.95],[-3.18,-1.08,.88],[-2.38,-1.12,.82]].forEach(([x,y,s],i)=>{
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:toiletMap,transparent:true,depthTest:false,opacity:.94-i*.06}));
  sp.scale.set(s,1.62*s,1);sp.position.set(x,y,.55+i*.02);sp.material.rotation=(i-1)*.018;startLayer.add(sp)
});

const playerMat=new THREE.SpriteMaterial({transparent:true,depthTest:false,depthWrite:false});
const player=new THREE.Sprite(playerMat);player.position.set(PX,START_Y,3);player.scale.set(PW,PH,1);scene.add(player);
new THREE.TextureLoader().load(HERO_IMAGE_URL,t=>{t.colorSpace=THREE.SRGBColorSpace;playerMat.map=t;playerMat.needsUpdate=true});

const jumpAudio=new Audio(JUMP_AUDIO_URL);jumpAudio.preload='auto';jumpAudio.volume=.85;jumpAudio.load();
const hurtAudio=new Audio(HURT_AUDIO_URL);hurtAudio.preload='auto';hurtAudio.volume=.92;hurtAudio.load();
let hurtPrimed=false;
function primeHurt(){
  if(hurtPrimed)return;hurtPrimed=true;const v=hurtAudio.volume;hurtAudio.volume=0;hurtAudio.currentTime=0;
  const p=hurtAudio.play();if(p?.then)p.then(()=>{hurtAudio.pause();hurtAudio.currentTime=0;hurtAudio.volume=v}).catch(()=>{hurtAudio.volume=v});else hurtAudio.volume=v
}
function playJump(){try{jumpAudio.pause();jumpAudio.currentTime=0;jumpAudio.volume=.85;const p=jumpAudio.play();if(p?.catch)p.catch(()=>{})}catch{}}
function playHurt(){try{hurtAudio.pause();hurtAudio.currentTime=0;hurtAudio.volume=.92;const p=hurtAudio.play();if(p?.catch)p.catch(()=>{})}catch{}}

let audioCtx=null,bgmMaster=null,bgmTimer=null,bgmStarted=false;
function ensureAudio(){
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  if(!audioCtx){
    audioCtx=new C();
    bgmMaster=audioCtx.createGain();
    bgmMaster.gain.value=.12;
    bgmMaster.connect(audioCtx.destination)
  }
  if(audioCtx.state==='suspended')void audioCtx.resume();
  return audioCtx
}
function withAudio(fn){
  const a=ensureAudio();if(!a)return;
  if(a.state==='running')fn(a);else a.resume().then(()=>fn(a)).catch(()=>{})
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
const midiHz=n=>440*Math.pow(2,(n-69)/12);
function scheduleMidiNote(a,e,base){
  const start=base+e.t,dur=Math.max(.04,e.d),vel=e.v/127;
  const o=a.createOscillator(),g=a.createGain(),lp=a.createBiquadFilter();
  if(e.c===0){o.type='triangle';lp.frequency.value=2400}
  else if(e.c===1){o.type='sine';lp.frequency.value=900}
  else{o.type='triangle';lp.frequency.value=1700}
  o.frequency.value=midiHz(e.n);
  const peak=(e.c===0?.052:e.c===1?.038:.022)*vel;
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),start+.018);g.gain.exponentialRampToValueAtTime(.0001,start+dur*.9);
  lp.type='lowpass';o.connect(lp);lp.connect(g);g.connect(bgmMaster);o.start(start);o.stop(start+dur+.04);
  if(e.c===0&&e.v>100){
    const h=a.createOscillator(),hg=a.createGain();h.type='sine';h.frequency.value=midiHz(e.n+12);hg.gain.setValueAtTime(.0001,start);hg.gain.exponentialRampToValueAtTime(.008*vel,start+.015);hg.gain.exponentialRampToValueAtTime(.0001,start+dur*.7);h.connect(hg);hg.connect(bgmMaster);h.start(start);h.stop(start+dur)
  }
}
function scheduleMidiCycle(){
  if(!audioCtx||audioCtx.state!=='running'||!bgmMaster)return;
  const base=audioCtx.currentTime+.055;
  for(const e of BGM_NOTES)scheduleMidiNote(audioCtx,e,base);
  bgmTimer=setTimeout(scheduleMidiCycle,BGM_LOOP_SECONDS*1000)
}
function startMidiBgm(){
  if(bgmStarted)return;bgmStarted=true;
  void BGM_MIDI_BASE64;
  const a=ensureAudio();if(!a)return;
  const go=()=>{if(!bgmTimer)scheduleMidiCycle()};
  if(a.state==='running')go();else a.resume().then(go).catch(()=>{})
}

const smoke=[],particles=[],sparkles=[],obstacles=[],pickups=[];
let state='ready',score=0,best=Number(localStorage.getItem('flappyTestBest')||0)||0,hp=MAX_HP,vy=0,spawn=.45,readyT=0,pulse=0,invuln=0,gameTime=0,pickupCooldown=3.5,launchTime=0;
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
function burst(kind){
  const t=kind==='poison'?poisonFxTex:bloodTex,n=kind==='poison'?10:15;
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

function gap(){return 3.55-Math.min(score*.024,.62)}
function speed(){return 3.35+Math.min(score*.055,1.65)}
function interval(){return 1.52-Math.min(score*.0075,.21)}
function maybeSpawnPickup(cy,g,x){
  if(pickupCooldown>0)return;
  const r=Math.random(),type=r<.05?'dorayaki':r<.13?'poison':null;if(!type)return;
  const m=new THREE.SpriteMaterial({map:pickupTexs[type],transparent:true,depthTest:false}),s=new THREE.Sprite(m),size=type==='dorayaki'?.68:.64;
  s.scale.set(size,size,1);s.position.set(x+rand(.3,.75),cy+rand(-g*.2,g*.2),2.2);pickupLayer.add(s);pickups.push({type,s,r:size*.34,bob:rand(0,Math.PI*2)});pickupCooldown=6.2
}
function spawnPair(){
  const type=types[Math.floor(Math.random()*types.length)],g=gap(),moving=score>=MOVE_SCORE,baseCy=rand(moving?-1.65:-2.35,moving?1.65:2.35),group=new THREE.Group(),bm=new THREE.SpriteMaterial({map:obstacleTexs[type],transparent:true,depthTest:false}),tm=bm.clone();
  tm.rotation=Math.PI;
  const bottom=new THREE.Sprite(bm),top=new THREE.Sprite(tm);bottom.scale.set(OW,OH,1);top.scale.set(OW,OH,1);
  bottom.position.set(0,baseCy-g/2-OH/2,1);top.position.set(0,baseCy+g/2+OH/2,1);group.add(bottom,top);group.position.x=HW+1.4;obstacleLayer.add(group);
  const amp=moving?Math.min(1.05,.58+(score-MOVE_SCORE)*.012):0,freq=moving?rand(1.65,2.15):0;
  obstacles.push({group,baseCy,currentCy:baseCy,g,scored:false,moving,amp,freq,phase:rand(0,Math.PI*2)});maybeSpawnPickup(baseCy,g,group.position.x)
}
function flap(){vy=JUMP;pulse=1;puff();sparkleBurst();playJump()}
function damage(kind='spike'){
  if(state!=='playing'||invuln>0||hp<=0)return false;
  hp--;invuln=.95;hearts();burst(kind==='poison'?'poison':'blood');playHurt();vy=Math.max(vy,2.1);
  if(hp<=0)end('hp');return true
}
function heal(){if(hp<MAX_HP){hp++;hearts()}toneHeal()}
function clearPickups(){for(const p of pickups){pickupLayer.remove(p.s);p.s.material.dispose()}pickups.length=0}
function reset(){
  for(const o of obstacles){obstacleLayer.remove(o.group);o.group.traverse(n=>n.material?.dispose())}
  obstacles.length=0;clearPickups();clearFx();score=0;hp=MAX_HP;invuln=0;vy=0;spawn=-.35;gameTime=0;pickupCooldown=3.5;launchTime=0;
  startLayer.visible=true;startLayer.position.set(0,0,0);
  player.position.set(PX,START_Y,3);playerMat.rotation=0;playerMat.opacity=1;player.scale.set(PW,PH,1);
  scoreEl.textContent='0';bestEl.textContent=best;hearts()
}
function start(){
  reset();state='playing';launchTime=.72;startPanel.classList.remove('visible');overPanel.classList.remove('visible');flap()
}
function end(reason='hp'){
  if(state!=='playing')return;
  state='gameover';playerMat.opacity=1;
  if(score>best){best=score;localStorage.setItem('flappyTestBest',String(best))}
  bestEl.textContent=best;finalScoreEl.textContent=score;finalBestEl.textContent=best;
  overPanel.querySelector('h2').textContent=reason==='fall'?'看吧，还是掉下去了':'三颗心，交代得挺干净';
  overPanel.classList.add('visible');synthFail()
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
    if(hitPickup(p)){if(p.type==='dorayaki')heal();else damage('poison');pickupLayer.remove(p.s);p.s.material.dispose();pickups.splice(i,1);continue}
    if(p.s.position.x<-HW-1){pickupLayer.remove(p.s);p.s.material.dispose();pickups.splice(i,1)}
  }
}
function update(dt){
  gameTime+=dt;invuln=Math.max(0,invuln-dt);
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
  if(player.position.y+HITH/2<-HH){end('fall');return}
  if(player.position.y+HITH/2>HH-.03){player.position.y=HH-HITH/2-.06;vy=Math.min(vy,-2);damage('spike')}
}
function action(){if(state==='ready'||state==='gameover')start();else flap()}
function beginFromGesture(){
  primeHurt();
  action();
  ensureAudio();
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
    readyT+=dt;player.position.set(PX,START_Y+Math.sin(readyT*2.2)*.018,3);playerMat.rotation=Math.sin(readyT*1.15)*.009;
  }else if(state==='playing')update(dt);
  updateFx(dt);renderer.render(scene,camera)
});
