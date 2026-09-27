import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import { HERO_IMAGE_URL } from './hero-data.js';

const W=9,H=16,HW=W/2,HH=H/2;
const PX=-1.72,PW=2.15,PH=2.87,HITW=1.18,HITH=1.48;
const OW=1.72,OH=11.6,GRAV=-14.4,JUMP=5.62;
const shell=document.querySelector('#game-shell'), host=document.querySelector('#canvas-host');
const scoreEl=document.querySelector('#score'), bestEl=document.querySelector('#best');
const finalScoreEl=document.querySelector('#final-score'), finalBestEl=document.querySelector('#final-best');
const startPanel=document.querySelector('#start-panel'), overPanel=document.querySelector('#game-over-panel');
const startBtn=document.querySelector('#start-button'), restartBtn=document.querySelector('#restart-button');

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); renderer.setSize(shell.clientWidth,shell.clientHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace; host.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-HW,HW,HH,-HH,.1,100); camera.position.z=10;
const bgLayer=new THREE.Group(), obstacleLayer=new THREE.Group(), smokeLayer=new THREE.Group();
scene.add(bgLayer,obstacleLayer,smokeLayer);

function rand(a,b){return a+Math.random()*(b-a)}
function paperTexture(){
  const c=document.createElement('canvas'); c.width=720;c.height=1280; const x=c.getContext('2d');
  x.fillStyle='#f2ecdd';x.fillRect(0,0,c.width,c.height);
  x.strokeStyle='rgba(70,78,83,.10)';x.lineWidth=1;
  for(let y=70;y<1280;y+=66){x.beginPath();x.moveTo(0,y+rand(-2,2));x.lineTo(720,y+rand(-2,2));x.stroke()}
  x.strokeStyle='rgba(115,72,68,.11)';x.lineWidth=2;x.beginPath();x.moveTo(76,0);x.lineTo(76,1280);x.stroke();
  for(let i=0;i<420;i++){x.strokeStyle=`rgba(60,58,52,${rand(.01,.045)})`;x.beginPath();x.moveTo(rand(0,720),rand(0,1280));x.lineTo(rand(0,720),rand(0,1280));x.stroke()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const paper=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:paperTexture(),depthWrite:false}));paper.position.z=-8;bgLayer.add(paper);
for(const [x,y,s] of [[-3.4,5.4,.5],[3.2,3.2,.6],[-3.1,-4.8,.48],[3.1,-5.4,.4]]){
  const pts=[];for(let i=0;i<30;i++){const t=i/29*Math.PI*4.5,r=(.08+i/29*.58)*s;pts.push(new THREE.Vector3(Math.cos(t)*r,Math.sin(t)*r,-6))}
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x555555,transparent:true,opacity:.12}));l.position.set(x,y,0);bgLayer.add(l);
}

const playerMat=new THREE.SpriteMaterial({transparent:true,depthTest:false,depthWrite:false});
const player=new THREE.Sprite(playerMat);player.position.set(PX,0,3);player.scale.set(PW,PH,1);scene.add(player);
new THREE.TextureLoader().load(HERO_IMAGE_URL,t=>{t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;playerMat.map=t;playerMat.needsUpdate=true});

function line(x,a,b,c,d,color='#444',w=7,j=2,n=3){for(let k=0;k<n;k++){x.strokeStyle=color;x.lineWidth=Math.max(1,w-k*1.5);x.beginPath();x.moveTo(a+rand(-j,j),b+rand(-j,j));x.lineTo(c+rand(-j,j),d+rand(-j,j));x.stroke()}}
function poly(x,p,fill,stroke='#444'){x.fillStyle=fill;x.beginPath();x.moveTo(...p[0]);for(let i=1;i<p.length;i++)x.lineTo(...p[i]);x.closePath();x.fill();for(let k=0;k<3;k++){x.strokeStyle=k? 'rgba(55,55,55,.38)':stroke;x.lineWidth=9-k*2;x.stroke()}}
function rr(x,a,b,w,h,r){x.beginPath();x.roundRect(a,b,w,h,r);}
function sketchRect(x,a,b,w,h,stroke='#444'){for(let k=0;k<3;k++){x.strokeStyle=k?'rgba(55,55,55,.34)':stroke;x.lineWidth=9-k*2;x.strokeRect(a+rand(-2,2),b+rand(-2,2),w+rand(-3,3),h+rand(-3,3))}}
function obstacleTexture(type){
  const c=document.createElement('canvas');c.width=420;c.height=1500;const x=c.getContext('2d');x.lineJoin=x.lineCap='round';
  if(type==='pencil'){
    poly(x,[[210,10],[90,270],[330,270]],'#d4b086');poly(x,[[210,10],[180,80],[240,80]],'#303234');
    x.fillStyle='#d2b63e';rr(x,90,250,240,990,24);x.fill();sketchRect(x,90,250,240,990);
    for(let y=330;y<1180;y+=70)line(x,105,y,315,y+5,'rgba(70,65,45,.20)',2,1,1);
    x.fillStyle='#aaa';rr(x,90,1220,240,100,18);x.fill();sketchRect(x,90,1220,240,100);
    x.fillStyle='#c67d79';rr(x,100,1300,220,150,28);x.fill();sketchRect(x,100,1300,220,150);
  }else if(type==='knife'){
    poly(x,[[210,12],[318,190],[295,620],[125,620],[102,190]],'#cfd2d0');
    for(let y=170;y<560;y+=65)line(x,140,y,280,y+20,'rgba(70,70,70,.42)',3,1.5,1);
    x.fillStyle='#c97a42';rr(x,80,560,260,870,45);x.fill();sketchRect(x,80,560,260,870);
    x.fillStyle='#e0a36c';rr(x,115,610,45,700,20);x.fill();
    x.fillStyle='#555';rr(x,145,730,130,145,28);x.fill();sketchRect(x,145,730,130,145,'#333');
  }else{
    poly(x,[[210,8],[175,120],[245,120]],'#3c4040');line(x,210,100,210,1360,'#4c5152',14,2,3);
    x.fillStyle='#879594';x.beginPath();x.moveTo(210,140);x.quadraticCurveTo(305,300,310,540);x.lineTo(275,1190);x.quadraticCurveTo(210,1255,145,1190);x.lineTo(110,540);x.quadraticCurveTo(115,300,210,140);x.closePath();x.fill();
    for(let k=0;k<3;k++){x.strokeStyle=k?'rgba(60,65,65,.42)':'#414646';x.lineWidth=8-k*2;x.stroke()}
    for(const o of[-55,-22,22,55]){x.strokeStyle='rgba(245,240,225,.38)';x.lineWidth=4;x.beginPath();x.moveTo(210,170);x.quadraticCurveTo(210+o,520,210+o*.55,1165);x.stroke()}
    line(x,210,1330,210,1400,'#3f4344',18,2,3);x.strokeStyle='#444';x.lineWidth=17;x.beginPath();x.moveTo(210,1390);x.quadraticCurveTo(210,1470,140,1458);x.stroke();
  }
  for(let i=0;i<2000;i++){x.strokeStyle=`rgba(50,50,50,${rand(0,.055)})`;x.lineWidth=rand(.3,1.2);x.beginPath();const px=rand(0,420),py=rand(0,1500);x.moveTo(px,py);x.lineTo(px+rand(1,9),py+rand(-2,2));x.stroke()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;return t;
}
const tex={pencil:obstacleTexture('pencil'),knife:obstacleTexture('knife'),umbrella:obstacleTexture('umbrella')},types=Object.keys(tex);

function smokeTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  for(let k=0;k<4;k++){x.strokeStyle=`rgba(55,55,55,${.34-k*.055})`;x.lineWidth=6-k;x.beginPath();x.arc(64+rand(-4,4),64+rand(-4,4),34+rand(-4,6),0,Math.PI*2);x.stroke()}
  for(let i=0;i<12;i++){x.fillStyle=`rgba(55,55,55,${rand(.08,.18)})`;x.fillRect(rand(34,94),rand(34,94),rand(2,5),rand(1,3))}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const smokeTex=smokeTexture(),smoke=[];
function puff(){
  const ex=player.position.x-PW*.36,ey=player.position.y-PH*.12;
  for(let i=0;i<9;i++){const m=new THREE.SpriteMaterial({map:smokeTex,transparent:true,opacity:rand(.3,.6),depthTest:false,depthWrite:false}),s=new THREE.Sprite(m),z=rand(.22,.40);s.scale.set(z,z,1);s.position.set(ex+rand(-.08,.08),ey+rand(-.1,.1),2.5);smokeLayer.add(s);const life=rand(.48,.76);smoke.push({s,vx:rand(-2.5,-1.2),vy:rand(-.7,.6),life,max:life,grow:rand(.6,1.1),spin:rand(-1.5,1.5)})}
}
function updateSmoke(dt){for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.life-=dt;p.s.position.x+=p.vx*dt;p.s.position.y+=p.vy*dt;p.vy+=.2*dt;const z=p.s.scale.x+p.grow*dt;p.s.scale.set(z,z,1);p.s.material.rotation+=p.spin*dt;p.s.material.opacity=.55*Math.max(0,p.life/p.max);if(p.life<=0){smokeLayer.remove(p.s);p.s.material.dispose();smoke.splice(i,1)}}}
function clearSmoke(){for(const p of smoke){smokeLayer.remove(p.s);p.s.material.dispose()}smoke.length=0}

const obstacles=[];let state='ready',score=0,best=Number(localStorage.getItem('flappyTestBest')||0)||0,vy=0,spawn=.5,readyT=0,pulse=0;
bestEl.textContent=best;finalBestEl.textContent=best;
function gap(){return 5.18-Math.min(score*.036,.88)} function speed(){return 2.60+Math.min(score*.052,1.38)} function interval(){return 1.93-Math.min(score*.009,.23)}
function spawnPair(){
  const type=types[Math.floor(Math.random()*types.length)],g=gap(),cy=rand(-2.1,2.1),group=new THREE.Group();
  const bm=new THREE.SpriteMaterial({map:tex[type],transparent:true,depthTest:false,depthWrite:false}),tm=bm.clone();tm.rotation=Math.PI;
  const bottom=new THREE.Sprite(bm),top=new THREE.Sprite(tm);bottom.scale.set(OW,OH,1);top.scale.set(OW,OH,1);
  bottom.position.set(0,cy-g/2-OH/2,1);top.position.set(0,cy+g/2+OH/2,1);group.add(bottom,top);group.position.x=HW+1.4;obstacleLayer.add(group);obstacles.push({group,cy,g,scored:false});
}
function flap(){vy=JUMP;pulse=1;puff()}
function reset(){for(const o of obstacles){obstacleLayer.remove(o.group);o.group.traverse(n=>n.material?.dispose())}obstacles.length=0;clearSmoke();score=0;vy=0;spawn=.55;player.position.set(PX,0,3);playerMat.rotation=0;player.scale.set(PW,PH,1);scoreEl.textContent='0';bestEl.textContent=best}
function start(){reset();state='playing';startPanel.classList.remove('visible');overPanel.classList.remove('visible');flap()}
function end(){if(state!=='playing')return;state='gameover';if(score>best){best=score;localStorage.setItem('flappyTestBest',String(best))}bestEl.textContent=best;finalScoreEl.textContent=score;finalBestEl.textContent=best;overPanel.classList.add('visible')}
function hit(o){const dx=Math.abs(o.group.position.x-PX);if(dx>=OW*.38+HITW/2)return false;const lo=o.cy-o.g/2,hi=o.cy+o.g/2;return player.position.y-HITH/2<lo||player.position.y+HITH/2>hi}
function update(dt){
  vy+=GRAV*dt;player.position.y+=vy*dt;playerMat.rotation=THREE.MathUtils.lerp(playerMat.rotation,THREE.MathUtils.clamp(vy*.055,-.55,.28),.14);
  pulse=Math.max(0,pulse-dt*6);const sq=1+pulse*.055;player.scale.set(PW/sq,PH*sq,1);spawn+=dt;if(spawn>=interval()){spawn=0;spawnPair()}
  for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.group.position.x-=speed()*dt;if(!o.scored&&o.group.position.x<PX){o.scored=true;score++;scoreEl.textContent=score}if(hit(o)){end();return}if(o.group.position.x<-HW-1.8){obstacleLayer.remove(o.group);o.group.traverse(n=>n.material?.dispose());obstacles.splice(i,1)}}
  if(player.position.y+HITH/2>HH-.06||player.position.y-HITH/2<-HH+.06)end();
}
function action(){if(state==='ready'||state==='gameover')start();else flap()}
startBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();start()});restartBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();start()});
shell.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;e.preventDefault();action()});window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();action()}});
window.addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(shell.clientWidth,shell.clientHeight,false)});
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),1/30);if(state==='ready'){readyT+=dt;player.position.y=Math.sin(readyT*2.15)*.22;playerMat.rotation=Math.sin(readyT*1.25)*.035}else if(state==='playing')update(dt);updateSmoke(dt);renderer.render(scene,camera)});
