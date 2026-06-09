# QQ Studio 3D Runner Prototype

This project is the QQ Studio playable ad 3D version of an original endless runner game prototype. It is designed to demonstrate a simple 3D gameplay loop in the browser using Three.js.

## Purpose

The goal of this prototype is to build a playable early version of a 3-lane endless runner that can be used for QQ Studio playable ad development. It focuses on basic controls, obstacle and coin spawning, score tracking, and an approachable game loop.

## How to Run Locally

1. Open the project folder in your browser or local editor.
2. Open `index.html` in a browser that supports WebGL.
3. The game uses Three.js from a CDN, so no local package installation is needed.

> Tip: For best results, serve the folder through a local development server if your browser blocks local file access.

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

## Notes

- All current assets are placeholders and simple geometry only.
- Replace temporary colors, shapes, and UI with original QQ Studio art assets later.
