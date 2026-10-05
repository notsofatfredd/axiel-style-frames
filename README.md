# AXIEL · Gate G2 style frames

Code-rendered style frames SF-01 to SF-08 (plus SF-07b) for the axiel.co.za homepage, "The Gallery Beneath". This README is the **frame render log** for the G2 checklist (protocol v1.4, §2.5).

Every frame is rendered in three.js 0.169 from the protocol's camera keys (§4.3), light and material (§2.3) and palette tokens (§2.1), built on shared world kits (strata, city, Cartographer, Living Core, seal). Nothing is colour-corrected afterwards. Signed decisions used: G1.1 and G2-1 to G2-9.

## Links

- **Gallery** (finished full-size PNGs, safe on a phone): https://notsofatfredd.github.io/axiel-style-frames/gallery/
- **Live harness** (renders 3D on your device at 2560×1440, heavy): https://notsofatfredd.github.io/axiel-style-frames/

Both update only after a full render run passes (see below), so they always show the last good set. A failed frame also holds back harness changes on the link until a run passes. The harness needs WebGL2 and an internet connection, because three.js and the fonts load from jsdelivr and Google Fonts.

The repository is public, so the code, this README and its history are visible to anyone. The pages carry `noindex` so search engines leave them out of results; Pages cannot send headers, so a direct PNG link is still reachable by anyone who has it.

## Run locally (editing only)

```
cd axiel-style-frames
python -m http.server 5181
```

Open http://127.0.0.1:5181/?check=1 for a quarter-size look while editing. Full-size renders run on GitHub, not on the laptop. Check mode is fine for layout, camera and copy, but not for bloom or glow: bloom reads differently at quarter size (the SF-03 haze was mostly a quarter-size artefact). Judge bloom on the gallery PNGs.

| Key | Action |
|---|---|
| ← → | Previous / next frame |
| C | Toggle the on-screen copy |
| E | Export the current frame as PNG |
| Export all | Downloads every frame |

Link straight to a frame with `#sf-01` … `#sf-08`, or `#sf-07b`. Query options:

| Option | Effect |
|---|---|
| `?tier=mid` | Mid tier (§10.1): no bloom, no mirror, fewer buildings |
| `?vp=phone` | Phone 390×844 at 3× (SF-03, SF-07, SF-07b only, G2-4) |
| `?check=1` | Low-memory check: 1/4 size and 1/4 paper textures. Same scenes, same draw calls and triangles. Not a deliverable. |
| `?debug=bloom` | Shows the bloom layer alone. A check, not a deliverable. |

## Full-size renders (GitHub Actions)

The **Render frames** workflow renders every frame at full size on GitHub's runners (software WebGL, one parallel job per frame), so local memory is not involved: all nine frames on high and mid tier, plus phone for SF-03, SF-07 and SF-07b. It runs on every push that touches `js/`, `index.html`, `assets/`, `tools/` or the workflow, or by hand from the Actions tab (optionally for a few frames, e.g. `SF-03,SF-07`). The run summary shows the render log. The run's artifact `axiel-g2-frames-<run>` holds the gallery: full PNGs, thumbnails, `render-log.md` and `render-log.json`.

How it avoids failing:

| Measure | What it stops |
|---|---|
| Renders run on GitHub's runners, one job per frame | Laptop memory kills; one slow frame holding up the rest |
| Frame timeout 15 min, job timeout 30 min (slowest frame takes about 3 min) | A stuck frame burning hours of Actions minutes |
| Timer polling (2 s), check-mode probe | Headless waits starving while software GL builds a frame |
| Install retries, server readiness check | Network blips failing a run before it renders |
| A frame fails the job if it goes over the §7.2 budget (desktop 150 calls / 500k triangles, phone 80 / 150k, counted as total calls including the post chain) | Over-budget frames passing quietly |
| A frame fails if its 3D layer alone is blank (max luminance under 16, or p5 to p99 spread under 4), measured without the copy overlay | Dead WebGL hidden under live copy |
| A frame fails on any page error, console error, HTTP error or failed load (only the browser's favicon request is excused) | Missing assets or broken scripts passing quietly |
| Pages deploys only when every frame passes on a full run | A broken or partial set replacing the public link |

Proven on 2026-10-05 (run 10, throwaway branch, since deleted): one deliberate fault per check. SF-02 hung and timed out, SF-08 failed at 214 calls > 150, SF-05 failed on an HTTP 404 for a missing asset, and SF-07b failed as a blank 3D layer under live copy. The other five frames passed, the gallery still built, and the deploy was skipped, so the public link kept run 9.

A push cancels an older run still going on the same branch. The repository is public, so standard runner minutes cost nothing; a billing budget cap is only a safety net.

The renders use SwiftShader (software WebGL). Bloom, precision and anti-aliasing can differ on a real GPU, so compare at least one frame on real hardware before sign-off.

## Render settings (all frames)

- **Output:** desktop 2560×1440 (1440 CSS wide), phone 1170×2532 (390×844 at 3×), pixel ratio 1.
- **Pipeline:** HalfFloat MSAA (4×) scene pass → selective bloom (only `--atlas-gold-hot` and `--lantern` emissives) → tone map → 2% paper-fibre grain → sRGB. No vignette.
- **Tone mapping:** none on the paper frames (SF-01, SF-07b, SF-08); Neutral on every other frame.
- **Copy:** drawn on an overlay canvas from the G1-approved copy. In production it is DOM text (§10.2). Montserrat 300–600 and JetBrains Mono 400/500. Scroll counter `nn / 08 · NAME` on every frame.
- **Export names:** `AXIEL_<id>[-mid][-phone]_<scene>_<date>.png`.

## Logo source

- SF-01 uses `assets/axiel-lockup-ink.png` (491×404 RGBA), cut from the approved raster `~/axiel/brand/references/axiel-logo-reference-01.jpeg`.
- The seal (SF-08), the share card stand-in (SF-04 to SF-07) and the specimen stand-ins use `assets/axiel-symbol-ink.png`, cut from the same raster. The seal relief is generated in code from it (G2-3).
- The wordmark is never retyped, rebuilt in CSS or vectorised. A higher-resolution master is needed for production.

## Frame log

| Frame | Scene | Hero moment | Key · p | Camera (position → look · FOV) |
|---|---|---|---|---|
| SF-01 | Surface | Hero copy, crack beginning | K1 · 0.06 | (0, 0, 6) → (0, 0, 0) · 40 |
| SF-02 | Fall | Mid-fall, specimens in shadow, veins dark | K3 · 0.10 | (0, −14, −3) → (0, −22, −6) · 74 · roll 8° |
| SF-03 | ATLAS | Veins lit, carved line face-on, specimens beside it | K4 · 0.17 | (0, −22, −2.5) → (0, −22, −6) · 74 |
| SF-04 | INDEX | Lantern raised; empty display window and blank nameplate | K8 · 0.36 | (−6, 2.4, −28) → (6, 6, −44) · 54 |
| SF-05 | DEVOS | PROPOSED: Core awake, map, fix fragments, stamp | K12 · 0.54 | (10, 26, −104) → (10, 24, −92) · 54 |
| SF-06 | AMOS | Frozen drops, beaded window and nameplate, stain on the neighbour, labels | K16 · 0.79 | (4, 8, −9) → (4, 11, −39) · 40 |
| SF-07 | Proof | Repaired window up close, description highlighted | K17 · 0.85 | (6, 5, −27) → (4, 6, −39) · 54 |
| SF-07b | Proof | Ranked result on the back of the paper wall around the tear | K18 · 0.90 | (0, 5, −16) → (0, 4, 0) · 54 |
| SF-08 | Seal | Official symbol in red wax, INTAKE CLOSED, waitlist tag | K20 · 0.98 | (0, 0, 10) → (0, 0, 0) · 40 |

Every frame's notes panel lists its full light description, tokens, PROPOSED and UNKNOWN items, and its Anti-Generic audit (element · job · ownership).

## PROPOSED (needs Creative Director OK at G2)

**Shared**
- Display window 6 × 5.2 and nameplate 4.2 × 1.55 on the fault building (G2-1: empty window = no share preview, blank nameplate = no business details).
- Share card in the repaired window: the real title and description, with the AXIEL symbol standing in for the og:image (cap 0.25).
- City block map is provisional (G2-8, `docs/city-plot-map.md`).
- Night fill (SF-04, SF-07): night-sky hemisphere π·0.85 / π·0.8 and cold moon π·0.2. Set from numbers, not a visual review (see Render check).

**SF-01 Surface**
- Lockup printed in `--ink` and embossed from the approved raster. Size and position.
- Light from beneath the crack in `--atlas-gold-hot`.
- Hero line 32px at 1440 (Montserrat 300, +0.08em), centred under the lockup, one unit, no full stop (G2-9). Sub-line 16px Montserrat 400 in `--stone`.

**SF-02 Fall**
- Twelve specimen niches as stand-ins (002 to 013): the AXIEL symbol, axiel.co.za as built, and agent graphs. The real twelve are chosen at G3 (G2-2: AXIEL's own only).
- Strata thicknesses and the dressed panel behind each carved line (6.2 wide).

**SF-03 ATLAS**
- Carved line cap height 0.22.
- Vein spill as a soft frontal `--atlas-gold-hot` fill (π·0.3), so the stone reads on mid tier where there is no bloom.
- Phone key: K4 backed off to (0, −22, −1.0).

**SF-04 INDEX**
- Cartographer at (1.8, 0, −34.6) facing the fault building, lantern raised, beam on the window and nameplate (G2-6).
- Buildings the beam has passed keep a low bone window light. Not bloom.

**SF-05 DEVOS** (the whole hero moment is PROPOSED in the protocol)
- Low warm `--atlas-gold-hot` raking key from the right.
- Core: max radius 6, three tiers and three brass rings on a stepped stone plinth (G2-7).
- Fix kit: map unfolded above the crown, five gold-leaf filaments, 24 fragments. Stamp "SPECIMEN No. 001 · VERIFIED".
- The paper wall's back face as the horizon.

**SF-06 AMOS**
- Static frozen drops (G2-5): about 1500 on high, 600 on mid, leaning 12° toward the camera.
- Beads on the repaired window and nameplate. One `--signal-red` stain on the neighbour at (−12, 8).
- Labels in `--signal-pass` mono, each on its own frozen drop.
- No mirror floor here: at K16 the street floor is below the frame. The mirror reads at K14 / K15.

**SF-07 Proof**
- K17 itself. The façade still wet from the AMOS rain.
- Cartographer at (−1.5, 0, −33), out of frame left, beam on the window.
- Phone key: K17 backed off along its axis to (6.37, 4.81, −24.75).

**SF-07b Proof**
- K18 itself. Printed result block 8 × 6 centred at (0, 6) above the tear (the protocol says 16 × 6; 8 wide fits a phone).
- Layout: rank and query, URL in mono, title (cap 0.34), description (cap 0.29).
- Phone key: K18 backed off to (0, 5, −17.5).

**SF-08 Seal**
- Seal R 1.2: the official symbol in `--signal-red` wax (G2-3). "INTAKE CLOSED" printed in red under it.
- Tag 4.2 × 3.0 with a "SPECIMEN No." header; the number is stamped on submit (§9.3).
- The string runs from the tag's eyelet to under the wax.

## UNKNOWN / open

- **SF-01:** a higher-resolution lockup master is needed for production.
- **SF-03 phone:** at 390 wide no specimen fits beside the carved line inside the chasm. Proposal for G4: on phone, place a specimen above or below each carved line.
- **SF-06:** label values are the protocol's D4 set, not a real AMOS run.
- **SF-07:** the real og:image is not made yet (G2-1 says the fix supplies it). Card cap 0.25 meets the legibility minimum only at the §7 test sizes.
- **SF-07b:** rank and query (M5) shown as "No. [rank]" and "[query]" until supplied.
- **SF-08:** the submit control on the tag (label and position) and the "What do you need?" options (§9.3).

## Render check (2026-10-05, full size)

Headless numeric check only. **This is not a visual review.** All 24 deliverable PNGs rendered at full size by the Render frames workflow (run 6, GitHub Actions, SwiftShader software WebGL). Luminance is 0–255 sRGB from a 320 px downsample: mean / p5 / p50 / p95 / p99 / max. "Near-black" is the share of pixels ≤ 4. "Build / render ms" is software-GL time on the runner, not a performance figure. 0 console errors and 0 context losses on every render.

Budgets (§7.2): desktop ≤ 150 calls and ≤ 500k triangles; phone ≤ 80 calls and ≤ 150k triangles. "Calls" is scene calls / total calls including the post chain. Every frame is inside budget. Phone SF-07 high uses 78 of 80 total calls; 47 of those are the post chain, not the scene.

| Frame | Tier · viewport | Size | Calls (scene / total) | Triangles | Luminance | Near-black | ≥ 250 | Build / render ms | Errors |
|---|---|---|---|---|---|---|---|---|---|
| SF-01 | high · desktop | 2560×1440 | 1 / 18 | 2 | 235 / 230 / 236 / 243 / 245 / 255 | 0.0% | 0.3% | 188 / 29579 | 0 |
| SF-01 | mid · desktop | 2560×1440 | 1 / 4 | 2 | 235 / 230 / 236 / 243 / 245 / 255 | 0.0% | 0.2% | 188 / 13395 | 0 |
| SF-02 | high · desktop | 2560×1440 | 15 / 18 | 30,482 | 28 / 0 / 21 / 87 / 98 / 165 | 38.6% | 0.0% | 337 / 1809 | 0 |
| SF-02 | mid · desktop | 2560×1440 | 15 / 18 | 30,482 | 28 / 0 / 21 / 87 / 98 / 165 | 38.6% | 0.0% | 347 / 1658 | 0 |
| SF-03 | high · desktop | 2560×1440 | 15 / 46 | 30,482 | 64 / 14 / 49 / 190 / 231 / 233 | 0.4% | 0.0% | 560 / 7962 | 0 |
| SF-03 | high · phone | 1170×2532 | 15 / 46 | 30,482 | 66 / 29 / 51 / 193 / 231 / 232 | 0.0% | 0.0% | 422 / 4620 | 0 |
| SF-03 | mid · desktop | 2560×1440 | 15 / 18 | 30,482 | 36 / 10 / 33 / 60 / 210 / 214 | 0.6% | 0.0% | 410 / 2228 | 0 |
| SF-03 | mid · phone | 1170×2532 | 15 / 18 | 30,482 | 41 / 11 / 39 / 59 / 210 / 220 | 0.0% | 0.0% | 396 / 4530 | 0 |
| SF-04 | high · desktop | 2560×1440 | 34 / 84 | 8,120 | 13 / 1 / 9 / 41 / 157 / 214 | 14.9% | 0.0% | 500 / 9328 | 0 |
| SF-04 | mid · desktop | 2560×1440 | 34 / 37 | 3,896 | 13 / 1 / 10 / 40 / 156 / 213 | 14.8% | 0.0% | 317 / 2525 | 0 |
| SF-05 | high · desktop | 2560×1440 | 57 / 130 | 36,018 | 65 / 9 / 56 / 137 / 213 / 235 | 2.5% | 0.0% | 223 / 4038 | 0 |
| SF-05 | mid · desktop | 2560×1440 | 57 / 60 | 31,794 | 59 / 7 / 52 / 100 / 190 / 222 | 2.3% | 0.0% | 222 / 2066 | 0 |
| SF-06 | high · desktop | 2560×1440 | 39 / 42 | 334,478 | 28 / 10 / 23 / 58 / 143 / 210 | 0.0% | 0.0% | 225 / 2748 | 0 |
| SF-06 | mid · desktop | 2560×1440 | 39 / 42 | 141,854 | 28 / 10 / 23 / 56 / 143 / 210 | 0.0% | 0.0% | 196 / 2081 | 0 |
| SF-07 | high · desktop | 2560×1440 | 34 / 84 | 8,108 | 25 / 1 / 6 / 187 / 201 / 204 | 28.5% | 0.0% | 417 / 3940 | 0 |
| SF-07 | high · phone | 1170×2532 | 31 / 78 | 7,660 | 55 / 1 / 8 / 201 / 201 / 216 | 24.1% | 0.0% | 271 / 3503 | 0 |
| SF-07 | mid · desktop | 2560×1440 | 34 / 37 | 3,884 | 25 / 1 / 6 / 187 / 201 / 204 | 28.5% | 0.0% | 280 / 2104 | 0 |
| SF-07 | mid · phone | 1170×2532 | 31 / 34 | 3,436 | 55 / 1 / 8 / 201 / 201 / 216 | 24.1% | 0.0% | 299 / 3447 | 0 |
| SF-07b | high · desktop | 2560×1440 | 2 / 5 | 4 | 193 / 14 / 208 / 244 / 244 / 255 | 0.0% | 0.2% | 366 / 564 | 0 |
| SF-07b | high · phone | 1170×2532 | 2 / 5 | 4 | 185 / 14 / 209 / 244 / 244 / 255 | 0.0% | 0.7% | 226 / 506 | 0 |
| SF-07b | mid · desktop | 2560×1440 | 2 / 5 | 4 | 193 / 14 / 208 / 244 / 244 / 255 | 0.0% | 0.2% | 217 / 520 | 0 |
| SF-07b | mid · phone | 1170×2532 | 2 / 5 | 4 | 185 / 14 / 209 / 244 / 244 / 255 | 0.0% | 0.7% | 307 / 514 | 0 |
| SF-08 | high · desktop | 2560×1440 | 11 / 14 | 33,220 | 226 / 136 / 235 / 243 / 245 / 251 | 0.0% | 0.0% | 215 / 1061 | 0 |
| SF-08 | mid · desktop | 2560×1440 | 11 / 14 | 33,220 | 226 / 136 / 235 / 243 / 245 / 251 | 0.0% | 0.0% | 216 / 394 | 0 |

The earlier quarter-size check (`?check=1`, 2026-10-02) matches these numbers except where bloom is involved: bloom kernels are fixed in pixels, so at quarter size the glow spread about 4× wider. SF-03 high went from mean 80 / p5 38 (quarter size) to 64 / 14 (full size): the glow sits tighter around the veins.

**Changes made from the numbers (PROPOSED, need a visual OK):**
- SF-04 and SF-07 night fill raised (sky π·0.22 → π·0.85 / π·0.8, moon π·0.05 → π·0.2). Before this, 66% of SF-04 measured near-black, because Neutral tone mapping squares everything under about 0.08 linear.
- SF-03 vein spill fill (π·0.3). Mid tier had the stone at 4/255 without it.
- Bloom threshold 0 on SF-04 and SF-07. The bloom source is already lantern and gold-hot only, and a 0.5 / 0.55 cut left almost nothing.

**Flags for the visual review (Saeed):**
- SF-07: 28% of the frame is near-black around the lit window. This may be right for night, or it may need more fill.
- SF-02: 39% near-black. The protocol says the veins are dark here.
- SF-04: 15% near-black after the night fill.
- SF-03: check the glow around the veins at full size.

## Files

```
index.html            harness page (tokens, tabs, notes panel)
js/app.js             renderer, post chain, tiers, viewports, stats, export
js/core.js            palette, shared materials and shaders, camera, copy helpers
js/paper.js           paper sheet shader (Surface, Proof back face, Seal)
js/kit/strata.js      chasm cliff, veins, carved lines, specimen niches
js/kit/city.js        city blocks, façades, fault building, share card, stain
js/kit/cartographer.js  the Cartographer rig and lantern
js/kit/livingcore.js  the Living Core and fix kit
js/kit/seal.js        wax seal, specimen tag, string
js/frames/sf0*.js     one module per frame: build(), overlay(), notes
js/frames/util.js     rig bake, leader labels
kit-check.html        world-kit smoke test
tools/render.mjs      full-size render + render log + budget gate (used by .github/workflows/render.yml)
tools/gallery.py      merges the per-frame renders into the Pages gallery
assets/               approved raster lockup and symbol
```
