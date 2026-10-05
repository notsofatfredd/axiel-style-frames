"""G7 lightmap bake (§7.1 "bake lighting where static"), Blender headless, Cycles on CPU.

The city and the strata are relit scene by scene (dusk, rain, the gold seam), so a baked light would be wrong in
every scene but one. What is static is the geometry, so the bake is ambient occlusion only: contact darkening where
buildings meet the ground and where the carved cliff folds, multiplied in under whatever light the scene has
(PROPOSED, docs/proposals.md P7-1). Blender is used for the bake only; the kits are the models.

Each bake scene (assets.html?mode=export) holds the target meshes, with TEXCOORD_1, and one merged mesh of everything
that can occlude them. Every target is baked into its own PNG on its TEXCOORD_1 layout; tools/pack.mjs attaches it as
the occlusionTexture.

Usage: blender -b --factory-startup --python tools/bake.py -- <manifest.json> <rawDir> <outDir> [samples]
"""
import bpy, json, os, sys, time

argv = sys.argv[sys.argv.index('--') + 1:]
MAN, RAW, OUT = argv[0], argv[1], argv[2]
SAMPLES = int(argv[3]) if len(argv) > 3 else 128
os.makedirs(OUT, exist_ok=True)
man = json.load(open(MAN, encoding='utf-8'))
report = {'blender': bpy.app.version_string, 'samples': SAMPLES, 'bakes': []}


def find(name):
    # glTF node names become object names; Blender adds .001 on a clash
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and (o.name == name or o.name.startswith(name + '.')):
            return o
    raise SystemExit(f'bake: no mesh object named {name}')


for b in man['bakes']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(RAW, b['glb']))
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = False
    if sc.world is None:
        sc.world = bpy.data.worlds.new('bake')
    for t in b['targets']:
        t0 = time.time()
        obj = find(t['mesh'])
        me = obj.data
        if len(me.uv_layers) < 2:
            raise SystemExit(f'bake: {t["mesh"]} has {len(me.uv_layers)} UV layer(s), needs TEXCOORD_1')
        me.uv_layers.active_index = 1
        me.uv_layers[1].active_render = True
        img = bpy.data.images.new(t['mesh'] + '-ao', t['w'], t['h'], alpha=False, float_buffer=False)
        img.colorspace_settings.name = 'Non-Color'
        if not obj.data.materials:
            obj.data.materials.append(bpy.data.materials.new('bake'))
        for m in obj.data.materials:
            m.use_nodes = True
            n = m.node_tree.nodes.new('ShaderNodeTexImage')
            n.image = img
            m.node_tree.nodes.active = n
        # AO reach: the world's ambient occlusion distance, in metres (the kits model in metres)
        sc.world.light_settings.distance = t['dist']
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.bake(type='AO', margin=8, use_clear=True)
        img.filepath_raw = os.path.join(OUT, t['mesh'] + '.png')
        img.file_format = 'PNG'
        img.save()
        px = img.pixels[:]   # flat RGBA floats: the mean says whether the bake did anything
        mean = sum(px[0::4]) / (len(px) // 4)
        report['bakes'].append({'scene': b['id'], 'mesh': t['mesh'], 'w': t['w'], 'h': t['h'], 'dist': t['dist'],
                                'tris': sum(len(p.vertices) - 2 for p in me.polygons), 'mean': round(mean, 4),
                                'seconds': round(time.time() - t0, 1)})
        print(f"bake {t['mesh']}: {t['w']}x{t['h']} AO {t['dist']} m, mean {mean:.3f}, {time.time() - t0:.0f} s", flush=True)
        # a flat white or black map means no occluders were seen, or the UVs were wrong
        if not 0.05 < mean < 0.999:
            raise SystemExit(f'bake: {t["mesh"]} came out flat (mean {mean:.3f})')

json.dump(report, open(os.path.join(OUT, 'bake.json'), 'w'), indent=1)
