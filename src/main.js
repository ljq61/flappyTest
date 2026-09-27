import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';

const WORLD_WIDTH = 9;
const WORLD_HEIGHT = 16;
const HALF_WIDTH = WORLD_WIDTH / 2;
const HALF_HEIGHT = WORLD_HEIGHT / 2;
const PLAYER_X = -1.8;
const PLAYER_RADIUS = 0.46;
const OBSTACLE_WIDTH = 1.48;
const OBSTACLE_HEIGHT = 10;
const GRAVITY = -14.2;
const FLAP_VELOCITY = 5.55;

// When the final character PNG is ready, upload it to the repo and set this URL.
const CHARACTER_IMAGE_URL = null; // Example: './assets/character.png'

const shell = document.querySelector('#game-shell');
const canvasHost = document.querySelector('#canvas-host');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const finalScoreEl = document.querySelector('#final-score');
const finalBestEl = document.querySelector('#final-best');
const startPanel = document.querySelector('#start-panel');
const gameOverPanel = document.querySelector('#game-over-panel');
const startButton = document.querySelector('#start-button');
const restartButton = document.querySelector('#restart-button');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(shell.clientWidth, shell.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  -HALF_WIDTH,
  HALF_WIDTH,
  HALF_HEIGHT,
  -HALF_HEIGHT,
  0.1,
  100,
);
camera.position.z = 10;

const obstacleLayer = new THREE.Group();
scene.add(obstacleLayer);

addBackgroundDecorations();

const playerTexture = createPlayerPlaceholderTexture();
const playerMaterial = new THREE.SpriteMaterial({
  map: playerTexture,
  transparent: true,
  depthTest: false,
});
const player = new THREE.Sprite(playerMaterial);
player.position.set(PLAYER_X, 0, 2);
player.scale.set(1.34, 1.34, 1);
scene.add(player);

if (CHARACTER_IMAGE_URL) {
  loadCharacterTexture(CHARACTER_IMAGE_URL);
}

const obstacleTextures = {
  pencil: createObstacleTexture('pencil'),
  knife: createObstacleTexture('knife'),
  umbrella: createObstacleTexture('umbrella'),
};

const obstacleTypes = Object.keys(obstacleTextures);
const obstacles = [];
const clock = new THREE.Clock();

let gameState = 'ready';
let score = 0;
let best = readBestScore();
let playerVelocity = 0;
let spawnTimer = 0;
let readyTime = 0;
let flapPulse = 0;

bestEl.textContent = String(best);
finalBestEl.textContent = String(best);

function addBackgroundDecorations() {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.23,
    depthWrite: false,
  });

  const cloudSpecs = [
    [-2.7, 5.35, 0.8],
    [2.25, 3.6, 0.65],
    [-3.05, -4.75, 0.55],
  ];

  for (const [x, y, scale] of cloudSpecs) {
    const cloud = new THREE.Group();
    for (const [cx, cy, radius] of [
      [-0.55, 0, 0.52],
      [0, 0.18, 0.7],
      [0.6, -0.02, 0.46],
    ]) {
      const circle = new THREE.Mesh(new THREE.CircleGeometry(radius * scale, 28), material.clone());
      circle.position.set(cx * scale, cy * scale, -4);
      cloud.add(circle);
    }
    cloud.position.set(x, y, 0);
    scene.add(cloud);
  }

  const dots = new THREE.Group();
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0x5f8d91,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const dotGeometry = new THREE.CircleGeometry(0.035, 12);
  for (let i = 0; i < 22; i += 1) {
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(
      THREE.MathUtils.randFloatSpread(8),
      THREE.MathUtils.randFloatSpread(14.5),
      -3.5,
    );
    dots.add(dot);
  }
  scene.add(dots);
}

function createPlayerPlaceholderTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(256, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.arc(0, 0, 206, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8bbfbf';
  ctx.beginPath();
  ctx.ellipse(-88, -18, 90, 130, -0.55, 0, Math.PI * 2);
  ctx.ellipse(88, -18, 90, 130, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#315a62';
  ctx.beginPath();
  ctx.ellipse(0, 16, 48, 128, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#315a62';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-16, -93);
  ctx.quadraticCurveTo(-72, -150, -88, -192);
  ctx.moveTo(16, -93);
  ctx.quadraticCurveTo(72, -150, 88, -192);
  ctx.stroke();

  ctx.fillStyle = '#f1c5b3';
  ctx.beginPath();
  ctx.arc(0, -52, 35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createObstacleTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (type === 'pencil') drawPencil(ctx);
  if (type === 'knife') drawKnife(ctx);
  if (type === 'umbrella') drawUmbrella(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function drawPencil(ctx) {
  ctx.save();

  // Wooden sharpened point: the point is at the top of the texture.
  ctx.fillStyle = '#d7a66f';
  ctx.strokeStyle = '#213f45';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(180, 24);
  ctx.lineTo(86, 218);
  ctx.lineTo(274, 218);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#253a3f';
  ctx.beginPath();
  ctx.moveTo(180, 24);
  ctx.lineTo(148, 90);
  ctx.lineTo(212, 90);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f3c54e';
  ctx.strokeStyle = '#213f45';
  ctx.lineWidth = 16;
  roundedRect(ctx, 86, 198, 188, 830, 26);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffe183';
  roundedRect(ctx, 113, 222, 36, 778, 17);
  ctx.fill();

  ctx.fillStyle = '#b9bec0';
  ctx.strokeStyle = '#213f45';
  ctx.lineWidth = 14;
  roundedRect(ctx, 85, 982, 190, 82, 15);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e98788';
  ctx.strokeStyle = '#213f45';
  roundedRect(ctx, 94, 1042, 172, 110, 24);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawKnife(ctx) {
  ctx.save();

  ctx.fillStyle = '#d9e1e2';
  ctx.strokeStyle = '#263e44';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(180, 20);
  ctx.lineTo(270, 150);
  ctx.lineTo(246, 520);
  ctx.lineTo(114, 520);
  ctx.lineTo(90, 150);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#87999d';
  ctx.lineWidth = 8;
  for (let y = 120; y < 460; y += 58) {
    ctx.beginPath();
    ctx.moveTo(122, y);
    ctx.lineTo(236, y + 20);
    ctx.stroke();
  }

  ctx.fillStyle = '#ef8d40';
  ctx.strokeStyle = '#263e44';
  ctx.lineWidth = 16;
  roundedRect(ctx, 75, 455, 210, 686, 40);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f6ae66';
  roundedRect(ctx, 106, 500, 46, 575, 20);
  ctx.fill();

  ctx.fillStyle = '#39545a';
  roundedRect(ctx, 132, 560, 96, 120, 28);
  ctx.fill();

  ctx.fillStyle = '#9bc3c1';
  roundedRect(ctx, 149, 575, 62, 85, 20);
  ctx.fill();

  ctx.restore();
}

function drawUmbrella(ctx) {
  ctx.save();

  ctx.strokeStyle = '#263f45';
  ctx.fillStyle = '#263f45';
  ctx.lineWidth = 14;

  ctx.beginPath();
  ctx.moveTo(180, 20);
  ctx.lineTo(149, 116);
  ctx.lineTo(211, 116);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#647c80';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(180, 94);
  ctx.lineTo(180, 1058);
  ctx.stroke();

  ctx.fillStyle = '#5f9c9d';
  ctx.strokeStyle = '#263f45';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(180, 128);
  ctx.quadraticCurveTo(252, 248, 254, 454);
  ctx.lineTo(224, 884);
  ctx.quadraticCurveTo(180, 930, 136, 884);
  ctx.lineTo(106, 454);
  ctx.quadraticCurveTo(108, 248, 180, 128);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#d9ece8';
  ctx.lineWidth = 8;
  for (const offset of [-50, -18, 18, 50]) {
    ctx.beginPath();
    ctx.moveTo(180, 150);
    ctx.quadraticCurveTo(180 + offset, 410, 180 + offset * 0.7, 866);
    ctx.stroke();
  }

  ctx.strokeStyle = '#263f45';
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.moveTo(180, 1038);
  ctx.lineTo(180, 1090);
  ctx.quadraticCurveTo(180, 1160, 112, 1150);
  ctx.quadraticCurveTo(78, 1144, 87, 1111);
  ctx.stroke();

  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadCharacterTexture(url) {
  const loader = new THREE.TextureLoader();
  loader.load(
    url,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      playerMaterial.map = texture;
      playerMaterial.needsUpdate = true;
    },
    undefined,
    () => {
      // Keep the built-in placeholder if the custom image is not available yet.
    },
  );
}

function createObstaclePair() {
  const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
  const gap = currentGap();
  const gapCenter = THREE.MathUtils.randFloat(-2.15, 2.15);
  const group = new THREE.Group();

  const bottomMaterial = new THREE.SpriteMaterial({
    map: obstacleTextures[type],
    transparent: true,
    depthTest: false,
  });
  const topMaterial = bottomMaterial.clone();
  topMaterial.rotation = Math.PI;

  const bottom = new THREE.Sprite(bottomMaterial);
  bottom.scale.set(OBSTACLE_WIDTH, OBSTACLE_HEIGHT, 1);
  bottom.position.set(0, gapCenter - gap / 2 - OBSTACLE_HEIGHT / 2, 1);

  const top = new THREE.Sprite(topMaterial);
  top.scale.set(OBSTACLE_WIDTH, OBSTACLE_HEIGHT, 1);
  top.position.set(0, gapCenter + gap / 2 + OBSTACLE_HEIGHT / 2, 1);

  group.add(bottom, top);
  group.position.x = HALF_WIDTH + 1.4;
  obstacleLayer.add(group);

  obstacles.push({
    group,
    gapCenter,
    gap,
    scored: false,
    type,
  });
}

function currentSpeed() {
  return 2.62 + Math.min(score * 0.05, 1.38);
}

function currentGap() {
  return 5.05 - Math.min(score * 0.035, 0.92);
}

function currentSpawnInterval() {
  return 1.92 - Math.min(score * 0.009, 0.23);
}

function flap() {
  playerVelocity = FLAP_VELOCITY;
  flapPulse = 1;
}

function startGame() {
  resetGame();
  gameState = 'playing';
  startPanel.classList.remove('visible');
  gameOverPanel.classList.remove('visible');
  flap();
}

function resetGame() {
  for (const obstacle of obstacles) {
    obstacleLayer.remove(obstacle.group);
    obstacle.group.traverse((child) => {
      if (child.material) child.material.dispose();
    });
  }
  obstacles.length = 0;

  score = 0;
  playerVelocity = 0;
  spawnTimer = 0.5;
  player.position.set(PLAYER_X, 0, 2);
  playerMaterial.rotation = 0;
  player.scale.set(1.34, 1.34, 1);
  updateScoreUI();
}

function endGame() {
  if (gameState !== 'playing') return;
  gameState = 'gameover';

  if (score > best) {
    best = score;
    writeBestScore(best);
  }

  bestEl.textContent = String(best);
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(best);
  gameOverPanel.classList.add('visible');
}

function updateScoreUI() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function updatePlaying(dt) {
  playerVelocity += GRAVITY * dt;
  player.position.y += playerVelocity * dt;

  const targetRotation = THREE.MathUtils.clamp(playerVelocity * 0.065, -0.72, 0.34);
  playerMaterial.rotation = THREE.MathUtils.lerp(playerMaterial.rotation, targetRotation, 0.12);

  flapPulse = Math.max(0, flapPulse - dt * 5.5);
  const pulseScale = 1 + flapPulse * 0.08;
  player.scale.set(1.34 * pulseScale, 1.34 / pulseScale, 1);

  spawnTimer += dt;
  if (spawnTimer >= currentSpawnInterval()) {
    spawnTimer = 0;
    createObstaclePair();
  }

  const speed = currentSpeed();
  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.group.position.x -= speed * dt;

    if (!obstacle.scored && obstacle.group.position.x < PLAYER_X) {
      obstacle.scored = true;
      score += 1;
      updateScoreUI();
    }

    if (hitsObstacle(obstacle)) {
      endGame();
      return;
    }

    if (obstacle.group.position.x < -HALF_WIDTH - 1.7) {
      obstacleLayer.remove(obstacle.group);
      obstacle.group.traverse((child) => {
        if (child.material) child.material.dispose();
      });
      obstacles.splice(i, 1);
    }
  }

  if (
    player.position.y + PLAYER_RADIUS > HALF_HEIGHT - 0.08 ||
    player.position.y - PLAYER_RADIUS < -HALF_HEIGHT + 0.08
  ) {
    endGame();
  }
}

function hitsObstacle(obstacle) {
  const dx = Math.abs(obstacle.group.position.x - PLAYER_X);
  const horizontalHit = dx < OBSTACLE_WIDTH * 0.42 + PLAYER_RADIUS;
  if (!horizontalHit) return false;

  const gapBottom = obstacle.gapCenter - obstacle.gap / 2;
  const gapTop = obstacle.gapCenter + obstacle.gap / 2;
  const playerBottom = player.position.y - PLAYER_RADIUS;
  const playerTop = player.position.y + PLAYER_RADIUS;

  return playerBottom < gapBottom || playerTop > gapTop;
}

function updateReady(dt) {
  readyTime += dt;
  player.position.y = Math.sin(readyTime * 2.25) * 0.24;
  playerMaterial.rotation = Math.sin(readyTime * 1.4) * 0.045;
}

function handleAction() {
  if (gameState === 'ready') {
    startGame();
    return;
  }

  if (gameState === 'playing') {
    flap();
    return;
  }

  if (gameState === 'gameover') {
    startGame();
  }
}

function readBestScore() {
  try {
    return Number.parseInt(localStorage.getItem('flappyTestBest') || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function writeBestScore(value) {
  try {
    localStorage.setItem('flappyTestBest', String(value));
  } catch {
    // Storage is optional; gameplay still works if it is unavailable.
  }
}

function onResize() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(shell.clientWidth, shell.clientHeight, false);
}

startButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  event.stopPropagation();
  startGame();
});

restartButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  event.stopPropagation();
  startGame();
});

shell.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  event.preventDefault();
  handleAction();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    handleAction();
  }
});

window.addEventListener('resize', onResize);

function animate() {
  const dt = Math.min(clock.getDelta(), 1 / 30);

  if (gameState === 'ready') updateReady(dt);
  if (gameState === 'playing') updatePlaying(dt);

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
