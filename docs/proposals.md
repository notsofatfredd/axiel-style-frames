# PROPOSED decisions (G6 technical prototype)

Choices the build made where the protocol is silent or two sources disagree. Each needs the Creative Director's OK
(or a change) before G6 is signed. Earlier gates list theirs in the README (G2 PROPOSED, G4 changed keys, G5 timing).

| # | Decision | Why | Where |
|---|---|---|---|
| P6-1 | **Rain falls toward the façades (moves in −z).** | §3.2 says "a 12° slant toward the +z façades". SF-06 drew its frozen streaks leaning toward the camera instead. The prototype follows §3.2; the frame and the prototype disagree until the CD picks one. | `site/components/scenes/rain.ts` (DIR) |
| P6-2 | **Paper grain is a DOM overlay** (fixed full-screen tile, overlay blend, 2%), not a post-processing pass. | Same fibre texture and strength as the frames (js/app.js GrainShader), one less full-screen pass on Mid, and it never touches the WebGL budget. @react-three/postprocessing is not installed. | `site/components/overlay/Grain.tsx` |
| P6-3 | **Freeze labels only inside 0.68 to 0.80** (the labels row), and only once AMOS is built. | §5.3 says "on freeze" without a window; outside the rain there are no drops to hang them on. | `site/components/Freeze.tsx` |
| P6-4 | **Labels type back out at 15 ms per char** when scrolling resumes (in at 40 ms per char, §5.3). | The protocol gives the type-in only. A quick un-type reads as the reading being released, not a cut. | `site/components/overlay/DropLabels.tsx` |
| P6-5 | **A label flips to the inboard side** of its drop when the outboard side has no room. | Keeps every reading whole on screen at 390 px wide. | `site/components/scenes/amosWorld.ts` (pickLabels) |
| P6-6 | **Registration order** of the repaired building as the beads row scrubs: window 0.15, nameplate 0.35, fascia 0.50, door 0.60, stain 0.80, other 0.95 (G channel of the integrity mask). | §5.3 says "per element" without an order. Window first because it is the fix; the stain last so the fault reads after the work is shown passing. | `site/components/scenes/integrity.ts` |
| P6-7 | **Rain targets:** 25% of drops aimed at the façade mask, 40% the street, 35% the plateau roofs. | Enough drops hit the building that beading and staining read; the rest keep the street wet. | `site/components/scenes/rain.ts` |
| P6-8 | **Cloud base at y 26**, drops visible 0.8 s after impact (bead roll or soak). | Above every roof in frame at K14 to K16; 0.8 s lets a bead visibly roll. | `site/components/scenes/rain.ts` (TOP, POST) |
| P6-9 | **Mid tier water film** uses an environment tint instead of a mirror. | §10.1 says Mid has no planar reflection; the film still reads as wet. | `site/shaders/waterFilm.glsl` (NO_REFLECT) |
| P6-10 | **Phone layout below 760 px wide** (phone camera keys, 900vh scroll, phone copy sizes). | The frames and animatic use 390 px; 760 covers large phones in portrait without catching tablets. | `site/lib/tiers.ts` |
| P6-11 | **fps bench rule:** scripted descent 0.58 to 0.79, 3 s hold (frozen), on to 0.82 and back to 0.58 at 40 s per unit of p (30 on phone); passes if the mean is at least 97% of the target and the 1% low at least 75%. | §6 gives the targets (60 desktop, 45 mobile) but not how to measure them. | `site/components/overlay/Bench.tsx`, `?bench=1` |
| P6-12 | **Fonts load from Google Fonts by family name**, not next/font. | The canvas label and copy textures in the shared kits name 'Montserrat' and 'JetBrains Mono' directly; next/font renames the families. | `site/app/layout.tsx` |
| P6-13 | **Review hosting:** the prototype is served from the existing GitHub Pages site at `/proto/`, noindex, for review only. | Not the production host: hosting is a human decision at G6 (README). | `.github/workflows/render.yml` |
