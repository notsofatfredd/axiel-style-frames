# AXIEL · Gate G2 style frames

Code-rendered style frames SF-01 to SF-08 (plus SF-07b) for the axiel.co.za homepage, "The Gallery Beneath". This README is the **frame render log** for the G2 checklist (protocol v1.4, §2.5).

Every frame is rendered in three.js 0.169 from the protocol's camera keys (§4.3), light and material (§2.3) and palette tokens (§2.1), built on shared world kits (strata, city, Cartographer, Living Core, seal). Nothing is colour-corrected afterwards. Signed decisions used: G1.1 and G2-1 to G2-9.

## Run

```
cd axiel-style-frames
python -m http.server 5181
```

Open http://127.0.0.1:5181/ (or the GitHub Pages link). A page needs WebGL2 and an internet connection, because three.js and the fonts load from jsdelivr and Google Fonts.

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
- Display window 6 × 5.2 and nameplate 3.6 × 1.4 on the fault building (G2-1: empty window = no share preview, blank nameplate = no business details).
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

## Render check (2026-10-02)

Headless numeric check only. **This is not a visual review.** Run in `?check=1` (quarter size, quarter paper textures) because full-size renders ran out of memory on this machine. The draw calls and triangles are the real ones. Luminance is 0–255 sRGB from a 160 px downsample: mean / p5 / p50 / p95 / p99 / max. "Near-black" is the share of pixels ≤ 4. 0 console errors and 0 context losses on every run.

Budgets (§7.2): desktop ≤ 150 calls and ≤ 500k triangles; phone ≤ 80 calls and ≤ 150k triangles. "Calls" is scene calls / total calls including the post chain.

| Frame | Tier · viewport | Calls | Triangles | Luminance | Near-black |
|---|---|---|---|---|---|
| SF-01 | high · desktop | 1 / 18 | 2 | 232 / 221 / 233 / 244 / 254 / 255 | 0 (1.5% at ≥ 250) |
| SF-01 | mid · desktop | 1 / 4 | 2 | | |
| SF-02 | high = mid · desktop | 15 / 18 | 30,482 | 28 / 0 / 22 / 87 / 98 / 117 | 37.8% (veins dark, by design) |
| SF-03 | high · desktop | 15 / 46 | 30,482 | 80 / 38 / 70 / 180 / 228 / 229 | 0 |
| SF-03 | mid · desktop | 15 / 18 | 30,482 | 36 / 11 / 33 / 61 / 210 / 212 | 0.5% |
| SF-03 | high · phone | 15 / 46 | 30,482 | 83 / 51 / 71 / 184 / 228 / 229 | 0 |
| SF-03 | mid · phone | 15 / 18 | 30,482 | 41 / 11 / 38 / 68 / 210 / 217 | 0 |
| SF-04 | high · desktop | 34 / 84 | 8,120 | 13 / 1 / 9 / 44 / 150 / 184 | 13.8% |
| SF-04 | mid · desktop | 34 / 37 | 3,896 | 13 / 2 / 9 / 42 / 150 / 184 | 13.5% |
| SF-05 | high · desktop | 57 / 130 | 36,018 | 67 / 18 / 57 / 133 / 202 / 230 | 0 |
| SF-05 | mid · desktop | 57 / 60 | 31,794 | 59 / 7 / 50 / 106 / 160 / 216 | 1.9% |
| SF-06 | high · desktop | 39 / 42 | 334,478 | 28 / 10 / 23 / 57 / 137 / 162 | 0 |
| SF-06 | mid · desktop | 39 / 42 | 141,854 | | |
| SF-07 | high · desktop | 34 / 84 | 8,108 | 26 / 1 / 5 / 186 / 201 / 204 | 29.6% |
| SF-07 | mid · desktop | 34 / 37 | 3,884 | 26 / 1 / 5 / 186 / 201 / 204 | 29.6% |
| SF-07 | high · phone | 31 / 78 | 7,660 | 55 / 1 / 8 / 200 / 201 / 204 | 24.1% |
| SF-07 | mid · phone | 31 / 34 | 3,436 | 55 / 1 / 8 / 200 / 201 / 204 | 24.1% |
| SF-07b | high = mid · desktop | 2 / 5 | 4 | 190 / 15 / 205 / 244 / 244 / 247 | 0 |
| SF-07b | high = mid · phone | 2 / 5 | 4 | 183 / 14 / 206 / 244 / 244 / 254 | |
| SF-08 | high = mid · desktop | 11 / 14 | 33,220 | 223 / 170 / 231 / 242 / 246 / 252 | 0 |

Blank cells were not measured. Every frame is inside budget. Phone SF-07 high uses 78 of 80 total calls; 47 of those are the post chain, not the scene.

**Changes made from these numbers (PROPOSED, need a visual OK):**
- SF-04 and SF-07 night fill raised (sky π·0.22 → π·0.85 / π·0.8, moon π·0.05 → π·0.2). Before this, 66% of SF-04 measured near-black, because Neutral tone mapping squares everything under about 0.08 linear.
- SF-03 vein spill fill (π·0.3). Mid tier had the stone at 4/255 without it.
- Bloom threshold 0 on SF-04 and SF-07. The bloom source is already lantern and gold-hot only, and a 0.5 / 0.55 cut left almost nothing.

**Flags for the visual review (Saeed):**
- SF-07: 30% of the frame is near-black around the lit window. This may be right for night, or it may need more fill.
- SF-02: 38% near-black. The protocol says the veins are dark here.
- SF-03: the bloom-only layer averages about 60/255 across the whole frame, which can read as haze. Bloom kernels are fixed in pixels, so at quarter size the spread is about 4× wider than at full size. This needs a look at 2560×1440.
- The full 2560×1440 and 1170×2532 deliverable PNGs are not exported yet. They need about 2 GB of free memory.

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
assets/               approved raster lockup and symbol
```
