# Development Progress

## Current Prototype Status

This prototype is a working 3D endless runner built with Three.js. The startup regression introduced by the Mixamo FBX integration has been fixed without changing the core gameplay loop.

## Latest Update - June 12, 2026

- Replaced isolated random coins with guided straight, lane-change, jump, slide, and safe-lane patterns.
- Linked coin guidance to obstacle behavior so low obstacles teach jumping, overhead obstacles teach sliding, and tall obstacles direct the player toward an adjacent safe lane.
- Preserved coin collection, rotation, collision, scoring, and cleanup behavior.
- Replaced the original unlimited linear speed increase with a smooth capped curve.
- Tuned the current curve to a `0.62` maximum with a `950` score ramp so it becomes challenging sooner while remaining substantially fairer than the original formula.
- Fixed repeated action animations by allowing jump, slide, falling, and restart transitions to interrupt or restart the active visual action.
- Separated gameplay action timing from animation completion so collider and movement state remain authoritative.
- Reduced jump and slide blend time to 0.05 seconds and falling blend time to 0.04 seconds.
- Verified repeated keyboard slides, downward swipe slides, keyboard and swipe jumps, horizontal lane movement, falling before the game-over overlay, restart, coin collection, obstacle avoidance, score updates, and normal rendering in local Chrome.
- The previous June 11 publication scope was limited to `game.js` and `progress.md`; the unused untracked `assets/character animation/` duplicate folder remains intentionally excluded.

## Looping City Background Views

- Added three city-only background plates in `assets/backgrounds/`:
  - `daylight.png`
  - `sunset.png`
  - `evening.png`
- Added a full-screen background layer behind the transparent Three.js canvas.
- Background images preload alongside the character assets before Start Game becomes available.
- Active gameplay time controls the background cycle:
  - 0-30 seconds: Daylight
  - 30-60 seconds: Sunset
  - 60-90 seconds: Evening
  - 90-120 seconds: Daylight again
- The sequence continues in the same order for as long as the run remains active.
- Background time pauses while the game is on the start screen, dying, or game-over screen.
- Each change uses a 0.9-second fade toward near-black, swaps the image while dark, and fades the new view back in over 0.9 seconds.
- The fade layer sits behind the Three.js canvas and UI, so movement, controls, obstacles, coins, and score remain visible and playable during the transition.
- Restart cancels any pending background transition, resets the active-time counter, and restores Daylight immediately.
- Missing city images log clear console errors and allow the game to start with the available assets.

## Startup Bug

- What was broken: clicking `Start Game` did nothing after FBX support was added.
- Root cause: `FBXLoader.js` imports the bare module name `three`, while the page only loaded Three.js as a classic global script. The browser could not resolve the module, so `game.js` stopped before `init()` attached the Start and Restart button listeners.
- Fix: `index.html` now provides an import map for the same Three.js version, and `game.js` imports `THREE` from that module.
- Asset loading is asynchronous, and the Start button remains disabled until the required preload attempt finishes.
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

## Character Preloading

- The character and all required animation FBX files begin loading as soon as the page initializes.
- Run, Jump, Slide, and Falling requests start before the player can begin gameplay.
- The Start Game button remains disabled while assets are loading.
- The start panel reports `Loading character...`, `Loading animations...`, and `Ready`.
- Gameplay starts only after the character model and required animation actions have been prepared.
- Restart reuses the existing character, mixer, clips, and actions without loading FBX files again.
- If required character loading fails, the blue placeholder remains available and the UI reports a fallback-ready state.
- Replaced the per-reload timestamp cache key with a stable character asset version so the current skin is cached across reloads.

## Guided Coin Patterns And Speed Balancing

- Replaced isolated random coin spawns with readable multi-coin paths.
- Straight coin lines now provide rewarding forward guidance within one lane.
- Lane-change paths smoothly curve between lanes instead of requiring abrupt movement.
- Low obstacles receive a raised coin arc that visually teaches the player to jump.
- Overhead obstacles receive a low coin line beneath the bar that visually teaches the player to slide.
- Tall obstacles receive a curved path toward an adjacent safe lane instead of placing coins into the blocked lane.
- Obstacle guide coins use vertical or lateral clearance so they do not spawn inside obstacle collision meshes.
- Coin spacing and path lengths are balanced for readable mobile reaction timing without filling every lane.
- Existing coin collision, rotation, removal, and coin-count behavior remain unchanged.
- Replaced the fast linear speed increase with a smooth easing curve.
- Movement speed now approaches a capped maximum instead of increasing without limit.
- Spawn timing also tightens gradually, avoiding the sharp early difficulty increase from the previous formula.

## Responsive Input And Animation Synchronization

- Jump and slide inputs now force-restart their matching animation clips immediately.
- Repeated slide or jump actions no longer depend on whether the previous visual clip has emitted a mixer completion event.
- Gameplay state remains responsible for jump height, slide duration, collider shape, and whether a new action is allowed.
- Animation state is now visual only and can be interrupted without changing collision behavior.
- Jump and slide use shorter 0.05-second blends for faster visual response.
- Falling uses a 0.04-second blend and interrupts any active run, jump, or slide animation on collision.
- Landing and slide completion return to run only when gameplay confirms that neither action is active.
- Restart force-resets the run animation so a clamped action pose cannot carry into a new game.
- Keyboard and swipe inputs continue to call the same movement methods, keeping their gameplay and animation behavior synchronized.
- The eased speed curve was tuned from a `0.58` maximum with a `1200` score ramp to a `0.62` maximum with a `950` score ramp.
- The revised speed remains capped and substantially slower than the original linear increase, while becoming challenging sooner than the first balanced version.

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
- Added gated character and animation preloading before Start Game becomes available.
- Added straight, lane-change, jump-arc, slide, and safe-lane coin guidance patterns.
- Added smoother capped movement-speed scaling and a gentler spawn-frequency ramp.
- Added interruptible, restartable character actions synchronized to gameplay input and completion.
- Increased the capped speed curve slightly while preserving its smooth early-game ramp.
- Added a preloaded Daylight, Sunset, and Evening city background cycle with smooth fades.

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

Latest coin and speed balancing changes:

- `game.js`
- `progress.md`

Latest animation responsiveness changes:

- `game.js`
- `progress.md`

Current June 11, 2026 publication:

- `game.js`
- `progress.md`

Latest looping background changes:

- `index.html`
- `styles.css`
- `game.js`
- `progress.md`
- `assets/backgrounds/daylight.png`
- `assets/backgrounds/sunset.png`
- `assets/backgrounds/evening.png`

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
- Restart reuses already loaded character assets and does not repeat the initial FBX loading work.
- Coins form readable paths for forward movement, lane changes, jumps, slides, and tall-obstacle avoidance.
- Game speed rises gradually toward a fixed maximum instead of accelerating rapidly throughout a run.
- Repeated jump and slide inputs replay their visual animations as soon as gameplay accepts the action.
- Falling interrupts the active animation immediately, and gameplay completion safely returns the character to run.
- City backgrounds cycle every 30 seconds of active gameplay without interrupting movement or resetting the game.
- Restart consistently returns the environment to the Daylight view.

## Latest Validation

- Straight coin lines rendered and collected correctly.
- Lane-change paths rendered as readable curves and remained collectible while changing lanes.
- Jump arcs cleared low-obstacle collision geometry.
- Low slide paths cleared overhead bars and supports.
- Tall-obstacle paths moved into an adjacent safe lane without intersecting the wall.
- Two consecutive keyboard slides visibly restarted the slide pose and cleared repeated overhead obstacles.
- A third repeated slide triggered by a synthetic mobile swipe also cleared its obstacle.
- Keyboard and swipe jump inputs immediately showed the jump action.
- Keyboard and swipe lane changes moved the player toward the requested lane.
- Collision immediately interrupted the active action with Falling, followed by the delayed game-over overlay.
- Restart removed the overlay, reset score and coins, and force-restarted the run animation.
- All three city plates preloaded before the Start button became available.
- A continuous browser run verified Daylight at startup, Sunset after 30 seconds, Evening after 60 seconds, and the loop back to Daylight after 90 seconds.
- Score and coin collection continued during each fade without resetting or pausing gameplay.
- The fade layer reached near-black before each image swap and then revealed the next view without visual popping.
- Restart during the test canceled the active cycle, reset the timer, and restored Daylight.
- A 390x844 mobile viewport test confirmed the background remains visible behind the road and swipe movement still works.
- `git diff --check` passed; only line-ending normalization warnings were reported.

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
- The current FBX character is large for the web; converting the character and animations to GLB/GLTF is recommended for faster downloads and parsing.
- Coin spacing, arc height, pattern frequency, and the new maximum speed are initial balancing values that still need extended testing on a range of phone sizes.
- Coin paths guide a safe response to the obstacle they accompany, but they do not yet account for the player's current lane when a new pattern is created.
- Animation responsiveness depends on compatible replacement clips having sensible start poses; unusually authored FBX clips may still need per-clip trimming or time scaling.
- The `0.62` speed cap and `950` score ramp are updated balancing values and should be validated through longer mobile sessions.
- The three generated background plates add roughly 5 MB of image downloads and should be compressed to WebP or optimized JPEG before a production playable-ad build.
- CSS `background-size: cover` crops the city plates differently on narrow portrait screens; the central skyline remains visible, but dedicated portrait variants may improve composition.

## Recommended Next Steps

1. Optimize or compress `Run.fbx` to reduce its current load size.
2. Fine tune the Mixamo model scale, orientation, and animation transitions on target devices.
3. Remove the unused duplicate `assets/character animation/` folder after confirming it is no longer needed.
4. Add authored obstacle patterns with guaranteed escape lanes and difficulty progression.
5. Tune jump height, slide duration, obstacle dimensions, and spawn spacing on mobile devices.
6. Replace remaining placeholder geometry with original QQ Studio brand assets.
7. Add audio, camera polish, and a first-time tutorial.
8. Add authored obstacle-and-coin sequences with difficulty tiers and guaranteed transitions between consecutive patterns.
9. Playtest coin spacing and the capped speed curve on low-end mobile devices, then tune from recorded completion and collision data.
10. Add a small animation-debug overlay or automated test hook for action name, gameplay state, and collider state during future character tuning.
11. Evaluate per-animation playback speed and clip trimming if replacement Mixamo files have long anticipation or recovery frames.
12. Compress the city plates and consider responsive landscape/portrait source variants.
13. Add subtle color grading for road fog and scene lighting to better match each time-of-day background.
