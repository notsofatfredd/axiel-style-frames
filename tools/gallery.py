"""Build the review gallery from the per-frame render artifacts.

Usage: python tools/gallery.py <parts_dir> <out_dir> [run_number] [carto_dir] [objects_dir] [animatic_dir]
  animatic_dir: optional, the G4 grey-box animatic from tools/animatic.mjs (MP4s, storyboard JPEGs, plot map, anim.json)
  parts_dir: one folder per frame job, each with PNGs and render-log.json (from tools/render.mjs)
  carto_dir: optional, the Cartographer silhouette test from tools/carto.mjs (PNGs + carto.json)
  objects_dir: optional, the G3 hero objects from tools/objects.mjs (PNGs + objects.json)
  out_dir:   writes full/*.png, thumbs/*.jpg, render-log.md, render-log.json, index.html

The gallery shows finished PNGs only, so viewing it never renders 3D on the viewer's device.
Thumbnails need Pillow; without it the page uses the full PNGs.
"""
import html
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ORDER = ['SF-01', 'SF-02', 'SF-03', 'SF-04', 'SF-05', 'SF-06', 'SF-07', 'SF-07b', 'SF-08']
SCENE = {'SF-01': 'Surface', 'SF-02': 'Fall', 'SF-03': 'ATLAS', 'SF-04': 'INDEX', 'SF-05': 'DEVOS',
         'SF-06': 'AMOS', 'SF-07': 'Proof', 'SF-07b': 'Proof', 'SF-08': 'Seal'}
VARIANT = [('high', 'desktop'), ('mid', 'desktop'), ('high', 'phone'), ('mid', 'phone')]


def main(parts, out, run, carto=None, objects=None, animatic=None):
    parts, out = Path(parts), Path(out)
    (out / 'full').mkdir(parents=True, exist_ok=True)
    (out / 'thumbs').mkdir(exist_ok=True)
    log = []
    for f in sorted(parts.glob('*/render-log.json')):
        log += json.loads(f.read_text(encoding='utf-8'))
    for png in parts.glob('*/*.png'):
        shutil.copy2(png, out / 'full' / png.name)

    try:
        from PIL import Image
        for png in (out / 'full').glob('*.png'):
            im = Image.open(png).convert('RGB')
            im.thumbnail((900, 900))
            im.save(out / 'thumbs' / (png.stem + '.jpg'), quality=82)
        thumbs = True
    except ImportError:
        thumbs = False

    log.sort(key=lambda e: (ORDER.index(e['id']) if e['id'] in ORDER else 99, VARIANT.index((e['tier'], e['vp']))))
    (out / 'render-log.json').write_text(json.dumps(log, indent=2), encoding='utf-8')
    rows = ['| Frame | Tier · viewport | Size | Calls (scene / total) | Triangles | Luminance | Near-black | ≥ 250 | Build / render ms | Errors |',
            '|---|---|---|---|---|---|---|---|---|---|']
    for e in log:
        if e.get('ok'):
            rows.append(f"| {e['id']} | {e['tier']} · {e['vp']} | {e['w']}×{e['h']} | {e['sceneCalls']} / {e['calls']} | {e['tris']:,} | {e['lum']} | "
                        f"{e['black'] * 100:.1f}% | {e['clip'] * 100:.1f}% | {e['buildMs']} / {e['renderMs']} | {len(e['errs'])}{' · GATE ' + e['gate'] if e.get('gate') else ''} |")
        else:
            rows.append(f"| {e['id']} | {e['tier']} · {e['vp']} | FAILED | | | {e.get('err', '')} | | | | {len(e['errs'])} |")
    # BOM so a browser opening the raw .md from Pages reads the · and × correctly
    (out / 'render-log.md').write_text('\n'.join(rows) + '\n', encoding='utf-8-sig')

    ok = sum(1 for e in log if e.get('ok'))
    when = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    cards = []
    for fid in ORDER:
        es = [e for e in log if e['id'] == fid]
        if not es:
            continue
        shots = []
        for e in es:
            label = f"{e['tier']} · {e['vp']}"
            if not e.get('ok'):
                shots.append(f'<figure class="fail"><div>Render failed</div><figcaption>{label}</figcaption></figure>')
                continue
            src = f"thumbs/{Path(e['file']).stem}.jpg" if thumbs else f"full/{e['file']}"
            stats = f"{e['sceneCalls']} / {e['calls']} calls · {e['tris']:,} tris · near-black {e['black'] * 100:.0f}%"
            if e.get('gate'):
                stats += f" · GATE: {html.escape(e['gate'])}"
            shots.append(
                f'<figure class="{e["vp"]}"><a href="full/{html.escape(e["file"])}">'
                f'<img src="{html.escape(src)}" alt="{fid} {label}" loading="lazy" width="{e["w"]}" height="{e["h"]}"></a>'
                f'<figcaption><b>{label}</b><span>{stats}</span></figcaption></figure>')
        cards.append(f'<section id="{fid.lower()}"><h2><span>{fid}</span> {SCENE[fid]}</h2><div class="shots">{"".join(shots)}</div></section>')

    # G2-6: the Cartographer silhouette test, shown as captured (small flat-black PNGs, no thumbnails needed)
    carto_html = ''
    cj = Path(carto) / 'carto.json' if carto else None
    if cj and cj.exists():
        c = json.loads(cj.read_text(encoding='utf-8'))
        shutil.copytree(carto, out / 'carto', dirs_exist_ok=True)
        figs = ''.join(f'<figure><a href="carto/{html.escape(f["file"])}"><img src="carto/{html.escape(f["file"])}" alt="{html.escape(f["cap"])}" loading="lazy"></a>'
                       f'<figcaption><span>{html.escape(f["cap"])}</span></figcaption></figure>' for f in c.get('files', []))
        nums = f"{c.get('tris', '?')} triangles (≤ 10 000) · {c.get('hinges', '?')} hinges (≤ 30)" + (f" · GATE: {html.escape(c['gate'])}" if c.get('gate') else '')
        carto_html = (f'<section id="carto"><h2><span>G2-6</span> Cartographer silhouette test</h2><p class="meta">{nums} · '
                      f'<a href="../cartographer.html">live page</a></p><div class="shots">{figs}</div></section>')
    # G3: hero objects, budget table + turnarounds as captured
    objects_html = ''
    oj = Path(objects) / 'objects.json' if objects else None
    if oj and oj.exists():
        o = json.loads(oj.read_text(encoding='utf-8'))
        shutil.copytree(objects, out / 'objects', dirs_exist_ok=True)
        cls = {'PASS': 'pass', 'FAIL': 'bad', 'CEILING': 'ceil'}
        trs = ''.join(f'<tr><td>{html.escape(r["name"])}</td><td>{r["value"]:,} {html.escape(r["unit"])}</td><td>≤ {r["budget"]:,}</td>'
                      f'<td class="{cls.get(r["result"], "")}">{r["result"]}</td><td>{html.escape(r.get("note", ""))}</td></tr>' for r in o.get('rows', []))
        figs = ''.join(f'<figure><a href="objects/{html.escape(f["file"])}"><img src="objects/{html.escape(f["file"])}" alt="{html.escape(f["cap"])}" loading="lazy"></a>'
                       f'<figcaption><span>{html.escape(f["cap"])}</span></figcaption></figure>' for f in o.get('files', []))
        pend = ''.join(f'<br>Pending: {html.escape(x)}' for x in o.get('pending', []))
        gate = f' · GATE: {html.escape(o["gate"])}' if o.get('gate') else ''
        objects_html = (f'<section id="objects"><h2><span>G3</span> Hero objects</h2><p class="meta">Budgets from §3.2 / §3.3{gate} · '
                        f'<a href="../objects.html">live page</a>{pend}</p><div class="tbl"><table><thead><tr><th>Object</th><th>Measured</th><th>Budget</th>'
                        f'<th>Result</th><th>Notes</th></tr></thead><tbody>{trs}</tbody></table></div><div class="shots">{figs}</div></section>')
    # G4: grey-box animatic, videos + plot map + storyboard as captured, clearance / legibility / pacing from anim.json
    anim_html = ''
    aj = Path(animatic) / 'anim.json' if animatic else None
    if aj and aj.exists():
        a = json.loads(aj.read_text(encoding='utf-8'))
        shutil.copytree(animatic, out / 'animatic', dirs_exist_ok=True)
        rep = a.get('report') or {}
        vids = ''.join(f'<figure class="{"phone" if v["vp"] == "phone" else ""}"><video controls preload="metadata" playsinline src="animatic/{html.escape(v["file"])}"></video>'
                       f'<figcaption><b>{"Desktop 1440×900" if v["vp"] == "desk" else "Phone 390×844"}</b><span>{v["seconds"]:.0f} s at {v["fps"]} fps (PROPOSED steady scroll)</span></figcaption></figure>'
                       for v in a.get('videos', []))
        def pf(b):
            return f'<span class="{"pass" if b else "bad"}">{"PASS" if b else "FAIL"}</span>'
        clr = ''
        for vp, name in (('desk', 'Desktop'), ('phone', 'Phone')):
            c = (rep.get('clearance') or {}).get(vp)
            if not c:
                continue
            mins = ' · '.join(f'{k} {m["d"]:.2f} ({html.escape(m["at"])})' for k, m in c['min'].items())
            inter = '; '.join(f'{html.escape(i["name"])} p {i["p0"]:.3f}–{i["p1"]:.3f}' for i in c['intersections']) or 'none'
            corr = '; '.join(f'{html.escape(x["at"])} min {x["d"]:.2f} ({html.escape(x["name"])})' for x in c['corridor']) or 'held'
            cross = '; '.join(f'{html.escape(x["at"])} margin {x["margin"]:.2f}' for x in c['crossings'])
            clr += f'<tr><td>{name}</td><td>{pf(c["pass"])}</td><td>{mins}</td><td>{inter}</td><td>{corr}</td><td>{cross}</td></tr>'
        leg = ''.join(f'<tr><td>{html.escape(r["item"])}</td><td>{r["key"]}</td><td>{pf(r["desk"]["pass"])} {r["desk"]["px"]:.1f}{"" if r["desk"]["fits"] else " (clipped)"}</td>'
                      f'<td>{pf(r["phone"]["pass"])} {r["phone"]["px"]:.1f}{"" if r["phone"]["fits"] else " (clipped)"}</td></tr>' for r in rep.get('legibility', []))
        flags = ''.join(f'<tr><td>{vp}</td><td>{r["seg"]}</td><td>{r["dur"]:.2f} s</td><td>{r["speed"]:.1f}</td><td>{r["turn"]:.0f}</td><td class="ceil">{html.escape(r["flag"])}</td></tr>'
                        for vp in ('desk', 'phone') for r in (rep.get('pacing') or {}).get(vp, []) if r.get('flag'))
        board = {vp: ''.join(f'<figure class="{"phone" if vp == "phone" else ""}"><a href="animatic/{html.escape(f["file"])}"><img src="animatic/{html.escape(f["file"])}" alt="{html.escape(f["cap"])}" loading="lazy"></a>'
                             f'<figcaption><span>{html.escape(f["cap"])}</span></figcaption></figure>' for f in a.get('files', []) if f.get('vp') == vp) for vp in ('desk', 'phone')}
        gate = f' · GATE: {html.escape(a["gate"])}' if a.get('gate') else ''
        anim_html = (f'<section id="animatic"><h2><span>G4</span> Grey-box animatic</h2><p class="meta">Event timings and scroll speed PROPOSED{gate} · '
                     f'<a href="animatic/clearance.md">clearance.md</a> · <a href="animatic/plot-map.png">plot map</a> · <a href="../animatic.html">live page (scrub it)</a></p>'
                     f'<div class="shots">{vids}<figure><a href="animatic/plot-map.png"><img src="animatic/plot-map.png" alt="Plot map" loading="lazy"></a><figcaption><b>Plot map</b></figcaption></figure></div>'
                     f'<h3>Clearance</h3><div class="tbl"><table><thead><tr><th>Viewport</th><th>Result</th><th>Closest per obstacle</th><th>Intersections</th><th>Corridor r 1.5</th><th>Tear crossings</th></tr></thead><tbody>{clr}</tbody></table></div>'
                     f'<h3>Legibility at the key (cap px; min 18 desktop, 14 phone)</h3><div class="tbl"><table><thead><tr><th>Text</th><th>Key</th><th>1440×900</th><th>390×844</th></tr></thead><tbody>{leg}</tbody></table></div>'
                     f'<h3>Pacing flags</h3><div class="tbl"><table><thead><tr><th>Viewport</th><th>Segment</th><th>Time</th><th>Units/s</th><th>Peak turn °/s</th><th>Flag</th></tr></thead><tbody>{flags or "<tr><td>none</td></tr>"}</tbody></table></div>'
                     f'<h3>Storyboard, desktop</h3><div class="shots">{board["desk"]}</div><h3>Storyboard, phone</h3><div class="shots">{board["phone"]}</div></section>')
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>AXIEL G2 Frames</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root {{ --ink: #0B0B0C; --graphite: #1D1D1F; --stone: #6A675F; --bone: #D6D2C8; --paper: #F2EFE9; --atlas-gold: #C9A35B; --signal-red: #C2412D; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; background: var(--ink); color: var(--bone); font: 400 15px/1.5 Montserrat, sans-serif; }}
header, main, footer {{ max-width: 1280px; margin: 0 auto; padding: 0 16px; }}
header {{ padding-top: 32px; padding-bottom: 8px; }}
h1 {{ margin: 0; font-weight: 300; font-size: 14px; letter-spacing: .16em; text-transform: uppercase; }}
h1 b {{ font-weight: 500; color: var(--atlas-gold); }}
.meta {{ font: 400 12px/1.6 "JetBrains Mono", monospace; color: var(--stone); margin: 8px 0 0; }}
.meta a, footer a {{ color: var(--bone); }}
nav {{ display: flex; flex-wrap: wrap; gap: 6px; margin: 20px 0 8px; }}
nav a {{ font: 500 12px/1 "JetBrains Mono", monospace; color: var(--bone); text-decoration: none; background: var(--graphite); padding: 8px 10px; }}
section {{ padding: 28px 0 8px; border-top: 1px solid var(--graphite); margin-top: 20px; }}
h2 {{ margin: 0 0 14px; font-weight: 300; font-size: 22px; letter-spacing: .04em; }}
h3 {{ font: 500 12px "JetBrains Mono", monospace; color: var(--stone); letter-spacing: .06em; text-transform: uppercase; margin: 20px 0 8px; }}
video {{ display: block; width: 100%; height: auto; background: var(--graphite); }}
h2 span {{ font: 500 13px "JetBrains Mono", monospace; color: var(--atlas-gold); margin-right: 8px; vertical-align: middle; }}
.shots {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 16px; align-items: start; }}
figure {{ margin: 0; }}
figure.phone {{ max-width: 260px; }}
img {{ display: block; width: 100%; height: auto; background: var(--graphite); }}
figcaption {{ display: flex; flex-direction: column; gap: 2px; padding-top: 8px; font: 400 12px/1.4 "JetBrains Mono", monospace; color: var(--stone); }}
figcaption b {{ color: var(--bone); font-weight: 500; }}
figure.fail div {{ aspect-ratio: 16 / 9; display: grid; place-items: center; background: var(--graphite); color: var(--signal-red); font: 500 13px "JetBrains Mono", monospace; }}
.tbl {{ overflow-x: auto; margin-bottom: 16px; }}
table {{ border-collapse: collapse; font: 400 12px/1.5 "JetBrains Mono", monospace; min-width: 640px; }}
th, td {{ text-align: left; padding: 6px 12px 6px 0; border-bottom: 1px solid var(--graphite); vertical-align: top; }}
th {{ color: var(--stone); font-weight: 500; }}
.pass {{ color: #9FC2A0; }} .bad {{ color: var(--signal-red); }} .ceil {{ color: var(--atlas-gold); }}
footer {{ padding-top: 32px; padding-bottom: 48px; font-size: 13px; color: var(--stone); }}
</style></head><body>
<header>
<h1><b>AXIEL</b> · Gate G2 style frames</h1>
<p class="meta">{ok} of {len(log)} rendered · run {html.escape(str(run))} · {when}<br>
Tap a frame for the full-size PNG · <a href="render-log.md">render log</a> · <a href="../">live harness (renders on your device, heavy)</a></p>
<nav>{''.join(f'<a href="#{f.lower()}">{f}</a>' for f in ORDER if any(e['id'] == f for e in log))}{'<a href="#carto">CARTOGRAPHER</a>' if carto_html else ''}{'<a href="#objects">OBJECTS</a>' if objects_html else ''}{'<a href="#animatic">ANIMATIC</a>' if anim_html else ''}</nav>
</header>
<main>{''.join(cards)}{carto_html}{objects_html}{anim_html}</main>
<footer>Rendered by the Render frames workflow on GitHub Actions (software WebGL). Numbers are a headless check, not a visual review.</footer>
</body></html>
"""
    (out / 'index.html').write_text(page, encoding='utf-8')
    print(f'gallery: {ok}/{len(log)} rendered, thumbs={thumbs}, {out}')
    return ok, len(log)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'local', sys.argv[4] if len(sys.argv) > 4 else None,
         sys.argv[5] if len(sys.argv) > 5 else None, sys.argv[6] if len(sys.argv) > 6 else None)
