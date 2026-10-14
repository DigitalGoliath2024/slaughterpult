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

Airborne flips add combo bonuses: one full flip earns 100 total points, two earn 250, three earn 500, and later flips add 250 each. The torso rotation is tracked in either direction; incomplete rocking, grounded movement, and shredded fragments do not score. Landing or a trampoline bounce starts a new combo. A short label follows the body, and flip points contribute to the run score and local score rankings.

Elevated machinery uses swept collision checks against the rendered assembly bounds so fast powered flights cannot skip through it. Direct hits shred and eject the body, including the wall-mounted bat assembly; blood marks keep their true elevated position and render on the 3D surfaces. Conveyor blood outlets follow each belt's own ground offset, including the lowered level-three basin.

Detached anatomy is prepared between frames before impact. Its fall uses elapsed time in 120Hz substeps rather than dropping elapsed time below 29fps, so shredding does not put debris into slow motion.

Impact blood uses spatial bins for machinery and all pillow depths, so each droplet checks nearby surfaces instead of the entire extended course. Detached-part materials also compile during preparation rather than first impact.

Desktop launch buttons and tuning controls use larger text and targets. The header speaker opens independent master, character voice, impact/effect, rocket/jetpack, flight wind and music/ambiance sliders, plus mute and restore defaults. Settings apply to playing sounds immediately, retain existing balance and ducking, and persist in browser storage.

Pistons act as fast launch rams: a strong initial push tapers to zero over 0.55 seconds, with full pressure up to 340px separation and a stroke taper ending at 420px. Mounting still supplies signed leverage. Boost pistons double ram force; hydraulic assist multiplies it by 1.9. Bands and springs retain their existing tuning.

Piston-equipped launches mix one of the two supplied ram clips quietly with the catapult launch sound, with no immediate repeat and one ram voice per launch. The supplied installation clip plays when a regular or boost piston is connected. Both follow effects/master volume and mute.

Pull Back animates the arm from its raised build pose (2.95 radians) down to the existing charged pose (3.39 radians) over 0.6 seconds. Launch becomes available when the pull finishes. Charged angle, torque, release timing and launch tuning remain unchanged. Reset cancels the pull.

Detached skulls and limbs collide with conveyor tops using swept downward contact. Belts carry them at the same 180px/s speed as the visible tread; skulls roll, limbs tumble, and parts resume gravity with belt momentum past the outlet. All course ground offsets are respected and underside passes remain free.

Ragdoll nodes and detached bones use swept solid machinery contacts, including high-speed crossings, side hits and underside hits. Rendered GLB housing/support bounds supply collision boxes; 2D press, gate and conveyor surfaces supply their drawn bounds. Incoming normal velocity reflects with reduced energy while tangential motion remains. Conveyor top carrying and cutter damage remain active. A final body pass prevents joint constraints pulling limbs inside machinery.

Striped hopper housings use separate left/right wall and base colliders. Their central 64% intake stays open; entering bodies can reach the existing shred zone while rim hits bounce.

Knife rollers likewise retain a through passage between solid upper/lower housing bands so the conveyor feed can reach their existing cutting contacts and outlet.

## Worldwide arcade records

Run `supabase/world-leaderboard.sql` in the supplied Supabase project's SQL Editor. The game uses the supplied public publishable key with the REST Data API; no SDK or secret key is required. World Top 5 appears on the intro splash and header board, ranked by score descending, distance descending, then earliest server timestamp. Initials are two letters; different runs may share initials. Dates show month/year.

Existing records from `slaughterpultRankingsV1` automatically import from each player's own browser upon entering the game, preserving original month/year. A stable browser ID and deterministic record UUID make retries idempotent; existing local records remain intact. Browser records cannot be retrieved until that browser visits. Legacy records have unknown course/character rather than invented metadata.

Qualifying runs prompt once after settling, or on reset/course selection/Exit to Splash. Save or skip; low scores do not interrupt play. Failed submissions remain available for retry, and UUIDs prevent duplicate writes. The last fetched world board is cached and labelled if offline; qualification refreshes the server board. Escape or the header menu opens Resume, Sound Options, and Exit to Splash. A qualifying save prompt completes before Exit returns to the intro. Animation keeps running. Tab closing cannot reliably show this custom modal; use the in-game Exit flow.

Database permissions allow public reading and validated new inserts, with no public updates/deletes or client-supplied timestamps. Historical month values are validated for legacy imports. This casual leaderboard uses client-reported scores; it does not verify gameplay server-side or prevent fabricated score requests.

Creator-supplied source links and credits are retained in `ASSET_CREDIT_OVERRIDES.json`. The credits generator applies them to matching uploaded files (or embedded titles), retains pending asset credits, and preserves them on deployment. These additions do not enable or place new assets in the game.

The supplied `board_with_nails_in_blood.glb` now renders on every existing nail ramp, replacing drawn planks and substitute weapon meshes while retaining the authored ramp position, slope and collision logic. Original model textures are preserved; its board surface is aligned to the simulated ramp and nails extend to the existing tip height. DISMHa_Ha attribution is included.

The launcher now has a lit 3D steel frame with I-section legs and arm, foot plates, triangular gussets, hex bolts, pivot bearing and mounting collars. It uses the same pivot, arm scale and theta as the existing simulation; the uploaded cradle remains attached as before. Attachments and sockets remain functional. Non-WebGL fallback beams also use steel colors. No physics or course placement was changed.

The supplied Beam industrial Pack N1 by TheSighet replaces the catapult girders/arm and provides ramp/knife-board and press supports, plus parallax wall panels and railings. Two solid beam obstacles per base course and per extension stay 270–390px above the local floor (capped to 62% of viewport height), within the wall area. Their source mesh materials are retained, their solid bounds join swept body/bone collisions, and blood stays on their front surfaces. Source geometries are shared and preserved when rebuilding the frame.

All 12 frame anchors and eight arm anchors, labels, attachments and hover outlines render on a pointer-transparent canvas above the 3D frame, using the original socket coordinates and hit tests. Ramp appearances cycle deterministically between the supplied nail-board model, knife boards using the weapon pack, and custom metal sword props on beam supports. The uploaded weapon pack contains knives/machetes but no sword mesh. Ramp positions, slopes, blade tip heights and launch forces stay unchanged.

The board now shows five entries, one best run per initials. Browsers retain a personal best (including imported history); only improving it can trigger a qualifying world-record prompt. The `slaughterpult_world_best` security-invoker view deduplicates historical rows before applying the top-five limit. Run the SQL setup again to add that view to existing installations; until then, the client deduplicates a bounded legacy result set.

Landing dialogue starts on a two-second timer from the first qualifying ground contact, independently of remaining impact effects or moving fragments. It remains a once-per-flight line and retains protection against being cut off by later impacts/reset.

The uploaded `sky_trampoline.mp4` is the animated sky for level four, Circus; level three uses the supplied Trampoline Park wall and sky. It loops with cover sizing and a small camera crop shift, runs only during Circus gameplay, and pauses in selection/splash menus, other courses and hidden tabs. HTML muted, defaultMuted, zero volume, and a volume-change guard keep its audio permanently off; it is not connected to the sound mixer.

Detached skulls, limbs and torsos use swept downward trampoline contacts, including tilted mats. Each piece receives the pad's authored upward/sideways kick, keeps tumbling, flexes the mat and triggers a short boing with same-pad burst limiting. Powered bounces lift the old short-range debris scatter restriction, allowing fragments to travel to other pads. Rising or underside passes do not bounce, and per-piece cooldown prevents repeated contact boosts. Original intact-ragdoll trampoline progression is unchanged.

Level four, Circus, uses the permanently muted uploaded circus video, colorful ring-floor strips and wall-height bunting. Six starter trampolines, conveyor-fed knife rollers, spiked drums, presses, blade boards, grinders and low wall beams provide a separate course with repeated recovery pads in generated extensions. Existing steampunk supports and backdrop apparatuses supply flames/steam; per-instance circus tints preserve their texture maps and restore original colors in other courses. Trampoline GLBs and both whole-body/detached-part bounce logic support Circus. Score submissions use null optional course metadata for this new course, keeping the existing Supabase schema compatible without rerunning SQL.

Machinery collision bounds now exclude blood decals and mounted-blade visual bounds; individual body/support boxes replace broad unions on solid machines while open intakes remain open. Hopper blood widths come from the actual striped trim/purple-panel overlap, and every stain reserves its full patch radius before the edge. Droplets test those visible surface extents instead of assuming the whole nominal machine width holds blood.

Level three is labelled Trampoline Park and uses `tramp_park_wall.png` / `tramp_park_sky.png`. The interior wall image is aligned to the basin floor with its baked foreground lip cropped; both layers preserve their aspect ratio and pan at separate parallax speeds. The sky never repeats vertically. Original ground, pads, machinery and collision coordinates remain intact; Circus retains its muted MP4.

Circus uses `circus_wall.png` for its spectators/flags backdrop, aligned to the flat course floor. A cached top-edge alpha blend merges its treetops into the video sky; the baked straw floor is cropped out. Wall and permanently muted video sky preserve aspect ratio and pan at 0.55 and 0.18 of camera movement, respectively, with no vertical repeats. The provided wall replaces the separate drawn bunting.

Circus now uses `circus_sky_2.mp4` as one cover-sized, permanently muted video frame with bounded camera crop parallax. It never tiles or appears as repeated copies. The bleacher image is taller (1.18 viewport heights, minimum 680px), stays ground-aligned, and pans more slowly at 0.42 for a farther-back appearance; its upper blend is above the initial viewport. Poles, small independently pulsing colored bulbs and sagging pennant strings line the bleacher top.

Circus has no wall-attached hazards, hanging dolls or industrial wall panels. Knife rollers remain on the floor. Three base bat spinners plus one per generated course extension stand on the floor, face sideways with their rotor axis toward the camera, and retain their forward-knock behavior. Their steampunk axle supports scale down to the floor. The other courses retain their wall machinery.

Trampoline Park now has a world-aligned galvanized chain-link fence in front of the slower park-wall backdrop. Fence posts use the uploaded industrial beam pack. Both original and extended wall rollers are lowered into the fence area, with model-height clearance at the fence top; original trampoline routes and Circus remain unchanged.

Circus crowd is set back behind a 150px decorative straw/dirt apron sampled from the uploaded circus wall artwork, with reduced backdrop parallax. Bat spinners now use visible baseball bats instead of a missing-template knife fallback, catch swept fast contacts, and retain their powered forward/upward kick without the generic solid-machine bounce reversing it.
