import json

with open('C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything/intermediate/assembled-graph.json') as f:
    graph = json.load(f)
with open('C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything/knowledge-graph.json') as f:
    old_kg = json.load(f)

all_file_ids = set()
for n in graph['nodes']:
    if n.get('type') in ('file','config','document','service','pipeline','schema','resource','endpoint'):
        all_file_ids.add(n['id'])

merged_layers = []
for old_layer in old_kg.get('layers', []):
    merged = dict(old_layer)
    merged['nodeIds'] = [nid for nid in old_layer.get('nodeIds', []) if nid in all_file_ids]
    merged_layers.append(merged)

assigned_ids = set()
for l in merged_layers:
    assigned_ids.update(l.get('nodeIds', []))

unassigned = [n for n in graph['nodes'] if n.get('type') in ('file','config','document','service','pipeline','schema','resource','endpoint') and n['id'] not in assigned_ids]
print(f'Unassigned nodes: {len(unassigned)}')

data_layer = [l for l in merged_layers if l['id'] == 'layer:data-layer'][0]
constants_layer = [l for l in merged_layers if l['id'] == 'layer:constants'][0]
engine_layer = [l for l in merged_layers if l['id'] == 'layer:engine-core'][0]
state_layer = [l for l in merged_layers if l['id'] == 'layer:state'][0]
ui_layer = [l for l in merged_layers if l['id'] == 'layer:ui-components'][0]
project_layer = [l for l in merged_layers if l['id'] == 'layer:project-root'][0]
shared_layer = [l for l in merged_layers if l['id'] == 'layer:shared-utility'][0]

for n in unassigned:
    nid = n['id']
    path = nid.split(':', 1)[1] if ':' in nid else ''
    if path.startswith('src/data/'):
        data_layer['nodeIds'].append(nid)
    elif path.startswith('src/lib/constants/'):
        constants_layer['nodeIds'].append(nid)
    elif path.startswith('src/lib/engine/'):
        engine_layer['nodeIds'].append(nid)
    elif path.startswith('src/lib/store'):
        state_layer['nodeIds'].append(nid)
    elif path.startswith('src/lib/stats/'):
        state_layer['nodeIds'].append(nid)
    elif (n.get('type') == 'file' and (nid.endswith('.svelte') or nid in ('file:src/main.ts','file:src/app.css','file:index.html','file:src/EmotionalTracker.svelte','file:src/PropellingFunTracker.svelte'))):
        ui_layer['nodeIds'].append(nid)
    elif nid.startswith('file:src/lib/') and n.get('type') in ('file','config','document'):
        shared_layer['nodeIds'].append(nid)
    else:
        project_layer['nodeIds'].append(nid)

with open('C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything/intermediate/layers.json', 'w') as f:
    json.dump(merged_layers, f, indent=2)

total = sum(len(l['nodeIds']) for l in merged_layers)
print(f'Written {len(merged_layers)} layers, {total} total nodeIds')
for l in merged_layers:
    print(f'  {l["id"]}: {len(l["nodeIds"])} nodes')
