# Development Progress

## Current Prototype Status

This prototype is a working 3D endless runner built with Three.js. The startup regression introduced by the Mixamo FBX integration has been fixed without changing the core gameplay loop.

## Startup Bug

- What was broken: clicking `Start Game` did nothing after FBX support was added.
- Root cause: `FBXLoader.js` imports the bare module name `three`, while the page only loaded Three.js as a classic global script. The browser could not resolve the module, so `game.js` stopped before `init()` attached the Start and Restart button listeners.
- Fix: `index.html` now provides an import map for the same Three.js version, and `game.js` imports `THREE` from that module.
- Asset loading is asynchronous and does not block starting the game.
- A visible placeholder player remains available if `Run.fbx` fails.
- Failed optional animation clips log errors but do not stop gameplay.

## Mixamo Root Motion Fix

- Fixed the character moving forward during `Run.fbx` and snapping backward when the animation loop restarted.
- Mixamo hips/root X and Z position tracks are neutralized on cloned animation clips.
- Vertical body movement, rotations, and limb animation remain intact.
- The same root-motion handling is applied to Run, Jump, Slide, and Falling.
- Gameplay position remains controlled by the stable player parent group and invisible collision box.

## Game Over Scene Fix

- Collision now enters a short `dying` phase instead of immediately freezing the animation mixer.
- Normal gameplay movement, spawning, and scoring stop at impact.
- `Falling.fbx` plays once, with its final pose clamped.
- The game-over panel appears after a short delay so the Falling animation can be seen.
- The Three.js canvas remains visible behind a semi-transparent game-over overlay.
- On wider screens, the game-over panel is positioned beside the failed character.
- Restart clears the death state, resets the score and coins, and resumes the run animation.

## Obstacle Variety And Collision Rules

- Added three visually distinct obstacle types with dedicated collision meshes.
- `low`: a short orange floor barrier that must be jumped.
- `tall`: a red wall that remains too high to clear with the normal jump and must be avoided by switching lanes.
- `overhead`: a purple hanging bar that must be passed with a slide.
- Sliding now temporarily shortens and lowers the invisible player collider.
- Collision decisions use the actual player and obstacle bounding boxes instead of broad jump/slide exemptions.
- Spawning remains limited to one lane at each spawn point, so all three lanes are never blocked together.
- Direct low-to-overhead and overhead-to-low sequences are replaced with a tall obstacle to avoid unfair rapid action changes.
- Minimum spawn spacing was increased to provide more reaction time on mobile controls.

## Character Skin And Animation Retargeting

- Replaced the original `Run.fbx` character with the selected new skinned Mixamo model.
- Added a per-page cache version to the `Run.fbx` request so browsers do not reuse an older character skin after the file is replaced.
- The active model uses `mixamorig9` bone names, while the existing Jump, Slide, and Falling clips use `mixamorig1`.
- Added automatic Mixamo track retargeting that detects the active model's hips prefix and renames animation track targets before creating actions.
- Jump, Slide, and Falling now animate the new skin instead of switching it to a T-pose.
- Root-motion cleanup still runs after retargeting, so all animations remain aligned with the gameplay collider.

## Completed Work

- Created `index.html`, `styles.css`, and `game.js`.
- Added Three.js scene setup with lighting, camera, and ground road.
- Built a player character with three-lane movement, jump, and slide actions.
- Implemented obstacle spawning, movement, and collision detection.
- Implemented coin spawning, collection, and coin counter.
- Added score tracking and gradual speed increase.
- Created start and game over screens with restart support.
- Added responsive UI for desktop and mobile.
- Added Mixamo FBX animation support with `THREE.FBXLoader` and `THREE.AnimationMixer`.
- Added resilient FBX error handling and placeholder fallback behavior.
- Removed unwanted Mixamo root motion so animations play in place.
- Added a visible Falling animation and delayed game-over overlay sequence.
- Added low, tall, and overhead obstacle gameplay with action-specific collision rules.
- Added reliable character asset cache busting for replaced `Run.fbx` files.
- Added automatic Mixamo bone-prefix retargeting for animation clips from compatible Mixamo rigs.

## Files Created or Changed

- `index.html`
- `styles.css`
- `game.js`
- `README.md`
- `progress.md`
- `assets/characters/runner/Run.fbx`
- `assets/characters/runner/Jump.fbx`
- `assets/characters/runner/Slide.fbx`
- `assets/characters/runner/Falling.fbx`

## Working Features

- Scene rendering with Three.js.
- Player lane switching.
- Jump and slide mechanics.
- Obstacle and coin spawn logic.
- Collision detection for obstacles and coins.
- Score and coin UI updates.
- Start and restart game flow.
- Touch swipe controls for mobile.
- Mixamo character animation loading via FBX.
- Run, jump, slide, and falling animation clips applied to one visible character.
- Character animations stay aligned with the gameplay collider.
- Collision freezes the world while allowing the Falling animation to finish.
- The failed character and scene remain visible behind the game-over UI.
- Jump clears low barriers, slide clears overhead bars, and lane switching avoids tall walls.
- The selected new character skin plays Run, Jump, Slide, and Falling without T-pose transitions.

## Known Issues / Limitations

- Graphics are placeholder geometry only.
- There is no sound or music yet.
- The current camera and environment are simple and not fully polished.
- Collision detection is basic and may feel forgiving in some cases.
- The road and objects may require visual polish for playable ad quality.
- Mixamo model scale and animation alignment may need fine tuning.
- The FBX files are large, especially `Run.fbx`, so the character may take time to appear on slower connections or devices.
- `assets/character animation/` contains duplicate FBX files but is not used by the game.
- The game-over animation delay is currently fixed at 0.8 seconds and may need tuning if `Falling.fbx` is replaced.
- Obstacle sizes and spawn weights are initial balancing values and should be tuned through mobile playtesting.
- Random single-lane spawning does not yet create authored multi-obstacle patterns or difficulty tiers.
- Automatic animation retargeting currently supports compatible Mixamo rigs whose main difference is the `mixamorig` numeric prefix.

## Recommended Next Steps

1. Optimize or compress `Run.fbx` to reduce its current load size.
2. Fine tune the Mixamo model scale, orientation, and animation transitions on target devices.
3. Remove the unused duplicate `assets/character animation/` folder after confirming it is no longer needed.
4. Add authored obstacle patterns with guaranteed escape lanes and difficulty progression.
5. Tune jump height, slide duration, obstacle dimensions, and spawn spacing on mobile devices.
6. Replace remaining placeholder geometry with original QQ Studio brand assets.
7. Add audio, camera polish, and a first-time tutorial.
