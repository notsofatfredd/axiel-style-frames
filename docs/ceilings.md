# Ceilings (known limits, logged as the protocol asks)

What the build has not reached yet, or measured below target, with the reason and what lifts it. Nothing here is
hidden from a gate: each line is also a human or later-phase item in the README.

## G6 technical prototype

| Item | State | Lifts at |
|---|---|---|
| Scope | **AMOS only** (p 0.55 to 0.85). The other seven scenes still live in the frame harness and the grey-box animatic. | G8 scene build |
| Device fps (§6: 60 desktop, 45 mobile) | **Not measured on a real device.** CI runs on SwiftShader (CPU), where single-digit fps is normal and says nothing about a GPU. The `?bench=1` run is ready for a laptop and a phone. If a device misses the target, the approved fallback (pre-baked drop textures on Mid, §3.2) goes in and is logged here. | Human bench run |
| Low tier and reduced motion (§10.1) | **Not built.** | Phase 10 |
| Tier choice (§10.1 fps probe) | **No live probe yet.** The tier comes from the device type (phone or touch: Mid, else High) or `?tier=`. The fps thresholds are coded (`tierFromFps`) but not wired; the bench numbers decide whether they are right. | Phase 10, after the device bench |
| rain_stop (§5.3: "Rain stops; city lights brighten") | **Half built.** The rain stops; the city lights do not brighten yet. | G8, with the Proof scene that owns the lit window |
| Label values | **The protocol's D4 placeholder set** (LCP 1.2s, CLS 0.02, A11Y 98, NAV PASS, ERRORS 0), not a real AMOS run. | When real readings exist (G3 unknown, still open) |
| Planar reflection on High | Rendered at half resolution to hold the budget. | Raise if the device bench has headroom |
| Grain | DOM overlay, not in the WebGL frame, so a canvas capture has no grain. Screens look the same. | n/a (P6-2) |

## G7 assets

| Item | State | Lifts at |
|---|---|---|
| Specimens | **Placeholders.** `strata_specimens_v1` is the 12 PROPOSED stand-ins from G3; the real artefacts are still UNKNOWN. The pipeline ships them so the budgets and the bake are real. | When the real specimens exist (G3 open item) |
| Modelling tool | **The kits are the models.** Blender is used for the AO bake only, headless in CI; nothing is hand-modelled, so there is no .blend to keep in sync. | CD (P7-8) |
| Turntable vs the style frame | **Compared against the kit render, not the frame PNG.** The kits render the frames, so a kit match is a frame match for the object; whole-frame comparisons are the G11 visual suite. | G11 |
| Code-native objects | The Cartographer, the Core, the dart and the seal string stay code-native (§7.1); their budgets are the G3 objects page. | n/a |
| Texture memory | **Estimated**, not measured (P7-7). A device check with the GPU memory tools in Chrome would confirm it. | G10 device pass |
