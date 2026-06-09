# QQ Studio 3D Runner Prototype

This project is the QQ Studio playable ad 3D version of an original endless runner game prototype. It is designed to demonstrate a simple 3D gameplay loop in the browser using Three.js.

## Purpose

The goal of this prototype is to build a playable early version of a 3-lane endless runner that can be used for QQ Studio playable ad development. It focuses on basic controls, obstacle and coin spawning, score tracking, and an approachable game loop.

## How to Run Locally

1. Start a local server from the project folder, for example: `python -m http.server 8000`
2. Open `http://localhost:8000` in a browser that supports WebGL.
3. The game uses Three.js and FBXLoader from a CDN, so an internet connection is required and no local package installation is needed.

Opening `index.html` directly with a `file://` URL is not supported because the game uses JavaScript modules and loads FBX assets.

## Current Gameplay Features

- Automatic forward movement effect using environment and object motion.
- Three-lane movement: left, center, right.
- Jumping over low obstacles.
- Sliding under tall obstacles.
- Random obstacle and coin spawning ahead of the player.
- Score increases over time.
- Coins can be collected to increase coin count.
- Game speed gradually increases as score increases.
- Game over triggers when the player hits an obstacle.
- Start screen and game over screen with restart.

## Controls

### Desktop

- `ArrowLeft` — move left
- `ArrowRight` — move right
- `ArrowUp` — jump
- `ArrowDown` — slide

### Mobile

- Swipe left — move left
- Swipe right — move right
- Swipe up — jump
- Swipe down — slide

## Character Animation Files

- Place Mixamo animation files in `assets/characters/runner/`.
- Required files:
  - `Run.fbx` — main visible character model and running animation.
  - `Jump.fbx` — jump animation clip.
  - `Slide.fbx` — slide animation clip.
  - `Falling.fbx` — falling / game over animation clip.
- File names and capitalization must match these relative paths exactly.
- The older `assets/character animation/` folder is not used by the browser code.

## How the Mixamo Animation System Works

- The game loads `Run.fbx` as the main character mesh and skeleton.
- `Jump.fbx`, `Slide.fbx`, and `Falling.fbx` are loaded only for their animation clips.
- `THREE.FBXLoader` reads the FBX files, and `THREE.AnimationMixer` blends the animations.
- The character plays the running animation during gameplay, switches to jump or slide when the player acts, and plays falling on game over.
- FBX loading is asynchronous and never disables the Start Game button.
- If `Run.fbx` fails to load, the original blue placeholder remains visible and gameplay continues.
- If an animation clip fails to load, the game logs a clear console error and continues without that animation.

## Notes

- All current assets are placeholders and simple geometry only, except the Mixamo character animation system.
- Replace temporary colors, shapes, and UI with original QQ Studio art assets later.
