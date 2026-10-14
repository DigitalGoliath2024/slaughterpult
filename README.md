# Slaughterpult — Ragdoll Launch Lab
Prototype V5: build a spring-powered catapult, launch a 2D physics ragdoll, and test distance.

## Play
After GitHub Pages deployment, visit https://digitalgoliath2024.github.io/slaughterpult/

If Pages is not enabled, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.

## 3D characters
The source includes the 3D character bridge but the two binary models must be uploaded separately to the repository root:
- `western_cowboy_rigged.glb`
- `rigged_t-pose_human_male_w_50_face_blendshapes.glb`

Until uploaded, the playable 2D ragdoll remains available as a fallback.

3D model credits (CC BY 4.0):
- Western Cowboy (Rigged) — human being — https://skfb.ly/o9JI9
- Rigged T-Pose Human Male w 50 Face Blendshapes — Mike Alger — https://skfb.ly/6QTJ9

## Controls
Pick a power component and connect sockets on the frame and arm. Pull Back, then Launch. Adjust release angle and arm length; reset to try again.

## Additional asset credits

- [Retro / PSX-like Horror Melee Weapons Pack](https://sketchfab.com/3d-models/retro-psx-like-horror-melee-weapons-pack-79cae670d515469a947617d18e5a6c89) — turnip_liker — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Original meshes and textures, reoriented, resized, and mounted on moving machinery and boards.

- [Hanging voodoo doll](https://sketchfab.com/3d-models/hanging-voodoo-doll-2ecec7c9b5b946dab7a7e40b76e220fd) — Sophie — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Resized and suspended on wall anchors with procedural damped sway.

Environment assets in use (source texture maps extracted at their original 1024×1024 resolution; JPEG copies used for the repeating background and ground):
- [brick textures](https://skfb.ly/6WM8U) — DJMaesen — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Horror Bed](https://skfb.ly/6WwZG) — denis_cliofas — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Skulls Wall | Tile Texture](https://skfb.ly/ptwyH) — CATholic — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Cushion landing assets — CC BY 4.0

The following models retain their original geometry and materials. Embedded texture images are resized/compressed for browser use. Models are oriented flat, resized, scattered, and compressed on soft landings.

- [dirty cushion](https://skfb.ly/prSFS) — Virtua Con — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Cushion](https://skfb.ly/6ToNG) — siddhant — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Cushion [OLD][DIRTY]](https://skfb.ly/6XtYH) — Lonit — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [cushion-1](https://skfb.ly/oUrHw) — Mylom — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

- [Trampoline](https://sketchfab.com/3d-models/trampoline-eb2ae015729e42e4b08420ae9eb11a5f) — VioletBoom — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Three supplied trampoline variants are separated, resized and angled to match physical jumping surfaces; the mat briefly deforms on impact.

Uploaded hazard models retain their original meshes and materials:
- Trash Grinder — NotoriousTitan — https://sketchfab.com/3d-models/trash-grinder-e53e056595c748cb95de38815dbe2feb — CC BY 4.0.
- Twist The Knife — AdrianMurariu — https://sketchfab.com/3d-models/twist-the-knife-4593329a99e6496f9cc7337506e91b07 — CC BY 4.0.
- Toy_ Grinder UGC_A_000_1x1 — BRUNO 365 — https://sketchfab.com/3d-models/toy--grinder-ugc-a-000-1x1-202a18676f8a446daa40b474cacde067 — CC BY 4.0.
Motor assemblies are isolated, resized, and rotated. Bed and hanging dolls are backdrop scenery only.

- [Free Pack - Steampunk Machinery. Low Poly](https://sketchfab.com/3d-models/free-pack-steampunk-machinery-low-poly-20942a52aafb465c90877534767f8990) — VMgershom — Sketchfab Standard License. Green, red, and blue station apparatuses support the spiked roller axle at their actual upper horn openings. Lower outlets emit timed fire and steam; active flame jets damage airborne ragdolls.

Rankings are currently stored in browser localStorage (`slaughterpultRankingsV1`). The Farthest and Highest Score boards each show ten unique two-initial players, with distance, score, and month/year. Failed cushion runs do not qualify. Cash rewards and hydraulic purchase costs have been removed; hydraulic assist is freely selectable. Worldwide rankings will be added later.

Knife roller machines face along the conveyor route with a three-quarter side view; their intakes overlap the preceding belt ends, and shredded fragments eject forward from the outlets. TOP 10 opens only when the player clicks its button; finishing or resetting a run does not open a modal.

- [JET PACK](https://skfb.ly/oTqwA) — Incredible INC. — Creative Commons Attribution 4.0. The supplied geometry is retained, with red/orange outer tanks, teal core, brass bands and dark nozzles. Selecting Rocket pack automatically equips the back mount; five seconds of thrust follows the ragdoll torso orientation, with off-center torque. Heavy bands, Power spring and Boost piston provide stronger launcher options. Rear walls scroll at 55% of foreground speed; skull tiles use 45% horizontally and 35% vertically.

Character dialogue uses three random clip pools: before flight, flying, and landed. Philip retains the original `human` asset identity. Before lines play on entering the build screen or resetting; flying lines play on release; landing lines play once after ground contact. A single voice plays at a time. Publishing builds `character-voices.js` from committed audio paths containing a character alias (cowboy/southern, human/Philip/positive, scared/crash/meshy/dummy) and a stage label (before/ready, flying/flight, landed/after). Original audio filenames are preserved; ambiguous files are reported by the publishing workflow instead of guessed.

Flight effects use the supplied `flying_character_sound.mp3` at release, repeating only when a flight exceeds the clip duration and stopping on landing or reset. The supplied `freesound_community-jet-engine-6753.mp3` starts when an equipped pack ignites at release and stops with fuel exhaustion, shredding, a soft landing, or reset. Both effects duck under character dialogue. Jet exhaust uses animated orange cones and blue cores, requiring no animation in the source GLB.

All three courses start with machinery beyond 1,000 feet and extend ahead of long flights as needed, using the supplied grinders and knife/spiked rollers. Nearby equipment and pillows are instantiated as the camera approaches. Machine spacing includes hopper housings and steampunk axle supports; only a paired conveyor/intake connection overlaps. The original four-trampoline route and final hopper remain in place.


## Splash credits and rocket
The intro splash includes all embedded third-party model credits with original source and license links. `ASSET_CREDITS.json` records the complete uploaded asset inventory and remaining source-credit gaps. Source attribution for the two named external audio tracks was not provided; it remains explicitly marked in that manifest.

[old rocket](https://skfb.ly/oLQUJ) by pnhtuan — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Original geometry and textures are retained, resized and back-mounted with procedural exhaust. It is the final toolbar accessory, with 22,500px/s² thrust and eight seconds of fuel; the jetpack remains 3,150px/s² with five seconds of fuel. Selecting either replaces the other. The flow is intro → course/character selection → build/play.


Publishing runs `scripts/build_asset_credits.py` to refresh model attributions directly from GLB metadata and the full uploaded inventory. Rocket audio uses `rocket_sound.mp3`, looping only during its eight-second burn, then stops on termination before the shared explosion. Audio source credits will be expanded separately.

Entry flow: the 13-or-over screen is silent. Age confirmation starts the uploaded Evil Drone at low volume, looping through the intro and course/character selection. BUILD YOUR LAUNCHER stops Evil Drone and starts the selected map ambience. Returning to selection pauses the map ambience and resumes Evil Drone.

Launcher release velocity, initial spin and powered accessory thrust share a 0.75 output multiplier. Attachment torque still adds normally; free-air bending alone does not tear the waist.

Level three includes extra free-bounce trampolines in machine gaps and throughout generated course extensions. They reuse the three supplied models, bounce upward at 1,450–1,600px/s, retain ragdoll movement, and do not alter the original four-pad progression. Wall-mounted knife rollers and faster bat-equipped spiked rollers provide elevated hazards; bats from the credited weapon pack knock contacting body pieces forward. Near-ground camera framing keeps the basin floor near the lower edge of the view.
