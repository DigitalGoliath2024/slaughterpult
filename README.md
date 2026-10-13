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
