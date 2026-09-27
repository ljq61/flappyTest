import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import { HERO_IMAGE_URL } from './hero-data.js';

const W = 9, H = 16, HW = W / 2, HH = H / 2;
const PX = -1.72;
// v2 character size was 2.15 x 2.87; this is exactly half.
const PW = 1.075, PH = 1.435, HITW = 0.60, HITH = 0.78;
const OW = 1.72, OH = 11.6;
const GRAV = -15.0, JUMP = 5.72, MAX_HP = 3;
const ELECTRIC_SCORE = 20;

const shell = document.querySelector('#game-shell');
const host = document.querySelector('#canvas-host');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const heartsEl = document.querySelector('#hearts');
const finalScoreEl = document.querySelector('#final-score');
const finalBestEl = document.querySelector('#final-best');
const startPanel = document.querySelector('#start-panel');
const overPanel = document.querySelector('#game-over-panel');
const startBtn = document.querySelector('#start-button');
const restartBtn = document.querySelector('#restart-button');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(shell.clientWidth, shell.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-HW, HW, HH, -HH, 0.1, 100);
camera.position.z = 10;
const bgLayer = new THREE.Group();
const obstacleLayer = new THREE.Group();
const pickupLayer = new THREE.Group();
const fxLayer = new THREE.Group();
scene.add(bgLayer, obstacleLayer, pickupLayer, fxLayer);

function rand(a, b) { return a + Math.random() * (b - a); }

function paperTexture() {
  const c = document.createElement('canvas');
  c.width = 720; c.height = 1280;
  const x = c.getContext('2d');
  x.fillStyle = '#f2ecdd'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = 'rgba(70,78,83,.10)'; x.lineWidth = 1;
  for (let y = 70; y < 1280; y += 66) {
    x.beginPath(); x.moveTo(0, y + rand(-2, 2)); x.lineTo(720, y + rand(-2, 2)); x.stroke();
  }
  x.strokeStyle = 'rgba(115,72,68,.11)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(76, 0); x.lineTo(76, 1280); x.stroke();
  for (let i = 0; i < 420; i++) {
    x.strokeStyle = `rgba(60,58,52,${rand(.01, .045)})`;
    x.beginPath(); x.moveTo(rand(0, 720), rand(0, 1280)); x.lineTo(rand(0, 720), rand(0, 1280)); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const paper = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: paperTexture(), depthWrite: false }));
paper.position.z = -8; bgLayer.add(paper);
for (const [x, y, s] of [[-3.4, 5.4, .5], [3.2, 3.2, .6], [-3.1, -4.8, .48], [3.1, -5.4, .4]]) {
  const pts = [];
  for (let i = 0; i < 30; i++) {
    const t = i / 29 * Math.PI * 4.5, r = (.08 + i / 29 * .58) * s;
    pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, -6));
  }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: .12 }));
  l.position.set(x, y, 0); bgLayer.add(l);
}

const playerMat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false });
const player = new THREE.Sprite(playerMat);
player.position.set(PX, 0, 3); player.scale.set(PW, PH, 1); scene.add(player);
new THREE.TextureLoader().load(HERO_IMAGE_URL, t => {
  t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  playerMat.map = t; playerMat.needsUpdate = true;
});

function line(x, a, b, c, d, color = '#444', w = 7, j = 2, n = 3) {
  for (let k = 0; k < n; k++) {
    x.strokeStyle = color; x.lineWidth = Math.max(1, w - k * 1.5); x.beginPath();
    x.moveTo(a + rand(-j, j), b + rand(-j, j)); x.lineTo(c + rand(-j, j), d + rand(-j, j)); x.stroke();
  }
}
function poly(x, p, fill, stroke = '#444') {
  x.fillStyle = fill; x.beginPath(); x.moveTo(...p[0]);
  for (let i = 1; i < p.length; i++) x.lineTo(...p[i]);
  x.closePath(); x.fill();
  for (let k = 0; k < 3; k++) { x.strokeStyle = k ? 'rgba(55,55,55,.38)' : stroke; x.lineWidth = 9 - k * 2; x.stroke(); }
}
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
function sketchRect(x, a, b, w, h, stroke = '#444') {
  for (let k = 0; k < 3; k++) {
    x.strokeStyle = k ? 'rgba(55,55,55,.34)' : stroke; x.lineWidth = 9 - k * 2;
    x.strokeRect(a + rand(-2, 2), b + rand(-2, 2), w + rand(-3, 3), h + rand(-3, 3));
  }
}
function obstacleTexture(type) {
  const c = document.createElement('canvas'); c.width = 420; c.height = 1500;
  const x = c.getContext('2d'); x.lineJoin = x.lineCap = 'round';
  if (type === 'pencil') {
    poly(x, [[210, 10], [90, 270], [330, 270]], '#d4b086'); poly(x, [[210, 10], [180, 80], [240, 80]], '#303234');
    x.fillStyle = '#d2b63e'; rr(x, 90, 250, 240, 990, 24); x.fill(); sketchRect(x, 90, 250, 240, 990);
    for (let y = 330; y < 1180; y += 70) line(x, 105, y, 315, y + 5, 'rgba(70,65,45,.20)', 2, 1, 1);
    x.fillStyle = '#aaa'; rr(x, 90, 1220, 240, 100, 18); x.fill(); sketchRect(x, 90, 1220, 240, 100);
    x.fillStyle = '#c67d79'; rr(x, 100, 1300, 220, 150, 28); x.fill(); sketchRect(x, 100, 1300, 220, 150);
  } else if (type === 'knife') {
    poly(x, [[210, 12], [318, 190], [295, 620], [125, 620], [102, 190]], '#cfd2d0');
    for (let y = 170; y < 560; y += 65) line(x, 140, y, 280, y + 20, 'rgba(70,70,70,.42)', 3, 1.5, 1);
    x.fillStyle = '#c97a42'; rr(x, 80, 560, 260, 870, 45); x.fill(); sketchRect(x, 80, 560, 260, 870);
    x.fillStyle = '#e0a36c'; rr(x, 115, 610, 45, 700, 20); x.fill();
    x.fillStyle = '#555'; rr(x, 145, 730, 130, 145, 28); x.fill(); sketchRect(x, 145, 730, 130, 145, '#333');
  } else {
    poly(x, [[210, 8], [175, 120], [245, 120]], '#3c4040'); line(x, 210, 100, 210, 1360, '#4c5152', 14, 2, 3);
    x.fillStyle = '#879594'; x.beginPath(); x.moveTo(210, 140); x.quadraticCurveTo(305, 300, 310, 540); x.lineTo(275, 1190);
    x.quadraticCurveTo(210, 1255, 145, 1190); x.lineTo(110, 540); x.quadraticCurveTo(115, 300, 210, 140); x.closePath(); x.fill();
    for (let k = 0; k < 3; k++) { x.strokeStyle = k ? 'rgba(60,65,65,.42)' : '#414646'; x.lineWidth = 8 - k * 2; x.stroke(); }
    for (const o of [-55, -22, 22, 55]) { x.strokeStyle = 'rgba(245,240,225,.38)'; x.lineWidth = 4; x.beginPath(); x.moveTo(210, 170); x.quadraticCurveTo(210 + o, 520, 210 + o * .55, 1165); x.stroke(); }
    line(x, 210, 1330, 210, 1400, '#3f4344', 18, 2, 3); x.strokeStyle = '#444'; x.lineWidth = 17; x.beginPath(); x.moveTo(210, 1390); x.quadraticCurveTo(210, 1470, 140, 1458); x.stroke();
  }
  for (let i = 0; i < 1700; i++) {
    x.strokeStyle = `rgba(50,50,50,${rand(0, .055)})`; x.lineWidth = rand(.3, 1.2); x.beginPath();
    const px = rand(0, 420), py = rand(0, 1500); x.moveTo(px, py); x.lineTo(px + rand(1, 9), py + rand(-2, 2)); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; return t;
}
const obstacleTex = { pencil: obstacleTexture('pencil'), knife: obstacleTexture('knife'), umbrella: obstacleTexture('umbrella') };
const obstacleTypes = Object.keys(obstacleTex);

function smokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  for (let k = 0; k < 4; k++) { x.strokeStyle = `rgba(55,55,55,${.34 - k * .055})`; x.lineWidth = 6 - k; x.beginPath(); x.arc(64 + rand(-4, 4), 64 + rand(-4, 4), 34 + rand(-4, 6), 0, Math.PI * 2); x.stroke(); }
  for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(55,55,55,${rand(.08, .18)})`; x.fillRect(rand(34, 94), rand(34, 94), rand(2, 5), rand(1, 3)); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const smokeTex = smokeTexture();

function pickupTexture(type) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.lineJoin = x.lineCap = 'round';
  if (type === 'dorayaki') {
    for (let k = 0; k < 3; k++) { x.fillStyle = k === 0 ? '#b66b35' : k === 1 ? '#d28a4d' : '#b66b35'; x.beginPath(); x.ellipse(128, 78 + k * 48, 82 - k * 6, 42, 0, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = '#4b2a22'; x.beginPath(); x.ellipse(128, 130, 68, 25, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#4d4740'; x.lineWidth = 7; for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(128 + rand(-2, 2), 128 + rand(-2, 2), 90 + rand(-3, 3), 83 + rand(-3, 3), 0, 0, Math.PI * 2); x.stroke(); }
    for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(60,45,35,${rand(.04, .13)})`; x.fillRect(rand(55, 200), rand(50, 205), rand(1, 4), rand(1, 3)); }
  } else {
    x.strokeStyle = '#4b5048'; x.lineWidth = 8; x.fillStyle = '#9cad88';
    x.beginPath(); x.roundRect(78, 70, 100, 135, 18); x.fill(); x.stroke();
    x.fillStyle = '#596b46'; x.fillRect(88, 126, 80, 68); x.strokeRect(88, 126, 80, 68);
    x.fillStyle = '#747c70'; x.beginPath(); x.roundRect(101, 38, 54, 42, 9); x.fill(); x.stroke();
    x.strokeStyle = '#e7e1d1'; x.lineWidth = 9; x.beginPath(); x.moveTo(108, 145); x.lineTo(148, 180); x.moveTo(148, 145); x.lineTo(108, 180); x.stroke();
    x.strokeStyle = 'rgba(66,78,55,.5)'; x.lineWidth = 3; for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(rand(90, 165), rand(90, 200)); x.lineTo(rand(90, 165), rand(90, 200)); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const pickupTex = { dorayaki: pickupTexture('dorayaki'), poison: pickupTexture('poison') };

function particleTexture(color, kind = 'drop') {
  const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
  x.fillStyle = color; x.strokeStyle = 'rgba(60,50,45,.42)'; x.lineWidth = 4;
  if (kind === 'drop') {
    x.beginPath(); x.moveTo(48, 12); x.quadraticCurveTo(72, 45, 70, 61); x.arc(48, 60, 22, 0, Math.PI * 2); x.fill(); x.stroke();
  } else {
    for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(rand(30, 65), rand(30, 65), rand(7, 15), 0, Math.PI * 2); x.fill(); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const bloodTex = particleTexture('#a44f4f');
const poisonFxTex = particleTexture('#68875b', 'splat');

const smoke = [], particles = [], obstacles = [], pickups = [];
let state = 'ready';
let score = 0;
let best = Number(localStorage.getItem('flappyTestBest') || 0) || 0;
let hp = MAX_HP;
let vy = 0, spawn = .4, readyT = 0, pulse = 0, invuln = 0, gameTime = 0;

bestEl.textContent = best; finalBestEl.textContent = best;
updateHearts();

function updateHearts() {
  if (!heartsEl) return;
  const children = [...heartsEl.querySelectorAll('.heart')];
  children.forEach((el, i) => el.classList.toggle('empty', i >= hp));
}

function puff() {
  const ex = player.position.x - PW * .37, ey = player.position.y - PH * .12;
  for (let i = 0; i < 8; i++) {
    const m = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: rand(.3, .58), depthTest: false, depthWrite: false });
    const s = new THREE.Sprite(m), z = rand(.16, .30); s.scale.set(z, z, 1); s.position.set(ex + rand(-.05, .05), ey + rand(-.06, .06), 2.5); fxLayer.add(s);
    const life = rand(.42, .68); smoke.push({ s, vx: rand(-2.6, -1.35), vy: rand(-.5, .5), life, max: life, grow: rand(.45, .85), spin: rand(-1.5, 1.5) });
  }
}
function burst(type) {
  const tex = type === 'poison' ? poisonFxTex : bloodTex;
  const count = type === 'poison' ? 10 : 14;
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: rand(.65, .95), depthTest: false, depthWrite: false });
    const s = new THREE.Sprite(m), z = rand(.07, .16); s.scale.set(z, z * rand(.75, 1.25), 1); s.position.set(player.position.x + rand(-.18, .18), player.position.y + rand(-.18, .18), 4); fxLayer.add(s);
    const life = rand(.35, .75); particles.push({ s, vx: rand(-2.2, 2.2), vy: rand(-.7, 2.8), life, max: life, g: rand(-5.5, -3.8), spin: rand(-4, 4) });
  }
}
function updateFx(dt) {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i]; p.life -= dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.vy += .2 * dt;
    const z = p.s.scale.x + p.grow * dt; p.s.scale.set(z, z, 1); p.s.material.rotation += p.spin * dt; p.s.material.opacity = .55 * Math.max(0, p.life / p.max);
    if (p.life <= 0) { fxLayer.remove(p.s); p.s.material.dispose(); smoke.splice(i, 1); }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt; p.vy += p.g * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.material.rotation += p.spin * dt;
    p.s.material.opacity = Math.max(0, p.life / p.max);
    if (p.life <= 0) { fxLayer.remove(p.s); p.s.material.dispose(); particles.splice(i, 1); }
  }
}
function clearFx() {
  for (const p of [...smoke, ...particles]) { fxLayer.remove(p.s); p.s.material.dispose(); }
  smoke.length = 0; particles.length = 0;
}

let audioCtx = null;
function audio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playFart() {
  const a = audio(), now = a.currentTime;
  const osc = a.createOscillator(), gain = a.createGain(), filter = a.createBiquadFilter();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(rand(105, 125), now); osc.frequency.exponentialRampToValueAtTime(rand(48, 64), now + .16);
  filter.type = 'lowpass'; filter.frequency.setValueAtTime(240, now); filter.Q.value = 2.5;
  gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.13, now + .015); gain.gain.exponentialRampToValueAtTime(.0001, now + .19);
  osc.connect(filter); filter.connect(gain); gain.connect(a.destination); osc.start(now); osc.stop(now + .2);
  const len = Math.floor(a.sampleRate * .12), b = a.createBuffer(1, len, a.sampleRate), data = b.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(), ng = a.createGain(), nf = a.createBiquadFilter(); src.buffer = b; nf.type = 'lowpass'; nf.frequency.value = 180; ng.gain.value = .06;
  src.connect(nf); nf.connect(ng); ng.connect(a.destination); src.start(now); src.stop(now + .12);
}
function playCry() {
  const a = audio(), now = a.currentTime;
  const gain = a.createGain(); gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.16, now + .025); gain.gain.exponentialRampToValueAtTime(.0001, now + .46); gain.connect(a.destination);
  for (const [f, detune] of [[520, -7], [690, 11]]) {
    const o = a.createOscillator(), filt = a.createBiquadFilter(); o.type = 'triangle'; o.detune.value = detune;
    o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(f * .46, now + .42);
    filt.type = 'bandpass'; filt.frequency.value = 720; filt.Q.value = .8; o.connect(filt); filt.connect(gain); o.start(now); o.stop(now + .48);
  }
}
function playHeal() {
  const a = audio(), now = a.currentTime;
  [0, .08, .16].forEach((d, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = [520, 660, 790][i]; g.gain.setValueAtTime(.0001, now + d); g.gain.exponentialRampToValueAtTime(.10, now + d + .015); g.gain.exponentialRampToValueAtTime(.0001, now + d + .16); o.connect(g); g.connect(a.destination); o.start(now + d); o.stop(now + d + .18); });
}
function playZap() {
  const a = audio(), now = a.currentTime, len = Math.floor(a.sampleRate * .12), b = a.createBuffer(1, len, a.sampleRate), data = b.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; f.type = 'highpass'; f.frequency.value = 900; g.gain.value = .12; src.connect(f); f.connect(g); g.connect(a.destination); src.start(now); src.stop(now + .12);
}

function gap() { return 3.85 - Math.min(score * .028, .78); }
function speed() { return 3.15 + Math.min(score * .068, 1.70); }
function interval() { return 1.68 - Math.min(score * .0085, .25); }

function createElectric(g, cy) {
  const group = new THREE.Group();
  const lines = [];
  for (let j = 0; j < 3; j++) {
    const geometry = new THREE.BufferGeometry();
    const arr = new Float32Array(19 * 3); geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const material = new THREE.LineBasicMaterial({ color: j === 0 ? 0x4f7f73 : 0x92b7a6, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const l = new THREE.Line(geometry, material); l.position.z = 2.4; group.add(l); lines.push(l);
  }
  obstacleLayer.add(group);
  return { group, lines, g, cy, offset: rand(0, 1.8), active: false, jitter: 0 };
}
function redrawElectric(e) {
  const lo = e.cy - e.g / 2 + .06, hi = e.cy + e.g / 2 - .06;
  e.lines.forEach((l, j) => {
    const a = l.geometry.attributes.position.array;
    for (let i = 0; i < 19; i++) {
      const t = i / 18, idx = i * 3;
      a[idx] = Math.sin(t * 22 + gameTime * 18 + j) * .09 + rand(-.08, .08) + (j - 1) * .035;
      a[idx + 1] = lo + (hi - lo) * t;
      a[idx + 2] = 0;
    }
    l.geometry.attributes.position.needsUpdate = true;
  });
}
function updateElectric(o, dt) {
  if (!o.electric) return;
  o.electric.group.position.x = o.group.position.x;
  const phase = (gameTime + o.electric.offset) % 1.95;
  o.electric.active = phase < .62;
  const warning = phase >= .62 && phase < .90;
  o.electric.lines.forEach((l, i) => { l.material.opacity = o.electric.active ? (.95 - i * .18) : (warning ? .12 : 0); });
  o.electric.jitter -= dt;
  if (o.electric.active && o.electric.jitter <= 0) { o.electric.jitter = .045; redrawElectric(o.electric); }
}
function disposeElectric(e) {
  if (!e) return;
  obstacleLayer.remove(e.group);
  e.lines.forEach(l => { l.geometry.dispose(); l.material.dispose(); });
}

function spawnPickup(cy, g, x) {
  const r = Math.random(); let type = null;
  if (r < .23) type = 'dorayaki'; else if (r < .40) type = 'poison';
  if (!type) return;
  const mat = new THREE.SpriteMaterial({ map: pickupTex[type], transparent: true, depthTest: false, depthWrite: false });
  const s = new THREE.Sprite(mat); const size = type === 'dorayaki' ? .74 : .68;
  s.scale.set(size, size, 1); s.position.set(x + rand(.35, .9), cy + rand(-g * .22, g * .22), 2.2); pickupLayer.add(s);
  pickups.push({ type, s, r: size * .34, bob: rand(0, Math.PI * 2) });
}
function spawnPair() {
  const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)], g = gap(), cy = rand(-2.45, 2.45), group = new THREE.Group();
  const bm = new THREE.SpriteMaterial({ map: obstacleTex[type], transparent: true, depthTest: false, depthWrite: false }), tm = bm.clone(); tm.rotation = Math.PI;
  const bottom = new THREE.Sprite(bm), top = new THREE.Sprite(tm); bottom.scale.set(OW, OH, 1); top.scale.set(OW, OH, 1);
  bottom.position.set(0, cy - g / 2 - OH / 2, 1); top.position.set(0, cy + g / 2 + OH / 2, 1); group.add(bottom, top); group.position.x = HW + 1.4; obstacleLayer.add(group);
  const electric = score >= ELECTRIC_SCORE ? createElectric(g, cy) : null;
  if (electric) electric.group.position.x = group.position.x;
  obstacles.push({ group, cy, g, scored: false, electric });
  spawnPickup(cy, g, group.position.x);
}

function flap() { vy = JUMP; pulse = 1; puff(); playFart(); }
function damage(kind = 'spike') {
  if (state !== 'playing' || invuln > 0 || hp <= 0) return false;
  hp -= 1; invuln = 1.05; updateHearts();
  if (kind === 'poison') burst('poison'); else burst('blood');
  playCry(); if (kind === 'electric') playZap();
  vy = kind === 'poison' ? Math.max(vy, 1.4) : Math.max(vy, 2.25);
  if (hp <= 0) end();
  return true;
}
function heal() {
  if (hp < MAX_HP) { hp += 1; updateHearts(); }
  playHeal();
}

function clearPickups() {
  for (const p of pickups) { pickupLayer.remove(p.s); p.s.material.dispose(); }
  pickups.length = 0;
}
function reset() {
  for (const o of obstacles) { obstacleLayer.remove(o.group); o.group.traverse(n => n.material?.dispose()); disposeElectric(o.electric); }
  obstacles.length = 0; clearPickups(); clearFx();
  score = 0; hp = MAX_HP; invuln = 0; vy = 0; spawn = .48; gameTime = 0;
  player.position.set(PX, 0, 3); playerMat.rotation = 0; playerMat.opacity = 1; player.scale.set(PW, PH, 1);
  scoreEl.textContent = '0'; bestEl.textContent = best; updateHearts();
}
function start() {
  audio(); reset(); state = 'playing'; startPanel.classList.remove('visible'); overPanel.classList.remove('visible'); flap();
}
function end() {
  if (state !== 'playing') return;
  state = 'gameover'; playerMat.opacity = 1;
  if (score > best) { best = score; localStorage.setItem('flappyTestBest', String(best)); }
  bestEl.textContent = best; finalScoreEl.textContent = score; finalBestEl.textContent = best; overPanel.classList.add('visible');
}

function hitObstacle(o) {
  const dx = Math.abs(o.group.position.x - PX);
  if (dx >= OW * .37 + HITW / 2) return false;
  const lo = o.cy - o.g / 2, hi = o.cy + o.g / 2;
  return player.position.y - HITH / 2 < lo || player.position.y + HITH / 2 > hi;
}
function hitPickup(p) {
  const dx = p.s.position.x - PX, dy = p.s.position.y - player.position.y;
  return dx * dx + dy * dy < (p.r + HITW * .35) ** 2;
}
function updatePickups(dt) {
  const spd = speed();
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.s.position.x -= spd * dt; p.bob += dt * 4.4; p.s.position.y += Math.sin(p.bob) * .0025; p.s.material.rotation = Math.sin(p.bob * .7) * .08;
    if (hitPickup(p)) {
      if (p.type === 'dorayaki') heal(); else damage('poison');
      pickupLayer.remove(p.s); p.s.material.dispose(); pickups.splice(i, 1); continue;
    }
    if (p.s.position.x < -HW - 1) { pickupLayer.remove(p.s); p.s.material.dispose(); pickups.splice(i, 1); }
  }
}

function update(dt) {
  gameTime += dt;
  invuln = Math.max(0, invuln - dt);
  playerMat.opacity = invuln > 0 && Math.floor(invuln * 15) % 2 ? .38 : 1;

  vy += GRAV * dt; player.position.y += vy * dt;
  playerMat.rotation = THREE.MathUtils.lerp(playerMat.rotation, THREE.MathUtils.clamp(vy * .055, -.55, .28), .14);
  pulse = Math.max(0, pulse - dt * 6); const sq = 1 + pulse * .055; player.scale.set(PW / sq, PH * sq, 1);

  spawn += dt;
  if (spawn >= interval()) { spawn = 0; spawnPair(); }

  const spd = speed();
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i]; o.group.position.x -= spd * dt; updateElectric(o, dt);
    if (!o.scored && o.group.position.x < PX) { o.scored = true; score += 1; scoreEl.textContent = score; }

    if (hitObstacle(o)) {
      if (damage('spike')) player.position.y += player.position.y > o.cy ? -.16 : .16;
    } else if (o.electric?.active) {
      const dx = Math.abs(o.group.position.x - PX);
      const insideGap = player.position.y > o.cy - o.g / 2 && player.position.y < o.cy + o.g / 2;
      if (dx < HITW * .55 + .16 && insideGap) damage('electric');
    }

    if (o.group.position.x < -HW - 1.8) {
      obstacleLayer.remove(o.group); o.group.traverse(n => n.material?.dispose()); disposeElectric(o.electric); obstacles.splice(i, 1);
    }
  }

  updatePickups(dt);

  if (player.position.y + HITH / 2 > HH - .06) {
    player.position.y = HH - HITH / 2 - .08; vy = Math.min(vy, -2.1); damage('spike');
  } else if (player.position.y - HITH / 2 < -HH + .06) {
    player.position.y = -HH + HITH / 2 + .08; vy = Math.max(vy, 2.6); damage('spike');
  }
}

function action() { if (state === 'ready' || state === 'gameover') start(); else flap(); }
startBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); start(); });
restartBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); start(); });
shell.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; e.preventDefault(); action(); });
window.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); action(); } });
window.addEventListener('resize', () => { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(shell.clientWidth, shell.clientHeight, false); });

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (state === 'ready') { readyT += dt; player.position.y = Math.sin(readyT * 2.15) * .22; playerMat.rotation = Math.sin(readyT * 1.25) * .035; }
  else if (state === 'playing') update(dt);
  updateFx(dt);
  renderer.render(scene, camera);
});
