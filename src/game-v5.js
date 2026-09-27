import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import { HERO_IMAGE_URL } from './hero-data.js';
import { FAIL_AUDIO_URL } from './audio-fail.js';
import { FART_AUDIO_URL } from './audio-fart.js';
import { HURT_AUDIO_URL } from './audio-hurt.js';

const W=9,H=16,HW=4.5,HH=8,PX=-1.72,PW=1.075,PH=1.435,HITW=.60,HITH=.78,OW=1.78,OH=11.8;
const GRAV=-15.2,JUMP=5.72,MAX_HP=3,ELECTRIC_SCORE=20;
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
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-HW,HW,HH,-HH,.1,100);camera.position.z=10;
const obstacleLayer=new THREE.Group(),pickupLayer=new THREE.Group(),fxLayer=new THREE.Group();
scene.add(obstacleLayer,pickupLayer,fxLayer);
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function tex(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;return t}
function rr(x,a,b,w,h,r){x.beginPath();x.roundRect(a,b,w,h,r)}
function outline(x,draw,c='#302447',w=8){for(let i=0;i<2;i++){x.save();x.translate(rand(-1.2,1.2),rand(-1.2,1.2));x.strokeStyle=i?`${c}66`:c;x.lineWidth=w-i*3;draw();x.stroke();x.restore()}}

function bgTex(){
  const c=document.createElement('canvas');c.width=720;c.height=1280;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,1280);g.addColorStop(0,'#091225');g.addColorStop(.52,'#111a35');g.addColorStop(1,'#24142d');x.fillStyle=g;x.fillRect(0,0,720,1280);
  const glow=x.createRadialGradient(360,270,20,360,270,360);glow.addColorStop(0,'rgba(62,132,255,.20)');glow.addColorStop(1,'rgba(62,132,255,0)');x.fillStyle=glow;x.fillRect(0,0,720,720);
  for(let i=0;i<90;i++){const r=rand(1,4),a=rand(.16,.62);x.fillStyle=`rgba(255,255,255,${a})`;x.beginPath();x.arc(rand(0,720),rand(0,1280),r,0,Math.PI*2);x.fill()}
  for(const [cx,cy,color,s] of [[120,210,'#864dff',1],[610,410,'#20b8ff',.9],[120,930,'#ff477e',.72],[590,1080,'#ffc14f',.72]]){const rg=x.createRadialGradient(cx,cy,0,cx,cy,180*s);rg.addColorStop(0,`${color}38`);rg.addColorStop(1,`${color}00`);x.fillStyle=rg;x.fillRect(cx-200,cy-200,400,400)}
  return tex(c)
}
const bg=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:bgTex(),depthWrite:false}));bg.position.z=-8;scene.add(bg);

function obstacleTex(type){
  const c=document.createElement('canvas');c.width=420;c.height=1500;const x=c.getContext('2d');x.lineJoin=x.lineCap='round';x.shadowColor='rgba(0,0,0,.34)';x.shadowBlur=18;x.shadowOffsetY=9;
  if(type==='pencil'){
    x.fillStyle='#e6b17d';x.beginPath();x.moveTo(210,8);x.lineTo(80,270);x.lineTo(340,270);x.closePath();x.fill();outline(x,()=>{x.beginPath();x.moveTo(210,8);x.lineTo(80,270);x.lineTo(340,270);x.closePath()});
    x.fillStyle='#242535';x.beginPath();x.moveTo(210,8);x.lineTo(177,80);x.lineTo(243,80);x.closePath();x.fill();
    const g=x.createLinearGradient(80,0,340,0);g.addColorStop(0,'#f7a900');g.addColorStop(.5,'#ffe95e');g.addColorStop(1,'#f17800');x.fillStyle=g;rr(x,80,250,260,980,30);x.fill();outline(x,()=>rr(x,80,250,260,980,30));
    x.fillStyle='#b8c7d9';rr(x,80,1210,260,90,18);x.fill();outline(x,()=>rr(x,80,1210,260,90,18),'#40506b',7);
    x.fillStyle='#f65374';rr(x,94,1285,232,170,30);x.fill();outline(x,()=>rr(x,94,1285,232,170,30),'#77344c',7);
  }else if(type==='knife'){
    const g=x.createLinearGradient(90,0,330,0);g.addColorStop(0,'#7da4c9');g.addColorStop(.5,'#f7fdff');g.addColorStop(1,'#557ca6');x.fillStyle=g;x.beginPath();x.moveTo(210,8);x.lineTo(335,190);x.lineTo(310,610);x.lineTo(110,610);x.lineTo(85,190);x.closePath();x.fill();outline(x,()=>{x.beginPath();x.moveTo(210,8);x.lineTo(335,190);x.lineTo(310,610);x.lineTo(110,610);x.lineTo(85,190);x.closePath()},'#26364d');
    for(let y=160;y<560;y+=65){x.strokeStyle='#5f7386aa';x.lineWidth=4;x.beginPath();x.moveTo(130,y);x.lineTo(290,y+20);x.stroke()}
    const h=x.createLinearGradient(70,0,350,0);h.addColorStop(0,'#087fca');h.addColorStop(.5,'#44d4ff');h.addColorStop(1,'#0a4f9e');x.fillStyle=h;rr(x,68,560,284,870,50);x.fill();outline(x,()=>rr(x,68,560,284,870,50),'#173c66');
    x.fillStyle='#ffb536';rr(x,135,720,150,140,35);x.fill();outline(x,()=>rr(x,135,720,150,140,35),'#6b4c20',7);
  }else{
    x.fillStyle='#34435e';x.beginPath();x.moveTo(210,8);x.lineTo(175,115);x.lineTo(245,115);x.closePath();x.fill();outline(x,()=>{x.beginPath();x.moveTo(210,8);x.lineTo(175,115);x.lineTo(245,115);x.closePath()},'#29273b');
    x.strokeStyle='#60799a';x.lineWidth=20;x.beginPath();x.moveTo(210,100);x.lineTo(210,1340);x.stroke();
    const g=x.createLinearGradient(110,0,310,0);g.addColorStop(0,'#6545c7');g.addColorStop(.5,'#a78cff');g.addColorStop(1,'#422a9f');x.fillStyle=g;x.beginPath();x.moveTo(210,130);x.quadraticCurveTo(315,300,320,520);x.lineTo(290,1190);x.quadraticCurveTo(210,1260,130,1190);x.lineTo(100,520);x.quadraticCurveTo(105,300,210,130);x.closePath();x.fill();outline(x,()=>{x.beginPath();x.moveTo(210,130);x.quadraticCurveTo(315,300,320,520);x.lineTo(290,1190);x.quadraticCurveTo(210,1260,130,1190);x.lineTo(100,520);x.quadraticCurveTo(105,300,210,130);x.closePath()},'#352861');
    x.strokeStyle='#60799a';x.lineWidth=22;x.beginPath();x.moveTo(210,1320);x.lineTo(210,1400);x.quadraticCurveTo(210,1470,135,1450);x.stroke();
  }
  x.shadowColor='transparent';return tex(c)
}
const obstacleTexs={pencil:obstacleTex('pencil'),knife:obstacleTex('knife'),umbrella:obstacleTex('umbrella')},types=Object.keys(obstacleTexs);

function pickupTex(type){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.lineJoin=x.lineCap='round';x.shadowColor='rgba(0,0,0,.36)';x.shadowBlur=16;x.shadowOffsetY=7;
  if(type==='dorayaki'){
    x.fillStyle='#f2a04c';x.beginPath();x.ellipse(128,82,84,45,0,0,Math.PI*2);x.fill();x.fillStyle='#6d2730';rr(x,60,112,136,42,18);x.fill();x.fillStyle='#c76539';x.beginPath();x.ellipse(128,164,84,45,0,0,Math.PI*2);x.fill();outline(x,()=>{x.beginPath();x.ellipse(128,123,92,87,0,0,Math.PI*2)},'#633843',7);
  }else{
    const g=x.createLinearGradient(70,60,190,210);g.addColorStop(0,'#88ff6b');g.addColorStop(1,'#10aa45');x.fillStyle=g;rr(x,72,66,112,140,25);x.fill();outline(x,()=>rr(x,72,66,112,140,25),'#14572d',7);x.fillStyle='#405167';rr(x,94,34,68,46,10);x.fill();x.fillStyle='#f3fff0';x.beginPath();x.arc(128,135,38,0,Math.PI*2);x.fill();x.strokeStyle='#1a5b31';x.lineWidth=10;x.beginPath();x.moveTo(108,116);x.lineTo(148,154);x.moveTo(148,116);x.lineTo(108,154);x.stroke();
  }
  return tex(c)
}
const pickupTexs={dorayaki:pickupTex('dorayaki'),poison:pickupTex('poison')};
function cloudTex(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#ffffffdd';x.strokeStyle='#a4b4d888';x.lineWidth=4;[[40,70,25],[64,52,31],[88,70,23]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill();x.stroke()});return tex(c)}
function dropTex(color,splat=false){const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.fillStyle=color;x.strokeStyle='#190d1e88';x.lineWidth=4;if(!splat){x.beginPath();x.moveTo(48,8);x.quadraticCurveTo(75,42,70,62);x.arc(48,62,22,0,Math.PI*2);x.fill();x.stroke()}else for(let i=0;i<5;i++){x.beginPath();x.arc(rand(24,72),rand(24,72),rand(8,16),0,Math.PI*2);x.fill();x.stroke()}return tex(c)}
const smokeTex=cloudTex(),bloodTex=dropTex('#ff234c'),poisonFxTex=dropTex('#48ff58',true);

const playerMat=new THREE.SpriteMaterial({transparent:true,depthTest:false,depthWrite:false}),player=new THREE.Sprite(playerMat);
player.position.set(PX,0,3);player.scale.set(PW,PH,1);scene.add(player);
new THREE.TextureLoader().load(HERO_IMAGE_URL,t=>{t.colorSpace=THREE.SRGBColorSpace;playerMat.map=t;playerMat.needsUpdate=true});

// Robust mobile audio: decode the exact user-provided MP3s into one AudioContext,
// resume that context on the first gesture, then reuse buffers for all later SFX.
const SOUND_URLS={fail:FAIL_AUDIO_URL,fart:FART_AUDIO_URL,hurt:HURT_AUDIO_URL};
let audioCtx=null,audioReady=null;
const audioBuffers={};
function dataUriBuffer(uri){const b64=uri.slice(uri.indexOf(',')+1),bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return u8.buffer}
function unlockAudio(){
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return Promise.resolve();
  if(!audioCtx){audioCtx=new C();audioReady=Promise.all(Object.entries(SOUND_URLS).map(async([k,u])=>{try{audioBuffers[k]=await audioCtx.decodeAudioData(dataUriBuffer(u).slice(0))}catch(e){console.warn('audio decode failed',k,e)}}));}
  if(audioCtx.state==='suspended')void audioCtx.resume();
  const silent=audioCtx.createBufferSource();silent.buffer=audioCtx.createBuffer(1,1,22050);silent.connect(audioCtx.destination);try{silent.start(0)}catch{}
  return audioReady||Promise.resolve();
}
function playSfx(k,volume=1){
  if(audioCtx&&audioBuffers[k]&&audioCtx.state==='running'){const s=audioCtx.createBufferSource(),g=audioCtx.createGain();s.buffer=audioBuffers[k];g.gain.value=volume;s.connect(g);g.connect(audioCtx.destination);s.start();return}
  unlockAudio().then(()=>{if(audioCtx&&audioBuffers[k]){const s=audioCtx.createBufferSource(),g=audioCtx.createGain();s.buffer=audioBuffers[k];g.gain.value=volume;s.connect(g);g.connect(audioCtx.destination);s.start();}else{const a=new Audio(SOUND_URLS[k]);a.volume=volume;void a.play().catch(()=>{});}});
}
function toneHeal(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=audioCtx||(audioCtx=new C());if(a.state==='suspended')void a.resume();const n=a.currentTime;[540,700,870].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),d=i*.08;o.frequency.value=f;g.gain.setValueAtTime(.0001,n+d);g.gain.exponentialRampToValueAtTime(.08,n+d+.015);g.gain.exponentialRampToValueAtTime(.0001,n+d+.15);o.connect(g);g.connect(a.destination);o.start(n+d);o.stop(n+d+.17)})}
function zap(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=audioCtx||(audioCtx=new C());if(a.state==='suspended')void a.resume();const n=a.currentTime,l=Math.floor(a.sampleRate*.1),b=a.createBuffer(1,l,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<l;i++)d[i]=(Math.random()*2-1)*(1-i/l);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type='highpass';f.frequency.value=950;g.gain.value=.1;s.connect(f);f.connect(g);g.connect(a.destination);s.start(n)}

const smoke=[],particles=[],obstacles=[],pickups=[];
let state='ready',score=0,best=Number(localStorage.getItem('flappyTestBest')||0)||0,hp=MAX_HP,vy=0,spawn=.45,readyT=0,pulse=0,invuln=0,gameTime=0,pickupCooldown=3.5;
bestEl.textContent=best;finalBestEl.textContent=best;
function hearts(){[...heartsEl.querySelectorAll('.heart')].forEach((e,i)=>e.classList.toggle('empty',i>=hp))}hearts();

function puff(){const ex=player.position.x-PW*.38,ey=player.position.y-PH*.1;for(let i=0;i<7;i++){const m=new THREE.SpriteMaterial({map:smokeTex,transparent:true,opacity:rand(.4,.7),depthTest:false}),s=new THREE.Sprite(m),z=rand(.14,.25),life=rand(.38,.62);s.scale.set(z,z,1);s.position.set(ex+rand(-.04,.04),ey+rand(-.05,.05),2.6);fxLayer.add(s);smoke.push({s,vx:rand(-2.4,-1.4),vy:rand(-.45,.45),life,max:life,grow:rand(.45,.72)})}}
function burst(kind){const t=kind==='poison'?poisonFxTex:bloodTex,n=kind==='poison'?10:15;for(let i=0;i<n;i++){const m=new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}),s=new THREE.Sprite(m),z=rand(.07,.16),life=rand(.36,.75);s.scale.set(z,z,1);s.position.set(player.position.x+rand(-.15,.15),player.position.y+rand(-.15,.15),4);fxLayer.add(s);particles.push({s,vx:rand(-2.2,2.2),vy:rand(-.5,2.7),life,max:life})}}
function updateFx(dt){for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.life-=dt;p.s.position.x+=p.vx*dt;p.s.position.y+=p.vy*dt;const z=p.s.scale.x+p.grow*dt;p.s.scale.set(z,z,1);p.s.material.opacity=.65*Math.max(0,p.life/p.max);if(p.life<=0){fxLayer.remove(p.s);p.s.material.dispose();smoke.splice(i,1)}}for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.vy-=4.8*dt;p.s.position.x+=p.vx*dt;p.s.position.y+=p.vy*dt;p.s.material.opacity=Math.max(0,p.life/p.max);if(p.life<=0){fxLayer.remove(p.s);p.s.material.dispose();particles.splice(i,1)}}}
function clearFx(){for(const p of [...smoke,...particles]){fxLayer.remove(p.s);p.s.material.dispose()}smoke.length=0;particles.length=0}

function gap(){return 3.55-Math.min(score*.024,.62)}
function speed(){return 3.35+Math.min(score*.055,1.65)}
function interval(){return 1.52-Math.min(score*.0075,.21)}

function createElectric(g,cy){
  const group=new THREE.Group(),lines=[];
  for(let j=0;j<3;j++){const geo=new THREE.BufferGeometry(),arr=new Float32Array(21*3);geo.setAttribute('position',new THREE.BufferAttribute(arr,3));const mat=new THREE.LineBasicMaterial({color:0x35dcff,transparent:true,opacity:0,depthTest:false,depthWrite:false}),line=new THREE.Line(geo,mat);line.position.z=2.5;group.add(line);lines.push(line)}
  obstacleLayer.add(group);return{group,lines,g,cy,offset:rand(0,2.6),active:false,warning:false,jitter:0,lastPulse:-1}
}
function redrawElectric(e,color){const lo=e.cy-e.g/2+.05,hi=e.cy+e.g/2-.05;e.lines.forEach((l,j)=>{l.material.color.setHex(color);const a=l.geometry.attributes.position.array;for(let i=0;i<21;i++){const t=i/20,k=i*3;a[k]=(j-1)*.05+rand(-.13,.13)+Math.sin(t*24+gameTime*20+j)*.08;a[k+1]=lo+(hi-lo)*t;a[k+2]=0}l.geometry.attributes.position.needsUpdate=true})}
function updateElectric(o,dt){
  if(!o.electric)return;const e=o.electric;e.group.position.x=o.group.position.x;const phase=(gameTime+e.offset)%2.7;
  const warn1=phase<.18,warn2=phase>.38&&phase<.56;e.warning=warn1||warn2;e.active=phase>.78&&phase<1.34;
  if(e.active){e.jitter-=dt;if(e.jitter<=0){e.jitter=.045;redrawElectric(e,0x39e7ff)}e.lines.forEach((l,i)=>l.material.opacity=.98-i*.16)}
  else if(e.warning){redrawElectric(e,0xffd54a);e.lines.forEach((l,i)=>l.material.opacity=.76-i*.13)}
  else e.lines.forEach(l=>l.material.opacity=0);
}
function disposeElectric(e){if(!e)return;obstacleLayer.remove(e.group);e.lines.forEach(l=>{l.geometry.dispose();l.material.dispose()})}

function maybeSpawnPickup(cy,g,x){
  pickupCooldown=Math.max(0,pickupCooldown);
  if(pickupCooldown>0)return;
  const r=Math.random();let type=null;
  // Much rarer healing item: about 6% per eligible obstacle. Poison 8%.
  if(r<.06)type='dorayaki';else if(r<.14)type='poison';
  if(!type)return;
  const m=new THREE.SpriteMaterial({map:pickupTexs[type],transparent:true,depthTest:false,depthWrite:false}),s=new THREE.Sprite(m),size=type==='dorayaki'?.68:.64;
  s.scale.set(size,size,1);s.position.set(x+rand(.25,.72),cy+rand(-g*.22,g*.22),2.2);pickupLayer.add(s);pickups.push({type,s,r:size*.34,bob:rand(0,Math.PI*2)});pickupCooldown=5.5;
}
function spawnPair(){
  const type=types[Math.floor(Math.random()*types.length)],g=gap(),cy=rand(-2.35,2.35),group=new THREE.Group();
  const bm=new THREE.SpriteMaterial({map:obstacleTexs[type],transparent:true,depthTest:false,depthWrite:false}),tm=bm.clone();tm.rotation=Math.PI;
  const bottom=new THREE.Sprite(bm),top=new THREE.Sprite(tm);bottom.scale.set(OW,OH,1);top.scale.set(OW,OH,1);bottom.position.set(0,cy-g/2-OH/2,1);top.position.set(0,cy+g/2+OH/2,1);group.add(bottom,top);group.position.x=HW+1.4;obstacleLayer.add(group);
  const e=score>=ELECTRIC_SCORE?createElectric(g,cy):null;if(e)e.group.position.x=group.position.x;obstacles.push({group,cy,g,scored:false,electric:e});maybeSpawnPickup(cy,g,group.position.x);
}

function flap(){vy=JUMP;pulse=1;puff();playSfx('fart',.95)}
function damage(kind='spike'){
  if(state!=='playing'||invuln>0||hp<=0)return false;
  hp--;invuln=1.0;hearts();burst(kind==='poison'?'poison':'blood');playSfx('hurt',.9);if(kind==='electric')zap();vy=Math.max(vy,2.1);
  if(hp<=0)end('hp');return true;
}
function heal(){if(hp<MAX_HP){hp++;hearts()}toneHeal()}
function clearPickups(){for(const p of pickups){pickupLayer.remove(p.s);p.s.material.dispose()}pickups.length=0}
function reset(){
  for(const o of obstacles){obstacleLayer.remove(o.group);o.group.traverse(n=>n.material?.dispose());disposeElectric(o.electric)}obstacles.length=0;clearPickups();clearFx();
  score=0;hp=MAX_HP;invuln=0;vy=0;spawn=.5;gameTime=0;pickupCooldown=3.5;player.position.set(PX,0,3);playerMat.rotation=0;playerMat.opacity=1;player.scale.set(PW,PH,1);scoreEl.textContent='0';bestEl.textContent=best;hearts();
}
function start(){reset();state='playing';startPanel.classList.remove('visible');overPanel.classList.remove('visible');flap()}
function end(reason='hp'){
  if(state!=='playing')return;state='gameover';playerMat.opacity=1;if(score>best){best=score;localStorage.setItem('flappyTestBest',String(best))}bestEl.textContent=best;finalScoreEl.textContent=score;finalBestEl.textContent=best;overPanel.classList.add('visible');playSfx('fail',.82);
}
function hitObstacle(o){const dx=Math.abs(o.group.position.x-PX);if(dx>=OW*.37+HITW/2)return false;const lo=o.cy-o.g/2,hi=o.cy+o.g/2;return player.position.y-HITH/2<lo||player.position.y+HITH/2>hi}
function hitPickup(p){const dx=p.s.position.x-PX,dy=p.s.position.y-player.position.y;return dx*dx+dy*dy<(p.r+HITW*.35)**2}
function updatePickups(dt){const spd=speed();pickupCooldown=Math.max(0,pickupCooldown-dt);for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.s.position.x-=spd*dt;p.bob+=dt*4.1;p.s.position.y+=Math.sin(p.bob)*.0022;p.s.material.rotation=Math.sin(p.bob*.7)*.08;if(hitPickup(p)){if(p.type==='dorayaki')heal();else damage('poison');pickupLayer.remove(p.s);p.s.material.dispose();pickups.splice(i,1);continue}if(p.s.position.x<-HW-1){pickupLayer.remove(p.s);p.s.material.dispose();pickups.splice(i,1)}}}

function update(dt){
  gameTime+=dt;invuln=Math.max(0,invuln-dt);playerMat.opacity=invuln>0&&Math.floor(invuln*15)%2?.38:1;
  vy+=GRAV*dt;player.position.y+=vy*dt;playerMat.rotation=THREE.MathUtils.lerp(playerMat.rotation,THREE.MathUtils.clamp(vy*.055,-.55,.28),.14);pulse=Math.max(0,pulse-dt*6);const sq=1+pulse*.055;player.scale.set(PW/sq,PH*sq,1);
  spawn+=dt;if(spawn>=interval()){spawn=0;spawnPair()}
  const spd=speed();
  for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.group.position.x-=spd*dt;updateElectric(o,dt);if(!o.scored&&o.group.position.x<PX){o.scored=true;score++;scoreEl.textContent=score}if(hitObstacle(o)){if(damage('spike'))player.position.y+=player.position.y>o.cy?-.14:.14}else if(o.electric?.active){const dx=Math.abs(o.group.position.x-PX),inside=player.position.y>o.cy-o.g/2&&player.position.y<o.cy+o.g/2;if(dx<HITW*.55+.16&&inside)damage('electric')}if(o.group.position.x<-HW-1.8){obstacleLayer.remove(o.group);o.group.traverse(n=>n.material?.dispose());disposeElectric(o.electric);obstacles.splice(i,1)}}
  updatePickups(dt);
  // Falling below the screen is always an immediate loss, regardless of remaining HP.
  if(player.position.y+HITH/2<-HH){end('fall');return}
  // Touching the ceiling still costs one heart instead of instantly ending the run.
  if(player.position.y+HITH/2>HH-.03){player.position.y=HH-HITH/2-.06;vy=Math.min(vy,-2.0);damage('spike')}
}

function action(){void unlockAudio();if(state==='ready'||state==='gameover')start();else flap()}
startBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();void unlockAudio();start()});
restartBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();void unlockAudio();start()});
shell.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;e.preventDefault();action()});
window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();void unlockAudio();action()}});
window.addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(shell.clientWidth,shell.clientHeight,false)});

const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),1/30);if(state==='ready'){readyT+=dt;player.position.y=Math.sin(readyT*2.15)*.22;playerMat.rotation=Math.sin(readyT*1.25)*.035}else if(state==='playing')update(dt);updateFx(dt);renderer.render(scene,camera)});
