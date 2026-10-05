# AXIEL · The Gallery Beneath (G2 style frames, G3 hero objects, G4 camera, G5 motion, G6 prototype, G7 assets)

Code-rendered style frames SF-01 to SF-08 (plus SF-07b) and the G3 hero objects for the axiel.co.za homepage, "The Gallery Beneath". This README is the **frame render log** for the G2 checklist (protocol v1.4, §2.5) and the object log for G3, the camera log for G4, the timing log for G5, the prototype log for G6 and the asset log for G7.

Every frame is rendered in three.js 0.169 from the protocol's camera keys (§4.3), light and material (§2.3) and palette tokens (§2.1), built on shared world kits (strata, city, Cartographer, Living Core, seal, paper wall). Nothing is colour-corrected afterwards. Signed decisions used: G1.1 and G2-1 to G2-9.

## Gate status

| Gate | Status |
|---|---|
| G2 style frames | **Self-reviewed (4 passes), awaiting CD signature.** Every render and gate check passes; the decisions only the CD can make are listed under [For the CD](#for-the-cd-g2-sign-off). |
| G3 hero objects | **Self-reviewed (2 passes), awaiting CD signature.** Every object inside budget, all eight Cartographer animations and the dart built. Human blockers listed under [G3](#g3-hero-objects). |
| G4 camera path and animatic | **Self-reviewed (2 passes), awaiting CD signature.** Clearance and legibility pass on desktop and phone; storyboard and 1080p animatic in the gallery. Human blockers listed under [G4](#g4-camera-path-and-animatic). |
| G5 motion lock | **Self-reviewed (2 passes), awaiting CD signature.** All timing checks, the seven carriers and the reverse-scroll test pass on both viewports in every camera mode. Human blockers listed under [G5](#g5-motion-lock). |
| G6 technical prototype | **Self-reviewed (2 passes), awaiting CD signature.** Every behaviour check passes on desktop and phone. Human blockers: fps on a real laptop and phone, freeze feel, hosting. See [G6](#g6-technical-prototype-amos). |
| G7 assets | **Self-reviewed (2 passes), awaiting CD signature.** Nine GLBs match their kits, inside every budget. Human blockers listed under [G7](#g7-assets). |
| G8 integration | **In progress.** The whole scroll as one scene; see [G8](#g8-integration). |
| G9 to G11 | Not started. |

No gate is signed by the build itself. "Self-reviewed" means every checklist item was checked against the renders, not that it is approved.

## Links

- **Gallery** (finished full-size PNGs, Cartographer silhouette test, hero objects; safe on a phone): https://notsofatfredd.github.io/axiel-style-frames/gallery/
- **Live harness** (renders 3D on your device at 2560×1440, heavy): https://notsofatfredd.github.io/axiel-style-frames/
- **Cartographer page** (G2-6 silhouette test, live): https://notsofatfredd.github.io/axiel-style-frames/cartographer.html
- **Objects page** (G3 budgets and turnarounds, live, heavy): https://notsofatfredd.github.io/axiel-style-frames/objects.html
- **G6 prototype** (AMOS on the production stack, live, heavy; `?hud=1`, `?bench=1`, `?tier=mid`): https://notsofatfredd.github.io/axiel-style-frames/proto/
- **G7 asset check** (loads the packed GLBs beside their kits, live, heavy): https://notsofatfredd.github.io/axiel-style-frames/assets.html?mode=verify

All of them update only after a full render run passes (see below), so they always show the last good set. A failed frame also holds back harness changes on the link until a run passes. The pages need WebGL2 and an internet connection, because three.js and the fonts load from jsdelivr and Google Fonts.

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

The **Render frames** workflow does all the heavy work on GitHub's runners (software WebGL), so local memory is not involved:

| Job | What it does |
|---|---|
| render | One parallel job per frame: all nine frames on high and mid tier, plus phone for SF-03, SF-07 and SF-07b (24 PNGs) |
| carto | Captures `cartographer.html` (G2-6 silhouette test); fails over 10k triangles or 30 hinges |
| objects | Captures `objects.html` (G3): every hero object counted against its budget, lit turnarounds as PNGs; fails on an over-budget row or a page error |
| animatic | Captures `animatic.html` (G4): storyboard frame per key and MP4 fly-through for desktop and phone (ffmpeg), plot map, `anim.json` and `clearance.md`; clearance findings are reported, the job fails only on a page error |
| collect | Merges everything into the gallery (frames, CARTOGRAPHER, OBJECTS and ANIMATIC sections) |
| deploy | Publishes the harness, the test pages and `/gallery/` to Pages |

It runs on every push that touches `js/`, `index.html`, `cartographer.html`, `objects.html`, `assets/`, `tools/` or the workflow, or by hand from the Actions tab (optionally for a few frames, e.g. `SF-03,SF-07`). The run summary shows the render log. The run's artifacts hold the gallery (`axiel-g2-frames-<run>`: full PNGs, thumbnails, `render-log.md`, `render-log.json`), `carto` and `objects`.

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
| A frame fails if a label's leader points off frame or behind its label, or a nameplate line overflows its plate | Labels and plate text drifting off as cameras move |
| Hero objects fail on a budget overrun unless the row carries a documented ceiling (reason and fallback) | Objects growing past §3.2 / §3.3 quietly |
| Pages deploys only when every job passes on a full run, and only from the gallery branch (`worktree-g2-v14`, or the repo variable `GALLERY_BRANCH`) | A broken or partial set, or a side branch, replacing the public link |

Proven on 2026-10-05 (run 10, throwaway branch, since deleted): one deliberate fault per check. SF-02 hung and timed out, SF-08 failed at 214 calls > 150, SF-05 failed on an HTTP 404 for a missing asset, and SF-07b failed as a blank 3D layer under live copy. The other five frames passed, the gallery still built, and the deploy was skipped, so the public link kept run 9.

Side branches (parallel G3 work) render and gate the same way and keep their artifacts for review, but never deploy. A push cancels an older run still going on the same branch.

The renders use SwiftShader (software WebGL). Bloom, precision and anti-aliasing can differ on a real GPU, so compare at least one frame on real hardware before sign-off.

## Render settings (all frames)

- **Output:** desktop 2560×1440 (1440 CSS wide), phone 1170×2532 (390×844 at 3×), pixel ratio 1.
- **Pipeline:** HalfFloat MSAA (4×) scene pass → selective bloom (only `--atlas-gold-hot` and `--lantern` emissives) → tone map → 2% paper-fibre grain → sRGB. No vignette.
- **Tone mapping:** none on the paper frames (SF-01, SF-07b, SF-08); Neutral on every other frame.
- **Copy:** drawn on an overlay canvas from the G1-approved copy. In production it is DOM text (§10.2). Montserrat 300–600 and JetBrains Mono 400/500. Scroll counter `nn / 08 · NAME` on every frame.
- **Export names:** `AXIEL_<id>[-mid][-phone]_<scene>_<date>.png`.

## Logo source

- SF-01 uses `assets/axiel-lockup-ink.png` (491×404 RGBA), cut from the approved raster `~/axiel/brand/references/axiel-logo-reference-01.jpeg`.
- The seal (SF-08), the share card stand-in (SF-04 to SF-07) and specimen No. 003 use `assets/axiel-symbol-ink.png`, cut from the same raster. The seal relief is generated in code from it (G2-3).
- The wordmark is never retyped, rebuilt in CSS or vectorised. A higher-resolution master is needed for production.

## Frame log

Cameras as rendered (read back from the render log). Keys the protocol marks PROPOSED, and every move away from a protocol key, are listed under PROPOSED.

| Frame | Scene | Hero moment | Key · p | Camera (position → look · FOV) |
|---|---|---|---|---|
| SF-01 | Surface | Hero copy, crack beginning | K1 · 0.06 | (0, 0, 6) → (0, 0, 0) · 40 |
| SF-02 | Fall | Mid-fall, specimens in shadow, veins dark | K3 · 0.10 | (0, −14, −3) → (0, −22, −6) · 74 · roll 8° |
| SF-03 | ATLAS | Veins lit, carved line face-on, specimens beside it | K4 · 0.17 | (0, −22, −2.5) → (0, −22, −6) · 74 · phone (0, −22, −1) |
| SF-04 | INDEX | Lantern raised; empty display window and blank nameplate | K8 · 0.36 | (−6, 2.4, −28) → (6, 6, −44) · 54 |
| SF-05 | DEVOS | PROPOSED: Core awake, map, fix fragments, stamp | K12 · 0.54 | (10, 25, −107) → (10, 26.2, −92) · 54 |
| SF-06 | AMOS | Frozen drops, beaded window and nameplate, stain on the neighbour, labels | K16 · 0.79 | (−2, 8, −9) → (−2, 11, −39) · 40 |
| SF-07 | Proof | Repaired window up close, description highlighted | K17 · 0.85 | (6, 5, −27) → (4, 5.2, −39) · 54 · phone (6.37, 4.81, −24.75) → (4, 6, −39) |
| SF-07b | Proof | Ranked result on the back of the paper wall above the tear | K18 · 0.90 | (6, 5, −16) → (6, 4, 0) · 54 · phone (0, 2.6, −18.5) → (0, 1.6, 0) |
| SF-08 | Seal | Official symbol in red wax, INTAKE CLOSED, waitlist tag | K20 · 0.98 | (0, 0, 10) → (0, 0, 0) · 40 |

Every frame's notes panel lists its full light description, tokens, PROPOSED and UNKNOWN items, and its Anti-Generic audit (element · job · ownership).

## PROPOSED (needs Creative Director OK at G2)

Copied from the frames' notes panels, which are the source of truth.

**Shared**
- Display window 6 × 5.2 and nameplate 4.2 × 1.55 on the fault building, sized so the email line fits at the legibility cap (G2-1: empty window = no share preview, blank nameplate = no business details).
- Share card in the repaired window: the real title and description, with the AXIEL symbol standing in for the og:image (cap 0.25).
- City block map is provisional (G2-8, `docs/city-plot-map.md`).
- Night fill (SF-04, SF-07): night-sky hemisphere π·0.85 / π·0.8 and cold moon π·0.2.
- Scroll counter "nn / 08 · NAME" (mono 11px, left edge, rotated) on every frame.

**SF-01 Surface**
- Lockup printed in `--ink` and embossed from the approved raster. Size and position.
- Light from beneath the crack in `--atlas-gold-hot`.
- Hero line 32px at 1440 wide, Montserrat 300, +0.08em, centred under the lockup; one unit, no full stop (G2-9).
- Sub-line "Strategy-first systems design." 16px Montserrat 400 in `--stone`, 34px under the hero line.

**SF-02 Fall**
- Twelve specimen niches (002 to 013), AXIEL's own work only (G2-2). The twelve are PROPOSED under [G3](#g3-hero-objects).
- Strata thicknesses and the dressed panel behind each carved line (6.2 wide).
- Daylight through the tear as the only key while the veins are dark.

**SF-03 ATLAS**
- Carved line cap height 0.22 (line 2 "on ATLAS.").
- Phone key: K4 backed off to (0, −22, −1.0), distance 5. The chasm is only 6 deep (paper wall at z 0), so it cannot back off further.
- Specimens at (−3.7, −23.2) and (3.6, −20.8) flank the line on desktop.
- Vein spill as a soft frontal `--atlas-gold-hot` fill (π·0.3), so the stone reads on mid tier where there is no bloom.

**SF-04 INDEX**
- Cartographer at (1.8, 0, −34.6) facing the fault building, lantern raised, beam on the window and nameplate.
- Cartographer form: a pleated paper tunic to mid-thigh and the map held open low in the right hand, outboard of the body, so folds and map carry the silhouette (G2-6).
- Beam 18° → 42° read as the full cone angle (half-angle 9° → 21°).
- Buildings the beam has passed keep a low bone window light (read as "indexed"). Not bloom.

**SF-05 DEVOS** (the whole hero moment is PROPOSED in the protocol)
- DEVOS key light: low warm `--atlas-gold-hot` raking key.
- Core: max radius 6, three tiers and three brass rings on a stepped stone plinth (G2-7).
- Fix kit: the map unfolded 5.3 above the crown, five gold-leaf filaments to the two findings and the route, 24 fragments (glass while forming, gold leaf once set).
- Stamp "SPECIMEN No. 001 · VERIFIED" locking onto the crown front.
- The paper wall's back face as the horizon behind the city.
- K12 pulled back to distance 15, camera (10, 25, −107) aimed at (10, 26.2, −92), so the map above the crown is in frame.

**SF-06 AMOS**
- Static frozen drops (G2-5): about 1500 on high, 600 on mid, leaning 12° toward the camera.
- Beads on the repaired window glass and nameplate.
- The stain on the neighbour's fascia level at (−12, 8): `--signal-red` soaked into its sign.
- Labels in `--signal-pass` mono (cap ≈ 18px at 1440), each with a leader to its own frozen drop.
- No mirror floor in this frame: at K16 the street floor is below the frame. The mirror reads at K14 / K15.
- K16 slid 6 units left to (−2, 8, −9) → (−2, 11, −39), face-on kept, so the copy clears the window.

**SF-07 Proof**
- K17 itself (protocol marks it PROPOSED).
- Share card in the window: the real title and description, with the AXIEL symbol standing in for the og:image (cap 0.25).
- Description highlighted in `--atlas-gold-hot`.
- The façade still wet from the AMOS rain (continuity from SF-06).
- Cartographer at (−3.5, 0, −32.5), out of frame left, beam on the window (at (−1.5, 0, −33) the lantern showed in the bottom-left corner once K17 looked lower).
- Phone key: K17 backed off along its axis to distance 14.5, camera (6.37, 4.81, −24.75).
- Desktop key: K17 looks at (4, 5.2, −39), not (4, 6, −39), so the 4.2 × 1.55 nameplate sits whole above the frame edge (bottom ≈ 756 of 810; at y 6 the email line was cut).

**SF-07b Proof**
- K18 itself (protocol marks it PROPOSED).
- Printed result block 8 × 6 centred at (0, 6), above the tear (protocol says 16 × 6; 8 wide fits a phone).
- Result layout: rank and query, URL in mono, title (cap 0.34), description (cap 0.29). Printed in `--ink` on the bone back face.
- Desktop key: K18 at (6, 5, −16) looking at (6, 4, 0), so on screen the tear and the result sit right of the copy column and the closing line never crosses the tear.
- Phone key: K18 at (0, 2.6, −18.5) looking at (0, 1.6, 0), so the tear ends above the closing line and the result clears the counter; result block 6.6 wide so it keeps the 24 px margin.
- Back face sheet 46 × 26 so no edge shows at either key.
- No street lip in the foreground (at K18 it covered the closing line).
- The result sits above the tear, not wrapped around it as the protocol says: wrapping the copy round the tear is left for the CD to decide.

**SF-08 Seal**
- Seal R 1.2 at (−2.2, 0.55): the official symbol raised in `--signal-red` wax with a plain rim (G2-3).
- "INTAKE CLOSED" printed in `--signal-red` on the paper under the seal (Montserrat 500, +0.2em).
- Tag 4.2 × 3.0 at (2.9, −0.2), turned −6°, with "SPECIMEN No." header; the number is stamped on submit (§9.3).
- The string runs from the tag's eyelet to under the wax.

## UNKNOWN / open

- **SF-01:** the lockup source is the approved reference raster (491×404 px cut). A higher-resolution master is needed for production.
- **SF-03 phone:** at 390 wide no specimen fits beside the carved line inside the chasm. Proposal for G4: on phone, place a specimen above or below each carved line so one passes during the K4a → K4c climb.
- **SF-06:** label values are the protocol's D4 set, not a real AMOS run. Real readings replace them once AMOS has run.
- **SF-07:** card legibility: cap 0.25 reads ≈ 16px at 1440×810 and ≈ 18px at 1440×900 (the §7 test size); phone ≈ 14.3px. Both meet the minimum only at their test sizes.
- **SF-07:** the real og:image is not made yet (G2-1 says the fix supplies it).
- **SF-07:** nameplate business details: AXIEL, axiel.co.za and info@axiel.co.za (the protocol's form address) are shown; the address and anything else the structured data will carry are UNKNOWN until the INDEX run (M5).
- **SF-07b:** rank number and query (M5) shown as "No. [rank]" and "[query]" until supplied.
- **SF-08:** the submit control on the tag (label and position) and the "What do you need?" options (§9.3).

## G2 self-review

Four passes over the full-size gallery PNGs, desktop and phone, high and mid, worst problem first. Each pass ends with a green run and a fresh gallery. Checked every time: camera and framing, copy legibility and fit, palette tokens only, light per §2.3, Anti-Generic audit, budgets, and no page errors.

| Pass | Reviewed | Fixed in | Main fixes |
|---|---|---|---|
| 1 | Run 9 | 39d5892 → run 11 | Strata veins as thin isolines (not neon); every plate label shrinks to fit; SF-06 copy clears the window; SF-01 crack as a hairline split; SF-05 Core seams and key light; Cartographer creases, pleated tunic and outboard map; beam 18° → 42°; Cartographer silhouette job in CI |
| 2 | Run 11 | 0e3ebf6 → run 12 | SF-06 labels moved back on screen and a gate added for off-frame leaders; nameplate 4.2 × 1.55 with a fit gate; SF-07b keys flipped to the right side (K18 looks along +z) and the sheet enlarged so no edge shows |
| 3 | Runs 12, 13 | b2d7da7, 04b34ec | SF-07 nameplate email line was cut by the frame edge, so K17 looks lower; that brought the lantern into the bottom-left corner, so the Cartographer moved further left |
| 4 | Run 14 | 30d40e0 → run 16 | SF-07 beam aimed at y 3.6 instead of the window centre, so the pool takes in the nameplate as well as the window; lantern confirmed out of frame on desktop and phone |

Cartographer silhouette test (G2-6): 516 triangles and 20 hinges, inside the 10k / 30 limits; front, side, back and ¾ silhouettes read as a figure with a lantern and map (see the gallery's CARTOGRAPHER section).

Notes from the review that are not faults:
- SF-02: about 37% of the frame is near-black. By design: the veins are dark here.
- SF-07: about 29% near-black around the lit window. Reads as night; the CD may want more fill.
- SF-07 phone: the fascia sign is cut at its left and right ends by the frame sides (the phone frame is narrower than the 9.2-wide sign), and the upper third of the frame is plain wall. The window, card and nameplate are whole.
- SF-07: the nameplate gilt reads dim. Gold leaf is metallic, so it only flares at one viewing angle; the text is whole and legible.
- SF-05: the stamp "SPECIMEN No. 001 · VERIFIED" splits onto two lines on the crown.

## For the CD (G2 sign-off)

Decisions the build cannot make for itself. Everything else is in PROPOSED above.

1. **Camera moves:** SF-05, SF-06, SF-07 and SF-07b keys differ from the protocol (see PROPOSED). Each move is there to keep copy or the hero object in frame.
2. **M2 map tags conflict:** the frames use the G2-1 faults "No share preview / No business details"; the protocol's M2 text says "Missing meta description / Broken link". One has to win.
3. **Closing line:** "Found by INDEX. Built by DEVOS. Checked by AMOS. All of it on ATLAS." is approved G1 copy, but its rhythm resembles a banned triplet. Flagged only; not changed.
4. **Title separator:** the share card and printed result use a middot; the live site's title uses an em-dash. Copy rules ban em-dashes, so the frames show the middot (G2-9). Confirm.
5. **Cartographer:** pleated paper tunic and the map held open in the right hand. The protocol says the map unfurls along the right forearm. Choose one.
6. **Beam angle:** 42° read as the full cone (half-angle 21°).
7. **Nameplate 4.2 × 1.55** and **display window 6 × 5.2**.
8. **SF-07b:** keys, sheet 46 × 26, and the result above the tear rather than wrapped around it.
9. **Paper wall lip curl** 1.4 units into the world as the tear opens (new at G3, shown on the objects page).
10. **Real GPU check:** compare at least one frame on a real GPU, since the gallery is software-rendered.
11. **SF-07 nameplate brightness:** keep the metallic gilt (dim except at the glint angle) or give the lettering a little emissive so it reads at night.
12. **SF-07 phone:** the fascia is cut at both sides and the top third is plain wall. Accept, or tilt K17 phone up to trade wall for fascia.
13. **Tear shape (G3, PROPOSED):** a crack that runs first, then tears open into a jagged lens about 4.8 wide and 8.4 tall, replacing the radius-3 round hole of the first build.
14. **Seal budget:** 14,080 of 15k triangles (94%), little headroom if the 'soon' cracks (Phase 9.1) add geometry; they should stay in the shader.
15. **Dart map state (G3):** in its "map" state the dart is a flat triangle, not the five-panel map rectangle the Cartographer holds; `fold_dart` hides the swap mid-fold. Accept, or build the dart from the full map sheet (more hinges).
16. **Thin paper (G3, PROPOSED 0.45):** how much light comes through held paper from behind. Higher reads more translucent and glowier.

## Render check (latest full run)

Headless numeric check only; the visual review is above. All 24 deliverable PNGs rendered at full size by the Render frames workflow (GitHub Actions, SwiftShader software WebGL). Luminance is 0–255 sRGB from a 320 px downsample: mean / p5 / p50 / p95 / p99 / max. "Near-black" is the share of pixels ≤ 4. "Build / render ms" is software-GL time on the runner, not a performance figure. 0 console errors and 0 context losses on every render.

Budgets (§7.2): desktop ≤ 150 calls and ≤ 500k triangles; phone ≤ 80 calls and ≤ 150k triangles. "Calls" is scene calls / total calls including the post chain. Every frame is inside budget. Phone SF-07 high uses 78 of 80 total calls; 47 of those are the post chain, not the scene.

<!-- run-table -->
Run 37329543014.

| Frame | Tier · viewport | Size | Calls (scene / total) | Triangles | Luminance | Near-black | ≥ 250 | Build / render ms | Errors |
|---|---|---|---|---|---|---|---|---|---|
| SF-01 | high · desktop | 2560×1440 | 1 / 18 | 2 | 235 / 230 / 236 / 243 / 245 / 254 | 0.0% | 0.0% | 252 / 2689 | 0 |
| SF-01 | mid · desktop | 2560×1440 | 1 / 4 | 2 | 235 / 230 / 236 / 243 / 245 / 250 | 0.0% | 0.0% | 202 / 2466 | 0 |
| SF-02 | high · desktop | 2560×1440 | 15 / 18 | 38,106 | 28 / 0 / 24 / 87 / 98 / 193 | 38.9% | 0.0% | 444 / 3184 | 0 |
| SF-02 | mid · desktop | 2560×1440 | 15 / 18 | 38,106 | 28 / 0 / 24 / 87 / 98 / 193 | 38.9% | 0.0% | 387 / 2354 | 0 |
| SF-03 | high · desktop | 2560×1440 | 13 / 42 | 38,102 | 31 / 11 / 32 / 57 / 113 / 227 | 0.2% | 0.0% | 315 / 1634 | 0 |
| SF-03 | mid · desktop | 2560×1440 | 13 / 16 | 38,102 | 29 / 11 / 32 / 57 / 98 / 227 | 0.2% | 0.0% | 288 / 1520 | 0 |
| SF-03 | high · phone | 1170×2532 | 13 / 42 | 38,102 | 35 / 11 / 37 / 57 / 94 / 218 | 0.0% | 0.0% | 318 / 2590 | 0 |
| SF-03 | mid · phone | 1170×2532 | 13 / 16 | 38,102 | 34 / 11 / 37 / 57 / 76 / 205 | 0.0% | 0.0% | 316 / 2288 | 0 |
| SF-04 | high · desktop | 2560×1440 | 34 / 84 | 8,200 | 14 / 1 / 9 / 42 / 157 / 214 | 14.9% | 0.0% | 312 / 2747 | 0 |
| SF-04 | mid · desktop | 2560×1440 | 34 / 37 | 3,976 | 14 / 1 / 10 / 41 / 157 / 213 | 14.8% | 0.0% | 294 / 2365 | 0 |
| SF-05 | high · desktop | 2560×1440 | 57 / 130 | 36,018 | 57 / 0 / 70 / 97 / 159 / 229 | 13.0% | 0.0% | 382 / 4505 | 0 |
| SF-05 | mid · desktop | 2560×1440 | 57 / 60 | 31,794 | 62 / 1 / 80 / 96 / 155 / 229 | 8.8% | 0.0% | 302 / 3768 | 0 |
| SF-06 | high · desktop | 2560×1440 | 39 / 42 | 334,478 | 28 / 10 / 22 / 61 / 143 / 210 | 0.0% | 0.0% | 315 / 2682 | 0 |
| SF-06 | mid · desktop | 2560×1440 | 39 / 42 | 141,854 | 27 / 10 / 21 / 61 / 143 / 210 | 0.0% | 0.0% | 340 / 2621 | 0 |
| SF-07 | high · desktop | 2560×1440 | 32 / 80 | 7,712 | 27 / 1 / 6 / 172 / 201 / 237 | 25.2% | 0.0% | 338 / 2883 | 0 |
| SF-07 | mid · desktop | 2560×1440 | 32 / 35 | 3,488 | 27 / 1 / 6 / 172 / 201 / 237 | 25.1% | 0.0% | 335 / 2023 | 0 |
| SF-07 | high · phone | 1170×2532 | 32 / 80 | 7,712 | 53 / 1 / 10 / 197 / 201 / 240 | 19.9% | 0.0% | 340 / 2611 | 0 |
| SF-07 | mid · phone | 1170×2532 | 32 / 35 | 3,488 | 53 / 1 / 10 / 197 / 201 / 240 | 19.9% | 0.0% | 347 / 2476 | 0 |
| SF-07b | high · desktop | 2560×1440 | 1 / 4 | 2 | 210 / 204 / 210 / 230 / 240 / 252 | 0.0% | 0.0% | 203 / 470 | 0 |
| SF-07b | mid · desktop | 2560×1440 | 1 / 4 | 2 | 210 / 204 / 210 / 230 / 240 / 252 | 0.0% | 0.0% | 195 / 464 | 0 |
| SF-07b | high · phone | 1170×2532 | 1 / 4 | 2 | 209 / 198 / 209 / 237 / 244 / 253 | 0.0% | 0.0% | 205 / 495 | 0 |
| SF-07b | mid · phone | 1170×2532 | 1 / 4 | 2 | 209 / 198 / 209 / 237 / 244 / 253 | 0.0% | 0.0% | 195 / 462 | 0 |
| SF-08 | high · desktop | 2560×1440 | 11 / 14 | 33,540 | 226 / 136 / 235 / 243 / 245 / 251 | 0.0% | 0.0% | 280 / 959 | 0 |
| SF-08 | mid · desktop | 2560×1440 | 11 / 14 | 33,540 | 226 / 136 / 235 / 243 / 245 / 251 | 0.0% | 0.0% | 268 / 1234 | 0 |
<!-- /run-table -->

The earlier quarter-size check (`?check=1`, 2026-10-02) matches these numbers except where bloom is involved: bloom kernels are fixed in pixels, so at quarter size the glow spread about 4× wider.

**Changes made from the numbers (PROPOSED, part of the visual review):**
- SF-04 and SF-07 night fill raised (sky π·0.22 → π·0.85 / π·0.8, moon π·0.05 → π·0.2). Before this, 66% of SF-04 measured near-black, because Neutral tone mapping squares everything under about 0.08 linear.
- SF-03 vein spill fill (π·0.3). Mid tier had the stone at 4/255 without it.
- Bloom threshold 0 on SF-04 and SF-07. The bloom source is already lantern and gold-hot only, and a 0.5 / 0.55 cut left almost nothing.

## G3 hero objects

`objects.html` builds every §3.2 / §3.3 hero object with its production kit, counts it against its budget, and renders lit turnarounds (front, side, back, ¾) on a graphite studio set. The objects job in CI captures it into the gallery's OBJECTS section and fails on any over-budget row unless the row is marked CEILING with a written reason and fallback (§2.5 rule 5).

<!-- objects-table -->
Run 37329543014, objects gate: pass.

| Object | Measured | Budget | Draw calls | Result | Notes |
|---|---|---|---|---|---|
| Paper wall | 18,304 tris | ≤ 20,000 | 1 | PASS | one mesh for crack → hole: tear is shader displacement + alpha mask (uOpen) |
| Strata cliff + 12 specimens | 31,414 tris | ≤ 45,000 | 9 | PASS | cliff 24578 + specimens 6836 |
| Specimen No. 002 (graph) | 588 tris | ≤ 1,500 | 5 | PASS | ATLAS |
| Specimen No. 003 (symbol) | 36 tris | ≤ 1,500 | 4 | PASS | The AXIEL symbol |
| Specimen No. 004 (graph) | 772 tris | ≤ 1,500 | 5 | PASS | Autonomous Content Pipeline · ATL-26218 |
| Specimen No. 005 (graph) | 668 tris | ≤ 1,500 | 5 | PASS | SEO Agent · ATL-26220 |
| Specimen No. 006 (site) | 36 tris | ≤ 1,500 | 4 | PASS | axiel.co.za |
| Specimen No. 007 (graph) | 680 tris | ≤ 1,500 | 5 | PASS | Workflow Agent · ATL-26222 |
| Specimen No. 008 (graph) | 784 tris | ≤ 1,500 | 5 | PASS | AXIEL Marketplace Demo · ATL-26241 |
| Specimen No. 009 (graph) | 588 tris | ≤ 1,500 | 5 | PASS | Snipe Console · ATL-26244 |
| Specimen No. 010 (graph) | 680 tris | ≤ 1,500 | 5 | PASS | DevOS · ATL-26245-B |
| Specimen No. 011 (graph) | 576 tris | ≤ 1,500 | 5 | PASS | AXIEL Backend Template V2 |
| Specimen No. 012 (graph) | 760 tris | ≤ 1,500 | 5 | PASS | The Gallery Beneath |
| Specimen No. 013 (graph) | 668 tris | ≤ 1,500 | 5 | PASS | AXIEL Backend |
| City fill (High) | 206 instances | ≤ 400 | 3 | PASS | 2,472 tris as drawn; Mid tier 30 instances |
| Fault building · empty | 1,252 tris | ≤ 2,000 | 13 | PASS | largest: Buffer 806, Extrude 360, Buffer 36 |
| Fault building · repaired | 1,266 tris | ≤ 2,000 | 15 | PASS | largest: Buffer 770, Extrude 360, Buffer 48 |
| Living Core · asleep | 11,652 tris | ≤ 30,000 | 13 | PASS | includes the stone plinth (G2-7) |
| Living Core · awake | 11,652 tris | ≤ 30,000 | 13 | PASS | includes the stone plinth (G2-7) |
| Wax seal | 14,080 tris | ≤ 15,000 | 1 | PASS | generated from the official symbol raster (G2-3) |
| Cartographer | 520 tris | ≤ 10,000 | 29 | PASS | 27 hinges; turnaround + animations on cartographer.html |
| Paper dart | 4 tris | ≤ 600 | 4 | PASS | 4 hinges; map → dart → gold on one mesh set |
<!-- /objects-table -->

**Paper wall kit** (`js/kit/paperwall.js`, new): the 120 × 320 wall as one polar mesh, dense at the lip, about 18.3k triangles. The tear opens in the shader (displacement plus an alpha mask on `uOpen` 0 to 1), so one mesh serves SF-01 (closed crack), the fall and SF-07b (open, from behind). PROPOSED: up to `uOpen` 0.3 a single jagged crack runs about 8.4 tall; from there it tears open along that line into a lens about 4.8 wide, each side jagged on its own, with a paler torn-fibre rim, and the lip curls 1.4 units into the world.

**G3 self-review:**

| Pass | Reviewed | Fixed in | Main fixes |
|---|---|---|---|
| 1 | Run 16 | 2c10410, a2cd27b → run 19 | The tear was a round blob with no crack stage: rebuilt as a crack that runs, then tears open. Seen whole, the cliff's veins aliased into a gold maze: veins now dim with pixel coverage and only five of twelve beds carry them (the carved-line beds and one deep bed). The seal had no back: flat back added (+160 tris). Fault building note names parts by geometry |
| 2 | Runs 19, 21 | 16c9919, 98c75ba → run 21; b93bcad → run 22 | The open tear's edge read as a regular sawtooth: the fibre jag no longer scales with the opening. Merged the animations and dart. Held paper went black when lit from behind (the map panels in raise_lantern from t 0.6, the dart mid-fold): paper now takes an opt-in thin-sheet term (`thin` 0.45, PROPOSED) on the map and dart only, so the frames are unchanged |

Not faults: the strata cliff is a thin slab seen side-on, fine for the face-on cameras it serves; the city fill is small in its aerial tile because the tile includes the whole ground plane.

**Cartographer animations and paper dart** (merged from the `g3-carto` side branch): `cartographer.html` now shows the eight animations (idle, walk, raise_lantern, unfurl_map, fold_dart, throw_dart, nod, walk_away) as hinge keyframes eased with the §5.1 curves, as strips and in a live player, plus K7 / K8 silhouette strips and the dart in its three states. CI fails the Cartographer job on fewer than 8 animations or a dart over 600 triangles.
- `js/kit/dart.js`: the map folds into the dart on 4 panels and 4 hinges; states map, dart and gold. PROPOSED: keel 80°, wings 5° dihedral; gold glows at 0.35 so it reads hot without bloom.
- `js/kit/ease.js`: the §5.1 easing constants (EASE_CAMERA, EASE_ARRIVE, EASE_DEPART, EASE_LINEAR, EASE_STAMP). PROPOSED home until they move into `core.js`.
- The rig gains shoulder yaw hinges and carries the dart in the right hand; the default pose used by SF-04 and SF-07 is unchanged.

**The twelve specimens (PROPOSED, `js/kit/specimens.js`).** AXIEL's own work only (G2-2), oldest at the bedrock. Ten are systems shown as their real runtime flow in brass: every node is a stage in that system's code, every tube a hand-off. Order follows the earliest evidence on disk (first commit, or file dates where a repo has no history). The cliff shows only the brass and "SPECIMEN No. 0xx".

| No. | Specimen | Code | Earliest | Form | Flow (from the code) |
|---|---|---|---|---|---|
| 002 | ATLAS | none in catalog | 2026-07-17 | graph | Team → Audit → Strategy → Design → Review → Compile; Review loops back to Design or Strategy |
| 003 | The AXIEL symbol | | UNKNOWN | symbol | the approved raster, gold on lacquer |
| 004 | Autonomous Content Pipeline | ATL-26218 | 2026-08-06 | graph | Focus → Capture → Review → Split → Encode → Caption → Post → Feedback → Review |
| 005 | SEO Agent | ATL-26220 | 2026-08-07 | graph | IMAP → Screenshot → Analyse → Operator email → Approval → Fix or Rejected |
| 006 | axiel.co.za | | 2026-08-15 | site | nav, hero, the six /systems pages |
| 007 | Workflow Agent | ATL-26222 | 2026-08-18 | graph | Capture → Classify → Tasks, Ideas, Blockers, Rules, Triangulation |
| 008 | AXIEL Marketplace Demo | ATL-26241 | 2026-08-29 | graph | Store switcher → three stores (one age-gated) → Catalogue → Bag → Checkout |
| 009 | Snipe Console | ATL-26244 | 2026-09-01 | graph | Config → Poll → Hash diff → Classify → Report; no change backs off and polls again |
| 010 | DevOS | ATL-26245-B | 2026-09-02 | graph | Preflight → Specialist wave → Collaboration → Synthesis → Build + QA → Release check → Learnings → Preflight |
| 011 | AXIEL Backend Template V2 | none in catalog | 2026-09-14 | graph | Service → Specialist → Time → Details → Deposit → Booked |
| 012 | The Gallery Beneath | | 2026-10-02 | graph | Surface → Fall → ATLAS → INDEX → DEVOS → AMOS → Proof → Seal (this page) |
| 013 | AXIEL Backend | none in catalog | 2026-10-03 | graph | Worker → Resolve site → Session → Book page → Availability → Create booking → Audit |

Left out: ATL-005 Intake Response Agent (the only matching code was built for a client, G2-2). Flagged: 004 is matched to its code by the catalog description, and 003's date is UNKNOWN, so its place is PROPOSED. No catalog code is invented.

**G3 blockers that need a person:**
- **The twelve specimens:** PROPOSED below; the CD confirms the list.
- **Core and seal:** CD approval of the Living Core (G2-7) and the wax seal relief (G2-3) as modelled.
- **Cartographer map:** the forearm-versus-hand choice above (CD item 5) decides the rig the animations are built on.

## G4 camera path and animatic

`animatic.html` flies the §4.3 keys (with the G2 amendments) through a grey-box city built from the same kits as the frames: city plots and the fault building, the strata cliff, the paper wall tear, the Living Core and the Cartographer on its walk. The animatic job in CI records a storyboard (one thumbnail per key), 1920×1080 MP4s for desktop (40 s) and phone (30 s), the plot map and `docs/clearance.md`, and fails on any clearance or legibility miss.

**Checklist (protocol G4):**

| Item | Status |
|---|---|
| City plot map approved | Drawn (`docs/city-plot-map.md`, gallery). Needs CD approval |
| Storyboard approved | One thumbnail per key in the gallery. Needs CD approval |
| Grey-box animatic approved, desktop and phone | Both MP4s in the gallery. Needs CD approval |
| Clearance passes (`docs/clearance.md`) | **PASS** on both viewports, run 24 |
| Legibility at K4a to K4c, K17, K18, K16 | **PASS** on both viewports, run 24 (K16 drop labels are triggered on freeze, built and checked at G6) |
| No motion sickness, 3-person test | Needs three people. The pacing flags below are the segments to watch |
| Keyframe table final | Needs CD lock. The keys changed at G4 are listed below |
| Generic audit | Needs a person |

**Run 24 numbers (commit 95ac21e).** Closest approach per obstacle, corridor radius 1.5 from K5 to K19:

| Obstacle | Desktop | Phone |
|---|---|---|
| Cliff | 1.70 | 1.86 |
| Paper wall | 1.21 | 0.82 |
| Building | 2.06 | 2.13 |
| Living Core | 5.60 | 5.55 |
| Cartographer | 1.65 | 1.65 |
| Ground | 1.50 | 1.50 |

No intersections, no corridor violations. The camera passes through the open tear with 2.27 / 1.81 units to the torn edge on desktop and 2.27 / 2.20 on phone. The paper wall at 0.82 on phone is outside the corridor (the corridor starts at K5).

Legibility at the key, cap height in px (minimum 18 desktop, 14 phone):

| Text | Key | Desktop | Phone |
|---|---|---|---|
| Carved line 1 | K4a | 37.5 | 24.4 |
| Carved line 2 | K4 | 37.5 | 24.6 |
| Carved line 3 | K4c | 44.4 | 29.1 |
| Share card | K17 | 18.3 | 14.2 |
| Nameplate | K17 | 20.0 | 15.9 |
| Result title | K18 | 22.1 | 17.0 |
| Result description | K18 | 18.6 | 14.3 |

**G4 self-review:**

| Pass | Reviewed | Fixed in | Main fixes |
|---|---|---|---|
| 1 | Run 23 (d8a6e2a) | 95ac21e → run 24 | Clearance: K10 climbs over the fault roof (the protocol key cut the fault building), K17b pulled back onto the street, K18b raised 0.5 so the descent clears the cliff lip. Legibility: K17 desktop 0.4 closer, K17 phone look 0.3 right, K18 closer, K4a phone 0.05 back. The spline overshot at cusp keys and the K9 hold (K3b nod 530 °/s): those keys are doubled so the curve stops (now 51 °/s). The result title wrap now keeps "Beyond Immediate Reality" whole on one line. Animatic recorded at 1080p |
| 2 | Run 24 (95ac21e) | none needed | All 15 jobs green, every check passes. Visual review of the storyboard, both MP4s and SF-07 / SF-07b found the two CD items below |

Changed keys (PROPOSED, need the CD lock): K4a, K10, K17, K17b, K18, K18b, and the G2 look shifts carried over.

**For the CD (G4):**
1. The result title wraps as "AXIEL ·" over "Beyond Immediate Reality" at K18. The line is whole, as required, but "AXIEL ·" sits on its own. Options: drop the separator on wrap, or set the title smaller so it fits on one line.
2. Phone SF-07: the fascia crops "AXIEL" to "XIEL" at the left edge, a side effect of the G4 look shift of 0.3. PROPOSED fix: shift the phone K17 look back by 0.3 and recheck the nameplate legibility.
3. Pacing (linear camera, §5.1 default): the fastest move is K3 to K3b at the end of the fall (55 u/s desktop, 73 phone), the fastest turn is K13 to K14 (162 / 217 °/s), and the closing turns K19 to K20 are also flagged. The speed changes sharply at several keys (up to ×4.6). These are the segments to watch in the motion test; G5 offers a speed-continuous camera timing as a PROPOSED alternative.

**G4 blockers that need a person:** plot map, storyboard and animatic approval; the 3-person motion test; the key lock; the generic audit.

## G5 motion lock

`js/timeline.js` holds the §5.1 easing constants, the §5.3 timing table (every row with its p window, type, ease and source), the §5.4 transition carriers, the copy and the checks. The animatic job plays the timeline over the grey box, writes `timing.md` and fails on any timing check or reverse-scroll miss. The animatic page shows the beats and copy in the HUD.

**Checklist (protocol G5):**

| Item | Status |
|---|---|
| Easing library implemented as constants | **Done.** `EASE.CAMERA / ARRIVE / DEPART / LINEAR / STAMP` in `js/timeline.js`; the check confirms all 18 eased rows use one of them |
| Timing table approved against the animatic | Table and four animatics (desk and phone, linear and smooth camera) in the gallery. Needs CD approval |
| Timing beats for the four system lines | **Set.** ATLAS is the three carved lines at 0.15 / 0.17 / 0.19; INDEX 0.25 to 0.40, DEVOS 0.47 to 0.58, AMOS 0.66 to 0.80, in loop order and never overlapping (windows PROPOSED) |
| Hero line fade-out window (before 0.07) | **Set.** 0.060 to 0.068, so SF-01 still shows the whole line at K1 and it is gone before the tear at 0.07 (PROPOSED) |
| Every transition has a physical carrier | **PASS.** All seven, see below |
| Full reverse scroll tested | **PASS.** Every camera mode on both viewports, scrubbed forward then back frame by frame: the state at each p is identical (4,802 frames desk, 3,602 phone, worst difference 0) |
| Generic audit | Needs a person |

**Run 25 (all 15 jobs green).** All 18 timing checks pass, the copy is fully in before it is due out on both viewports at a steady 30 vh/s scroll, and the result title and description at K18 are intact on both viewports.

The seven carriers (§5.4):

| Transition | Carrier beat | p | What carries it |
|---|---|---|---|
| Surface → Fall | tear | 0.07 | The paper tears |
| Fall → ATLAS | veins | 0.13 | Veins ignite in the stone |
| ATLAS → INDEX | courses | 0.22 | City courses stack up from the plateau |
| INDEX → DEVOS | dart | 0.42 | The paper dart wakes the Core |
| DEVOS → AMOS | glide | 0.60 | The finished fix seats into the building; rain begins |
| AMOS → Proof | rain_stop | 0.80 | Rain stops; the repaired window lights |
| Proof → Seal | turn | 0.90 | The turn back to the paper wall, the result read, then the return flight through the tear, which heals |

Camera timing modes (the keys and path are the same in every mode; only how p maps onto the path changes):

| Mode | Viewport | Peak u/s | Peak turn °/s | Speed jumps > 1.5× | Dead stops | Keys at their p | Reverse scroll |
|---|---|---|---|---|---|---|---|
| linear (§5.1 default) | desk | 55 | 162 | 13 | 2 | yes | PASS |
| linear | phone | 73 | 217 | 13 | 2 | yes | PASS |
| smooth (PROPOSED) | desk | 69 | 177 | 0 | 0 | yes | PASS |
| smooth | phone | 93 | 236 | 0 | 0 | yes | PASS |
| shots (PROPOSED) | desk | 157 | 327 | 2 | 0 | NO | PASS |
| shots | phone | 210 | 436 | 2 | 0 | NO | PASS |

"shots" eases each run of keys between two holds with EASE_CAMERA. It moves keys off their p, so SF frames would no longer land on their scroll position. The build does not recommend it and keeps it only for comparison.

Changed at G5 (PROPOSED): new hold key **K9h** at 0.42 (the camera holds on the fold from K9 at 0.40 through the throw at 0.42); the system line, hero fade-out and closing fade-out windows; the carved line ease; the rain row uses EASE_LINEAR (§5.1 names it for rain).

**G5 self-review:**

| Pass | Reviewed | Fixed in | Main fixes |
|---|---|---|---|
| 1 | Runs 24 to 25 | run 25 | K9h hold added so the camera does not drag toward the ground during the fold; clearance regenerated (look-at gap now 2.98 desk, 3.61 phone, was 2.28) |
| 2 | Run 25 boards and MP4s | none needed | Every check green. Visual review of the 58 boards and four MP4s found the CD items below |

**For the CD (G5):**
1. **Crack ease.** §5.3 gives the crack EASE_DEPART over 0.05 to 0.07. At K1 (0.06) that leaves the crack about 3% grown (EASE_DEPART at 0.5 of the window) where SF-01 draws a long hairline. Options: keep the §5.3 curve and accept a short crack in SF-01's moment, or open it faster (EASE_ARRIVE gives 97% at K1, a linear ramp 50%).
2. **Camera timing: linear or smooth.** Linear is the §5.1 default and lands every key at its p, but the speed jumps up to ×4 at 13 keys and stops dead twice. Smooth (PROPOSED) removes every jump and dead stop and still lands every key at its p, at the cost of a higher peak (69 vs 55 u/s desk, 93 vs 73 phone). Compare `animatic-desk.mp4` with `animatic-desk-smooth.mp4` in the gallery. The 3-person motion test should run on the one you pick.
3. **The K9h hold.** The camera holds 0.02 of the scroll on the fold. In the grey box the Cartographer block stands 1.65 units from the lens and fills the middle third of the frame (board K9h); the real Cartographer is a thin silhouette, so it will read lighter, but the framing is worth a look.

**G5 blockers that need a person:** timing table approval against the animatic, the camera mode choice, the crack ease, the generic audit.

## G6 technical prototype (AMOS)

`site/` is the production stack (§6.1): Next.js 16 App Router as a static export, React Three Fiber, Lenis smoothing into GSAP ScrollTrigger, one zustand store holding p. It builds the AMOS scene first, as §6 asks, from the same world kits as the frames (`js/` is synced in at build time, never forked). The `proto` CI job builds the export, serves it under the Pages path and runs `tools/proto.mjs`; deploy publishes it at **https://notsofatfredd.github.io/axiel-style-frames/proto/** (noindex, review only).

**Plan critique (written before the build, kept here so the review can check it was followed):**
- *Riskiest part:* the rain. 8,000 GPU drops reading an integrity mask, beading on working elements and soaking into the fault, under a planar reflection. Built as one instanced draw with all motion in the vertex shader as a pure function of time and p, so it scrubs backwards exactly and freezes by stopping one uniform.
- *The cloud cannot measure fps.* The runners render on SwiftShader (CPU). CI proves behaviour (mount, freeze, labels, reverse scroll, no errors); the §6 fps targets need a real laptop and phone. A scripted `?bench=1` run makes that a two-minute human job with a pass rule.
- *One camera, no scene owns it:* the camera is placed on the G5 path at the global p every frame (`js/camera.js` + `js/timeline.js` CAMERA_MODES), so the K14 → K16 arc is the signed path, not a copy.
- *DOM for type:* copy, counter and freeze labels are DOM over the canvas (crisp at any DPR, readable by assistive tech); the canvas never draws UI text.
- *What could fail the gate:* fps on a mid phone with the planar reflection. Mid drops the mirror and runs 2,000 drops (§10.1); the pre-baked fallback is held in reserve and logged in `docs/ceilings.md` if needed.

**Checklist (protocol G6):**

| Item | Status |
|---|---|
| Stack per §6.1 | **Built.** Next.js static export, R3F, drei, Lenis, GSAP ScrollTrigger, zustand, three 0.169 |
| AMOS first: planar reflection through the water film | **Built.** High: half-resolution mirror under a noisy-edged film with meniscus rim and Schlick fresnel; Mid: environment tint (§10.1) |
| GPU rain reading the integrity mask | **Built.** 8,000 drops High, 2,000 Mid, one instanced draw; beads and rolls on working elements, soaks and stains red on the fault, registered per element as the beads row scrubs |
| K14 → K16 arc | **Built.** The G5 camera path at the global p |
| Freeze on idle (400 ms) with labels | **Built.** The five D4 readings typed onto the nearest falling drops, leaders and dots as SF-06; scrolling releases them |
| Reverse scroll | Checked in CI (rain, registration and film identical down and up) |
| fps: 60 desktop, 45 mobile | **Needs a device.** Run `?bench=1` on a laptop and a phone; SwiftShader figures in the gallery are a reference only |
| Hosting decision | **Needs a person.** The Pages `/proto/` link is review only |
| Generic audit | Needs a person |

CI results, screenshots and the SwiftShader reference numbers are in the [gallery G6 section](https://notsofatfredd.github.io/axiel-style-frames/gallery/#proto). Decisions the build made are in [`docs/proposals.md`](docs/proposals.md) (P6-1 to P6-13); known limits in [`docs/ceilings.md`](docs/ceilings.md).

<!-- g6-review -->
**G6 self-review:**

| Pass | Reviewed | Fixed in | Main fixes |
|---|---|---|---|
| 1 | First proto runs | `acc9a37`, `bf7360c` | The freeze, release and un-type checks timed in milliseconds and failed on SwiftShader's 0.5 to 2 s frames; they now count frames and read the freeze decision log, so they test behaviour, not the runner's speed |
| 2 | Run 37329543014 (all 25 checks pass on both viewports) | run RUNX | On the phone the five labels sat on separate drops but their text stacked in two pairs (A11Y 98 over LCP 1.2s, NAV PASS over CLS 0.02). A drop is now only taken if its label box clears the others, and CI checks the boxes do not overlap. The desktop GPU name was read before the canvas existed; the check now waits for it. The build time is reported per viewport (the 375 s on the phone was time since the script started, not a slow build) |

Reference only, SwiftShader on a CPU runner: 0.9 fps desktop High (8,000 drops, 60 calls, 443k triangles), 2.7 fps phone Mid (2,000 drops, 39 calls, 73k triangles). The call and triangle counts are what carry over to a real GPU; both sit well inside §10.1.
<!-- /g6-review -->

**For the CD (G6):**
1. **Rain direction (P6-1).** §3.2 slants the rain toward the +z façades (away from the camera); SF-06 leans it toward the camera. The prototype follows §3.2. Pick one and the other is updated.
2. **Freeze feel.** Scroll to the rain, stop, and watch the labels type onto the drops. Is 400 ms idle right, and does the un-type at 15 ms per char (P6-4) feel like a release?
3. **Grain as a DOM layer (P6-2)** instead of a post pass.

**G6 blockers that need a person:** device fps (laptop and phone, `?bench=1`, Copy the result into an issue or message), freeze feel, the hosting decision, the generic audit.

## G7 assets

The `assets` CI job turns the signed kits into the §7.1 assets. `assets.html?mode=export` builds each static prop from its kit and exports a raw GLB, with the shader recipe in `extras.axiel` and the uniform textures beside it. `tools/bake.py` bakes ambient occlusion onto the city ground and the strata cliff in Blender 4.2 (headless, Cycles CPU). `tools/pack.mjs` runs gltf-transform (Draco, then KTX2: ETC1S for colour, UASTC for normals, occlusion and roughness), the Khronos glTF validator and the KTX2 sidecars. Finally `assets.html?mode=verify` loads every packed GLB back, renders it beside its kit and checks the budgets. Deploy publishes the packed files at `/glb/`; the live check is https://notsofatfredd.github.io/axiel-style-frames/assets.html?mode=verify (heavy).

**Plan critique (written before the build, kept here so the review can check it was followed):**
- *Riskiest part:* the kit materials. The detail (world-space grain, carving, façade windows, wax relief) is shader code that glTF cannot hold. A plain GLB export would lose the look the CD signed. So the recipe rides in `extras.axiel` and the site rebuilds the material from the same kit code (P7-2). A GLB that renders differently from its kit fails the match gate (P7-5).
- *"Bake lighting" would fight the scenes:* the city is relit for dusk, rain and the lit windows, the strata for the seam. Only the occlusion is truly static, so only the occlusion is baked (P7-1).
- *Blender in CI:* no hand modelling, no .blend files; Blender runs once per build on the exported geometry and its output is checked (mean in range, size, UV channel). If the bake ever fails, the scenes still render without it.
- *The budgets count what a visitor downloads:* the decoders (Draco, Basis) are inside the 12 MB and 6 MB, and desktop and mobile are measured as separate sets (P7-6).
- *What could fail the gate:* Draco quantisation moving the carving or the window grid by a pixel, or ETC1S colour banding on the wax. The match is checked in three views per asset (two aerial views for the city), AO off, so the bake cannot hide a mismatch.

**Checklist (protocol G7):**

| Item | Status |
|---|---|
| All assets exported, compressed, named | **Built.** Nine GLBs named `scene_object_variant_v1` (P7-3), Draco + KTX2, validator clean; table in the gallery |
| Turntables / code previews match style frames | **Built.** Kit, GLB and difference image per view, in the gallery; code-native objects keep their G3 previews |
| Budgets met | **Checked in CI.** 3D download per set against 12 MB / 6 MB with decoders; texture memory estimated against 256 MB / 96 MB (P7-7); calls and triangles per asset |
| Generic audit | Needs a person |

<!-- g7-review -->
**G7 self-review:**

| Pass | Reviewed | Fixed in | Main fixes |
|---|---|---|---|
| 1 | First asset runs | `2e352c8` | pack did not create its output folder; CLI failures now print their output |
| 2 | Run 37329543014 (nine GLBs pass, worst match 0.09% mean / 0.47% moved) | run RUNX | The worst match, the repaired fault building, had all of its difference in the printed text of the share card: ETC1S blocks softened the glyphs a reader is meant to read in SF-07. The card's colour texture is now packed UASTC (textures named `text_*`); everything else stays ETC1S. The nameplate lettering was already a UASTC sidecar |

Budgets with room: 3.8 MB of 12 MB desktop and 6 MB mobile, texture memory 28 MB of 256 MB / 96 MB. The AO pair reads as intended: contact darkening at the building feet and in the lanes, nothing on open ground.
<!-- /g7-review -->

**For the CD (G7):**
1. **Code, not Blender (P7-8).** The props are the signed kits exported, so there is nothing hand-modelled to approve separately. Confirm that is acceptable against §7.1 step 1.
2. **AO only (P7-1)** instead of a full light bake. Compare the AO on/off pair in the gallery.
3. **The strata cliff as a GLB (P7-4)**, so its lightmap has a surface to land on.
4. **The twelve specimens** (PROPOSED at G3) ship as `strata_specimens_v1`.

**G7 blockers that need a person:** the generic audit, the four calls above.

## G8 integration

G8 joins every scene into the one scroll on the G6 stack: Surface, Fall, INDEX, DEVOS, AMOS, Proof, Return, Close. The proto page grows from AMOS only to the whole site; the same `proto` CI job checks it scene by scene.

**Plan critique (written before the build, kept here so the review can check it was followed):**
- *Riskiest part:* the seams between scenes. Each frame was lit and graded on its own. Mounting and unmounting scenes on scroll would stall on shader compiles exactly where the camera is moving fastest (the fall, the glide, the return through the tear). So the build is one scene with three worlds that are built once after Surface and never disposed: the wall (Surface, Return, Close), the chasm (Fall, the climb), the city (INDEX, DEVOS, AMOS, Proof). Every program is precompiled before it is needed (PROPOSED, P8-1).
- *One look at a time:* a table of owners says which world sets the lights, fog and clear colour at each p, and the looks from the frames crossfade over the scene boundaries instead of cutting. Fog is always exponential so a change of density never recompiles a material (P8-2).
- *The post chain the frames use:* selective bloom on High only, with each scene's bloom settings from its frame; tone mapping on the output pass only, so a flat paper scene and a lit night scene share one material set (P8-3).
- *Reverse scroll:* every motion stays a pure function of p (the G5 rule), so the existing down-and-up comparison is extended to the whole scroll.
- *What could fail the gate:* memory and first-load time with three worlds resident, and the tear: the camera passes through the wall twice. The G7 budgets and the K19 clearance (1.59 desk, 1.98 phone) are re-checked against the integrated scene.

## Files

```
index.html              harness page (tokens, tabs, notes panel)
cartographer.html       G2-6 Cartographer silhouette test
objects.html            G3 hero objects: budgets and turnarounds
animatic.html           G4 / G5 grey-box animatic: scrubber, HUD, copy, plot map, clearance and timing tables
js/camera.js            §4.3 camera keys (with G2 amendments), splines, roll, scenes
js/timeline.js          G5 §5.3 timing table, carriers, copy, timing checks, reverse-scroll test
js/kit/greybox.js       G4 obstacles, clearance / legibility / pacing checks
js/app.js               renderer, post chain, tiers, viewports, stats, export
js/core.js              palette, shared materials and shaders, camera, copy helpers
js/paper.js             paper sheet shader (Surface, Proof back face, Seal)
js/kit/paperwall.js     the paper wall and its tear (shader-driven opening)
js/kit/dart.js          the paper dart: map → dart → gold
js/kit/ease.js          §5.1 easing constants
js/kit/strata.js        chasm cliff, veins, carved lines, specimen niches
js/kit/city.js          city blocks, façades, fault building, share card, stain
js/kit/cartographer.js  the Cartographer rig and lantern
js/kit/livingcore.js    the Living Core and fix kit
js/kit/seal.js          wax seal, specimen tag, string
js/frames/sf0*.js       one module per frame: build(), overlay(), notes
js/frames/util.js       rig bake, leader labels
kit-check.html          world-kit smoke test
tools/render.mjs        full-size render + render log + frame gates
tools/carto.mjs         captures the Cartographer page, silhouette gate
tools/objects.mjs       captures the objects page, budget gate
tools/animatic.mjs      records the animatic: storyboard, MP4s, plot map, clearance.md, timing.md
docs/clearance.md       G4 clearance report from the last animatic run
tools/proto.mjs         G6 prototype checks in headless Chromium: mount, freeze, labels, reverse scroll, screenshots
docs/proposals.md       PROPOSED decisions (G6: P6-1 to P6-13, G7: P7-1 to P7-8)
docs/ceilings.md        known limits, logged as the protocol asks
assets.html             G7 export (?mode=export) and match / budget check (?mode=verify)
js/kit/glb.js           G7 GLB export and load: kit recipe in extras.axiel, KTX2 sidecars
tools/assets.mjs        drives assets.html: writes the raw GLBs, saves the check images, assets.json and assets.md
tools/bake.py           Blender AO bake onto TEXCOORD_1 (headless)
tools/pack.mjs          gltf-transform Draco + KTX2, glTF validator, sidecars, download sets
tools/gallery.py        merges frames, Cartographer, objects, animatic, prototype and asset checks into the Pages gallery
.github/workflows/render.yml  the render, carto, objects, animatic, proto, assets, collect and deploy jobs
site/                   G6 Next.js app (static export): app/, components/ (camera, scenes, overlay), lib/, shaders/
assets/                 approved raster lockup and symbol
```
