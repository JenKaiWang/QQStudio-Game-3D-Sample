const lanes = [-2.5, 0, 2.5];
const itemSpeedBase = 0.35;
const spawnIntervalSeconds = 0.9;

let scene, camera, renderer;
let player, roadSegments = [], obstacles = [], coins = [];
let lastTime = 0;
let gameState = 'start';
let score = 0;
let coinsCollected = 0;
let spawnTimer = 0;
let speedMultiplier = 1;
let scoreDisplay, coinDisplay, overlayStart, overlayGameOver, finalScoreLabel, finalCoinsLabel;
let startButton, restartButton;
let touchStart = null;

class RunnerPlayer {
  constructor() {
    const geometry = new THREE.BoxGeometry(1.2, 1.8, 1.2);
    const material = new THREE.MeshStandardMaterial({ color: 0x50c9ff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.currentLane = 1;
    this.targetLane = 1;
    this.jumpVelocity = 0;
    this.verticalPosition = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.mesh.position.set(lanes[1], 0.9, 0);
  }

  moveLeft() {
    this.targetLane = Math.max(0, this.targetLane - 1);
  }

  moveRight() {
    this.targetLane = Math.min(lanes.length - 1, this.targetLane + 1);
  }

  jump() {
    if (!this.isJumping && !this.isSliding) {
      this.isJumping = true;
      this.jumpVelocity = 0.45;
    }
  }

  slide() {
    if (!this.isJumping && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = 0.5;
      this.mesh.scale.y = 0.55;
      this.mesh.position.y = 0.55;
    }
  }

  update(delta) {
    const targetX = lanes[this.targetLane];
    const currentX = this.mesh.position.x;
    this.mesh.position.x = THREE.MathUtils.lerp(currentX, targetX, Math.min(1, delta * 10));

    if (this.isJumping) {
      this.verticalPosition += this.jumpVelocity * delta * 60;
      this.jumpVelocity -= 0.03 * delta * 60;
      if (this.verticalPosition <= 0) {
        this.verticalPosition = 0;
        this.jumpVelocity = 0;
        this.isJumping = false;
      }
    }

    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.mesh.scale.y = 1;
        this.mesh.position.y = 0.9 + this.verticalPosition;
      }
    }

    this.mesh.position.y = 0.9 + this.verticalPosition;
  }

  getBoundingBox() {
    const box = new THREE.Box3().setFromObject(this.mesh);
    return box;
  }
}

class RunnerObstacle {
  constructor(lane, type) {
    const height = type === 'low' ? 1 : 2;
    const geometry = new THREE.BoxGeometry(1.6, height, 1.6);
    const material = new THREE.MeshStandardMaterial({ color: 0xff7a5a });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.position.set(lanes[lane], height / 2, -100);
    this.lane = lane;
    this.type = type;
    this.active = true;
  }

  update(delta, speed) {
    this.mesh.position.z += speed * delta * 60;
    if (this.mesh.position.z > 12) {
      this.active = false;
    }
  }

  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}

class CoinItem {
  constructor(lane) {
    const geometry = new THREE.TorusGeometry(0.4, 0.14, 12, 24);
    const material = new THREE.MeshStandardMaterial({ color: 0xffe74c, emissive: 0x332d00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(lanes[lane], 1.6, -100);
    this.mesh.rotation.x = Math.PI / 2;
    this.lane = lane;
    this.active = true;
  }

  update(delta, speed) {
    this.mesh.position.z += speed * delta * 60;
    this.mesh.rotation.y += delta * 3;
    if (this.mesh.position.z > 12) {
      this.active = false;
    }
  }

  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}

function setupScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x101318, 10, 60);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 6.5, 10);
  camera.lookAt(0, 1, -10);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById('game-container').appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(0xddeeff, 0x202833, 0.9);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 10, 10);
  directional.castShadow = true;
  directional.shadow.camera.top = 10;
  directional.shadow.camera.bottom = -10;
  directional.shadow.camera.left = -10;
  directional.shadow.camera.right = 10;
  scene.add(directional);

  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x182239 });
  for (let i = 0; i < 25; i += 1) {
    const geometry = new THREE.BoxGeometry(10.5, 0.2, 10);
    const segment = new THREE.Mesh(geometry, groundMaterial);
    segment.receiveShadow = true;
    segment.position.set(0, -0.1, -i * 10);
    scene.add(segment);
    roadSegments.push(segment);
  }

  const laneDividerMaterial = new THREE.MeshBasicMaterial({ color: 0x4c6bff });
  for (let lane = 0; lane < 2; lane += 1) {
    const lineGeo = new THREE.PlaneGeometry(0.1, 250);
    const line = new THREE.Mesh(lineGeo, laneDividerMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(lanes[lane] + 1.25, 0.01, -120);
    scene.add(line);
  }

  player = new RunnerPlayer();
  scene.add(player.mesh);
}

function resize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetGame() {
  score = 0;
  coinsCollected = 0;
  spawnTimer = 0;
  speedMultiplier = 1;
  obstacles.forEach((ob) => scene.remove(ob.mesh));
  coins.forEach((coin) => scene.remove(coin.mesh));
  obstacles = [];
  coins = [];
  player.targetLane = 1;
  player.currentLane = 1;
  player.mesh.position.set(lanes[1], 0.9, 0);
  player.mesh.scale.set(1, 1, 1);
  player.verticalPosition = 0;
  player.isJumping = false;
  player.isSliding = false;
  scoreDisplay.textContent = '0';
  coinDisplay.textContent = '0';
}

function startGame() {
  resetGame();
  gameState = 'playing';
  overlayStart.classList.remove('active');
  overlayGameOver.classList.remove('active');
}

function endGame() {
  gameState = 'over';
  finalScoreLabel.textContent = `Score: ${Math.floor(score)}`;
  finalCoinsLabel.textContent = `Coins: ${coinsCollected}`;
  overlayGameOver.classList.add('active');
}

function spawnItem() {
  const choice = Math.random();
  const lane = Math.floor(Math.random() * lanes.length);
  if (choice < 0.55) {
    const obstacleType = Math.random() < 0.55 ? 'low' : 'high';
    const obstacle = new RunnerObstacle(lane, obstacleType);
    obstacle.mesh.position.z = -110;
    scene.add(obstacle.mesh);
    obstacles.push(obstacle);
  } else {
    const coin = new CoinItem(lane);
    coin.mesh.position.z = -110;
    scene.add(coin.mesh);
    coins.push(coin);
  }
}

function updateRoad(delta, speed) {
  for (const segment of roadSegments) {
    segment.position.z += speed * delta * 60;
    if (segment.position.z > 10) {
      segment.position.z -= 250;
    }
  }
}

function updateGame(delta) {
  const speed = (itemSpeedBase + score * 0.002) * speedMultiplier;
  score += delta * 20;
  scoreDisplay.textContent = `${Math.floor(score)}`;
  coinDisplay.textContent = `${coinsCollected}`;

  player.update(delta);
  updateRoad(delta, speed);

  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnItem();
    spawnTimer = spawnIntervalSeconds - Math.min(0.4, score * 0.005);
  }

  for (const obstacle of obstacles) {
    obstacle.update(delta, speed);
  }
  obstacles = obstacles.filter((ob) => {
    if (!ob.active) {
      scene.remove(ob.mesh);
      return false;
    }
    return true;
  });

  for (const coin of coins) {
    coin.update(delta, speed);
  }
  coins = coins.filter((coin) => {
    if (!coin.active) {
      scene.remove(coin.mesh);
      return false;
    }
    return true;
  });

  detectCollisions();
}

function detectCollisions() {
  const playerBox = player.getBoundingBox();

  for (const obstacle of obstacles) {
    const obstacleBox = obstacle.getBoundingBox();
    if (playerBox.intersectsBox(obstacleBox)) {
      if (player.isJumping && obstacle.type === 'low') {
        continue;
      }
      if (player.isSliding && obstacle.type === 'high') {
        continue;
      }
      endGame();
      return;
    }
  }

  for (const coin of coins) {
    const coinBox = coin.getBoundingBox();
    if (playerBox.intersectsBox(coinBox)) {
      coinsCollected += 1;
      coin.active = false;
      scene.remove(coin.mesh);
    }
  }
}

function animate(time) {
  const seconds = time / 1000;
  const delta = Math.min(0.05, seconds - lastTime);
  lastTime = seconds;

  if (gameState === 'playing') {
    updateGame(delta);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function handleKey(event) {
  if (gameState !== 'playing') return;
  switch (event.code) {
    case 'ArrowLeft':
      player.moveLeft();
      break;
    case 'ArrowRight':
      player.moveRight();
      break;
    case 'ArrowUp':
      player.jump();
      break;
    case 'ArrowDown':
      player.slide();
      break;
  }
}

function handleTouchStart(event) {
  if (!event.changedTouches.length) return;
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
}

function handleTouchEnd(event) {
  if (!touchStart || !event.changedTouches.length) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const threshold = 30;

  if (absX > absY && absX > threshold) {
    if (dx > 0) player.moveRight();
    else player.moveLeft();
  } else if (absY > absX && absY > threshold) {
    if (dy < 0) player.jump();
    else player.slide();
  }
}

function init() {
  scoreDisplay = document.getElementById('score-value');
  coinDisplay = document.getElementById('coin-value');
  overlayStart = document.getElementById('overlay-start');
  overlayGameOver = document.getElementById('overlay-gameover');
  finalScoreLabel = document.getElementById('final-score');
  finalCoinsLabel = document.getElementById('final-coins');
  startButton = document.getElementById('start-button');
  restartButton = document.getElementById('restart-button');

  setupScene();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', handleKey);
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchend', handleTouchEnd, { passive: true });

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);

  requestAnimationFrame(animate);
}

init();
