import * as THREE from 'three';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/FBXLoader.js';

const lanes = [-2.5, 0, 2.5];
const itemSpeedBase = 0.35;
const spawnIntervalSeconds = 1;
const gameOverDelaySeconds = 0.8;
const obstacleTypes = ['low', 'tall', 'overhead'];
const characterAssetVersion = '2026-06-09-new-skin';

let scene, camera, renderer;
let player, roadSegments = [], obstacles = [], coins = [];
let lastTime = 0;
let gameState = 'start';
let score = 0;
let coinsCollected = 0;
let spawnTimer = 0;
let speedMultiplier = 1;
let gameOverTimer = 0;
let lastObstacleType = null;
let scoreDisplay, coinDisplay, overlayStart, overlayGameOver, finalScoreLabel, finalCoinsLabel;
let startButton, restartButton, loadingStatus;
let touchStart = null;

class RunnerPlayer {
  constructor(onLoadingStatus) {
    const colliderGeometry = new THREE.BoxGeometry(1.2, 1.8, 1.2);
    const colliderMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, visible: false });
    this.collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
    this.collider.castShadow = false;
    this.collider.receiveShadow = false;

    this.mesh = new THREE.Group();
    this.mesh.add(this.collider);

    const placeholderGeometry = new THREE.BoxGeometry(1.2, 1.8, 1.2);
    const placeholderMaterial = new THREE.MeshStandardMaterial({ color: 0x50c9ff });
    this.placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    this.placeholder.castShadow = true;
    this.mesh.add(this.placeholder);

    this.currentLane = 1;
    this.targetLane = 1;
    this.jumpVelocity = 0;
    this.verticalPosition = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;

    this.mesh.position.set(lanes[1], 0.9, 0);

    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.isModelLoaded = false;
    this.isReady = false;
    this.rigPrefix = null;
    this.onLoadingStatus = onLoadingStatus;

    this.readyPromise = this.loadCharacter();
  }

  loadFbx(loader, path) {
    return new Promise((resolve, reject) => {
      loader.load(
        `${path}?v=${characterAssetVersion}`,
        resolve,
        undefined,
        reject
      );
    });
  }

  async loadCharacter() {
    const loader = new FBXLoader();
    const runModelPath = 'assets/characters/runner/Run.fbx';
    const animationFiles = [
      { fileName: 'Jump.fbx', actionName: 'jump' },
      { fileName: 'Slide.fbx', actionName: 'slide' },
      { fileName: 'Falling.fbx', actionName: 'falling' }
    ];

    this.onLoadingStatus('Loading character...');

    const runPromise = this.loadFbx(loader, runModelPath);
    const animationResultsPromise = Promise.allSettled(
      animationFiles.map(({ fileName }) =>
        this.loadFbx(loader, `assets/characters/runner/${fileName}`)
      )
    );

    try {
      const fbx = await runPromise;
      this.setupCharacterModel(fbx);
      this.onLoadingStatus('Loading animations...');

      const animationResults = await animationResultsPromise;
      let allAnimationsReady = Boolean(this.actions.run);

      animationResults.forEach((result, index) => {
        const { fileName, actionName } = animationFiles[index];
        const path = `assets/characters/runner/${fileName}`;

        if (result.status === 'rejected') {
          allAnimationsReady = false;
          console.error(`Failed to load required animation ${path}.`, result.reason);
          return;
        }

        if (!this.createAnimationAction(result.value, actionName, path)) {
          allAnimationsReady = false;
        }
      });

      this.setupMixerEvents();
      this.isModelLoaded = true;
      this.isReady = true;

      if (!allAnimationsReady) {
        console.warn('One or more required animations are unavailable. Gameplay will use available actions.');
        return { fallback: true, placeholder: false };
      }

      return { fallback: false, placeholder: false };
    } catch (error) {
      await animationResultsPromise;
      console.error(`Failed to load ${runModelPath}. Using the placeholder player.`, error);
      this.isReady = true;
      return { fallback: true, placeholder: true };
    }
  }

  setupCharacterModel(fbx) {
    fbx.scale.setScalar(0.01);
    fbx.rotation.y = Math.PI;
    fbx.position.set(0, -0.9, 0);
    fbx.traverse((child) => {
      if (child.isBone && child.name.endsWith('Hips')) {
        this.rigPrefix = child.name.slice(0, -'Hips'.length);
      }
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.visual = fbx;
    this.mesh.add(fbx);
    this.mesh.remove(this.placeholder);
    this.placeholder.geometry.dispose();
    this.placeholder.material.dispose();
    this.placeholder = null;
    this.mixer = new THREE.AnimationMixer(fbx);

    if (!fbx.animations || !fbx.animations[0]) {
      console.error('Run.fbx loaded without its required run animation.');
      return;
    }

    const runClip = this.prepareAnimationClip(fbx.animations[0]);
    this.actions.run = this.mixer.clipAction(runClip);
    this.actions.run.loop = THREE.LoopRepeat;
    this.actions.run.play();
    this.activeAction = this.actions.run;
  }

  prepareAnimationClip(sourceClip) {
    const clip = sourceClip.clone();

    if (this.rigPrefix) {
      for (const track of clip.tracks) {
        const propertySeparator = track.name.lastIndexOf('.');
        if (propertySeparator === -1) continue;

        const boneName = track.name.slice(0, propertySeparator);
        const propertyName = track.name.slice(propertySeparator);
        const boneSuffix = boneName.replace(/^mixamorig\d*/i, '');
        track.name = `${this.rigPrefix}${boneSuffix}${propertyName}`;
      }
    }

    return this.removeRootMotion(clip);
  }

  removeRootMotion(sourceClip) {
    const clip = sourceClip.clone();
    let adjustedTrackCount = 0;

    for (const track of clip.tracks) {
      const trackName = track.name.toLowerCase();
      const isRootPositionTrack =
        trackName.endsWith('.position') &&
        (trackName.includes('hips') || trackName.includes('root'));

      if (!isRootPositionTrack || track.getValueSize() !== 3) continue;

      const rootX = track.values[0];
      const rootZ = track.values[2];
      for (let index = 0; index < track.values.length; index += 3) {
        track.values[index] = rootX;
        track.values[index + 2] = rootZ;
      }
      adjustedTrackCount += 1;
    }

    if (adjustedTrackCount === 0) {
      console.warn(`No Mixamo root position track was found in animation "${clip.name}".`);
    }

    return clip;
  }

  createAnimationAction(object, actionName, path) {
    if (!this.mixer || !object.animations || object.animations.length === 0) {
      console.error(`${path} loaded without a required animation clip.`);
      return false;
    }

    const clip = this.prepareAnimationClip(object.animations[0]);
    const action = this.mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    this.actions[actionName] = action;
    return true;
  }

  setupMixerEvents() {
    if (!this.mixer) return;
    this.mixer.addEventListener('finished', (event) => {
      if (gameState !== 'playing') return;
      if (event.action === this.actions.jump || event.action === this.actions.slide) {
        this.setAction('run', 0.15);
      }
    });
  }

  setAction(name, fadeDuration = 0.2) {
    const nextAction = this.actions[name];
    if (!nextAction || nextAction === this.activeAction) return;
    nextAction.reset();
    nextAction.play();
    nextAction.fadeIn(fadeDuration);
    if (this.activeAction) {
      this.activeAction.fadeOut(fadeDuration);
    }
    this.activeAction = nextAction;
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
      if (this.isModelLoaded && this.actions.jump) {
        this.setAction('jump', 0.12);
      }
    }
  }

  slide() {
    if (!this.isJumping && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = 0.5;
      this.collider.scale.y = 0.45;
      this.collider.position.y = -0.5;
      if (this.actions.slide) {
        this.setAction('slide', 0.12);
      }
    }
  }

  playFalling() {
    if (this.actions.falling) {
      this.setAction('falling', 0.2);
      return true;
    }
    console.warn('Falling animation is not available. Showing the game over scene without it.');
    return false;
  }

  resetState() {
    this.targetLane = 1;
    this.currentLane = 1;
    this.jumpVelocity = 0;
    this.verticalPosition = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.collider.scale.set(1, 1, 1);
    this.collider.position.set(0, 0, 0);
    this.mesh.position.set(lanes[1], 0.9, 0);
    if (this.actions.run) {
      this.setAction('run', 0.15);
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
        this.collider.scale.y = 1;
        this.collider.position.y = 0;
      }
    }

    this.mesh.position.y = 0.9 + this.verticalPosition;

    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  updateAnimation(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  getBoundingBox() {
    this.collider.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(this.collider);
  }
}

class RunnerObstacle {
  constructor(lane, type) {
    this.mesh = new THREE.Group();
    this.collider = this.createVisual(type);
    this.mesh.position.set(lanes[lane], 0, -100);
    this.lane = lane;
    this.type = type;
    this.active = true;
  }

  createVisual(type) {
    if (type === 'low') {
      const barrier = this.createBox(1.8, 0.75, 1.2, 0xffb347);
      barrier.position.y = 0.375;

      const stripe = this.createBox(1.82, 0.14, 1.22, 0xffe0a3);
      stripe.position.y = 0.5;
      this.mesh.add(barrier, stripe);
      return barrier;
    }

    if (type === 'tall') {
      const wall = this.createBox(2, 4.6, 1.35, 0xe14b4b);
      wall.position.y = 2.3;

      const panel = this.createBox(1.55, 0.28, 1.38, 0xff9a76);
      panel.position.y = 2.8;
      this.mesh.add(wall, panel);
      return wall;
    }

    const hangingBar = this.createBox(1.9, 0.6, 1.35, 0x9b6dff);
    hangingBar.position.y = 1.55;

    const leftSupport = this.createBox(0.16, 2.2, 1.35, 0x5c42a8);
    leftSupport.position.set(-1.08, 1.1, 0);
    const rightSupport = leftSupport.clone();
    rightSupport.position.x = 1.08;
    this.mesh.add(hangingBar, leftSupport, rightSupport);
    return hangingBar;
  }

  createBox(width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color });
    const box = new THREE.Mesh(geometry, material);
    box.castShadow = true;
    box.receiveShadow = true;
    return box;
  }

  update(delta, speed) {
    this.mesh.position.z += speed * delta * 60;
    if (this.mesh.position.z > 12) {
      this.active = false;
    }
  }

  getBoundingBox() {
    this.collider.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(this.collider);
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

  player = new RunnerPlayer(updateLoadingStatus);
  scene.add(player.mesh);

  player.readyPromise.then(({ fallback, placeholder }) => {
    const readyMessage = placeholder
      ? 'Ready (placeholder fallback)'
      : fallback
        ? 'Ready (limited animations)'
        : 'Ready';
    updateLoadingStatus(readyMessage, fallback);
    startButton.textContent = 'Start Game';
    startButton.disabled = false;
  });
}

function updateLoadingStatus(message, fallback = false) {
  loadingStatus.textContent = message;
  loadingStatus.classList.toggle('ready', message === 'Ready');
  loadingStatus.classList.toggle('fallback', fallback);
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
  gameOverTimer = 0;
  lastObstacleType = null;
  obstacles.forEach((ob) => scene.remove(ob.mesh));
  coins.forEach((coin) => scene.remove(coin.mesh));
  obstacles = [];
  coins = [];
  if (player) {
    player.resetState();
  }
  scoreDisplay.textContent = '0';
  coinDisplay.textContent = '0';
}

function startGame() {
  if (!player || !player.isReady || startButton.disabled) return;

  resetGame();
  gameState = 'playing';
  overlayStart.classList.remove('active');
  overlayGameOver.classList.remove('active');
}

function endGame() {
  if (gameState !== 'playing') return;

  gameState = 'dying';
  gameOverTimer = player && player.playFalling() ? gameOverDelaySeconds : 0;
  finalScoreLabel.textContent = `Score: ${Math.floor(score)}`;
  finalCoinsLabel.textContent = `Coins: ${coinsCollected}`;
  if (gameOverTimer === 0) {
    showGameOver();
  }
}

function showGameOver() {
  gameState = 'over';
  overlayGameOver.classList.add('active');
}

function spawnItem() {
  const choice = Math.random();
  const lane = Math.floor(Math.random() * lanes.length);
  if (choice < 0.65) {
    let obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    const isRapidActionChange =
      (lastObstacleType === 'low' && obstacleType === 'overhead') ||
      (lastObstacleType === 'overhead' && obstacleType === 'low');

    if (isRapidActionChange) {
      obstacleType = 'tall';
    }

    const obstacle = new RunnerObstacle(lane, obstacleType);
    obstacle.mesh.position.z = -110;
    scene.add(obstacle.mesh);
    obstacles.push(obstacle);
    lastObstacleType = obstacleType;
  } else {
    const coin = new CoinItem(lane);
    coin.mesh.position.z = -110;
    scene.add(coin.mesh);
    coins.push(coin);
    lastObstacleType = null;
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
    spawnTimer = spawnIntervalSeconds - Math.min(0.25, score * 0.0025);
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
  } else if (gameState === 'dying') {
    player.updateAnimation(delta);
    gameOverTimer -= delta;
    if (gameOverTimer <= 0) {
      showGameOver();
    }
  } else if (gameState === 'over') {
    player.updateAnimation(delta);
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
  loadingStatus = document.getElementById('loading-status');
  startButton.disabled = true;

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
