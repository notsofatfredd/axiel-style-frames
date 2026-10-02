# AXIEL · Gate G2 style frames

Code-rendered style frames SF-01 to SF-08 (plus SF-07b) for the axiel.co.za homepage, "The Gallery Beneath". This README is the **frame render log** for the G2 checklist (protocol v1.3, §2.5).

GPT image generation was unavailable on 2026-10-02 ("gpt unavailable", then "use the best"), so every frame is rendered in three.js from the protocol's own camera keys (§4.3), light and material (§2.3) and palette tokens (§2.1). Nothing is colour-corrected afterwards.

## Run

```
cd axiel-style-frames
python -m http.server 5181
```

Open http://127.0.0.1:5181/ (or the GitHub Pages link). A page needs WebGL2 and an internet connection, because three.js 0.169 and the fonts load from jsdelivr and Google Fonts.

| Key | Action |
|---|---|
| ← → | Previous / next frame |
| C | Toggle the on-screen copy |
| E | Export the current frame as PNG |
| Export all | Downloads every frame |

Link straight to a frame with `#sf-01` … `#sf-08`, or `#sf-07b`.

## Render settings (all frames)

- **Output:** 2560×1440, pixel ratio 1. The preview is the same pixels, scaled down.
- **Pipeline:** HalfFloat MSAA (4×) target → scene pass (with a planar mirror for AMOS) → UnrealBloom → OutputPass (sRGB).
- **Tone mapping:**
  - Paper frames (SF-01, SF-08): none, no bloom.
  - Every other frame: Neutral.
- **Copy:** drawn as text on an overlay canvas from the G1-approved copy. In production it is DOM text (§10.2).
  - Fonts: Montserrat 300–600 and JetBrains Mono 400/500.
- **Export names:** `AXIEL_<id>_<scene>_<date>.png`.

## Logo source

SF-01 uses `assets/axiel-lockup-ink.png` (491×404 RGBA), cut from the approved raster `~/axiel/brand/references/axiel-logo-reference-01.jpeg`. The wordmark is never retyped, rebuilt in CSS or vectorised. The SVG was checked and is not 1:1 with the raster, so it is not used. A higher-resolution master is needed for production.

## Frame log

| Frame | Scene | Hero moment (§2.4) | Key · p | Camera (position → look · FOV) | Tokens |
|---|---|---|---|---|---|
| SF-01 | Surface | Hero copy, crack beginning | K1 · 0.06 | (0, 0, 6) → (0, 0, 0) · 40 | paper, bone, stone, ink, hot |
| SF-02 | Fall | Mid-fall, particles streaking past | K3 · 0.12 | (0, −40, −4) → (0, −80, −6) · 74 · roll +8° | ink, gold, hot |
| SF-03 | ATLAS | Grid to the horizon, low angle | K5 · 0.21 | (0, 0.6, 5) → (0, 0.5, −60) · 74 | ink, gold, hot, bone |
| SF-04 | INDEX | Lantern lighting a row of buildings, one flickering | K8 · 0.36–0.39 | (−3, 2, −18) → (6, 4, −30) · 54 | night, ink, stone, lantern, hot, bone, gold, red |
| SF-05 | DEVOS | Scaffold half-built, a stamp locking in | K12 · 0.54 | (10, 16, −96) → (10, 12, −80) · 54 | ink, gold, hot, bone, lantern, night, stone |
| SF-06 | AMOS | Overhead mirror, frozen rain, readouts in ripples | K16 · 0.79 | (4, 18, −32) → (4, 0, −32.01) · 40 | ink, rain, stone, bone, lantern, gold, hot, pass |
| SF-07 | Loop | Aerial, light circuit forming the AXIEL triangle | K17 · 0.85–0.90 | (0, 80, 20) → (0, 0, −40) · 74 | ink, night, stone, gold, hot, lantern, rain, bone |
| SF-07b | Loop (alt) | Triangle complete from above (OG image candidate, §11.2) | K18 · 0.90 | (0, 160, 0) → (0, 0, −0.01) · 74 | same as SF-07 |
| SF-08 | Seal | Wax seal "INTAKE CLOSED" + waitlist | K20 · 0.97–1.00 | (0, 0, 10) → (0, 0, 0) · 40 | paper, bone, stone, ink, graphite, red |

Every frame's notes panel lists its full light and material description, PROPOSED items and UNKNOWN items.

## PROPOSED (needs Creative Director OK at G2)

**SF-01 Surface**
- The lockup is printed in `--ink` and embossed from the raster. Its size and position are proposed.
- Light leaks through the crack in `--atlas-gold-hot`.
- The hero line is 56px at 1440p (Montserrat 300, +0.08em), centred under the lockup. It moves only as one unit (G1-P1).

**SF-02 Fall**
- The particles lean into a loose golden-angle spiral.
- A faint ATLAS grid shows far below.
- Roll is +8° (the protocol allows ±8°).

**SF-03 ATLAS**
- Grid pitch: 1-unit minor lines, 5-unit major lines, nodes at the major crossings.
- Light pulses travel along the lines, and gold motes hang over the grid.
- The copy block sits bottom-left.

**SF-04 INDEX**
- Windows warm up as the beam passes.
- The fault building at (4, −32) flickers `--bone` and stands in a 2.6-unit plaza (shared with AMOS).
- Fault tags are JetBrains Mono in `--signal-red`. Their timing is open (G5).

**SF-05 DEVOS**
- 24 pieces: 8 posts + 12 beams + 4 braces. Shown as 13 gold, 1 stamping, 6 glass, 4 arriving.
- The stamp is frozen at a 1.035 overshoot.
- Specialist units (D3): Copy = plane, Design = prism, Code = cube lattice. They carry no labels.
- A blueprint lies under the scaffold, and the INDEX thread arrives from below.
- The brushed finish comes at G7.

**SF-06 AMOS**
- Readouts sit beside their ripples (`--signal-pass`, the last one still typing).
- A gold roof edge marks the repaired building.
- Rain is frozen mid-fall.

**SF-07 Loop**
- Triangle layout: upright, circumradius 36, centred on (0, −40). INDEX is bottom-left, DEVOS the apex and AMOS bottom-right. The protocol positions are nearly collinear, so this is **locked at G4**.
- The circuit is lifted to y = 32.
- The ATLAS credit is bottom-right as a gold underlined link (D5 / G1-P2).

**SF-08 Seal**
- The seal reads "INTAKE" / "CLOSED" in Montserrat 600 with a ring border.
- The waitlist is a single editorial row (§9.3 fields).
- The copy line is centred between the seal and the form.

## UNKNOWN / open

- **SF-01:** a higher-resolution lockup master is needed for production.
- **SF-06:** the readout values are the D4 placeholders until the real AMOS run (G1-P5).
- **SF-08:** the submit button label is not in the approved copy, so an arrow glyph stands in. It needs a label at G9, or the arrow stays.

## Render check (2026-10-02)

These are pixel stats on a 256×144 downsample of the WebGL canvas (mean luminance and % near-black). They show every frame renders. They are not a visual review.

| Frame | Mean | Black | Notes |
|---|---|---|---|
| SF-01 | 235.7 | 0% | |
| SF-02 | 88.9 | 0% | |
| SF-03 | 21.8 | 42% | The black is ink sky. |
| SF-04 | 116.7 | 1.2% | |
| SF-05 | 17.7 | 39% | The black is ink sky. |
| SF-06 | 47.9 | 0% | |
| SF-07 | 35.1 | 23% | |
| SF-07b | 16.3 | 56% | The black is ink ground between blocks. |
| SF-08 | 229.0 | 0% | |

Console: 0 errors, 0 warnings.

## Files

```
index.html          harness page (tokens, tabs, notes panel)
js/app.js           renderer, post chain, UI, export
js/core.js          palette, shared shaders (grid, buildings, glow), city layout, camera
js/paper.js         paper sheet shader (Surface + Seal)
js/frames/sf0*.js   one module per frame: build(), overlay(), notes
assets/             approved raster lockup
```
