import json

ua_dir = 'C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything'

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'r') as f:
    graph = json.load(f)

fixes = {'name': 0, 'summary': 0, 'tags': 0, 'type': 0}

for n in graph['nodes']:
    nid = n.get('id', '')
    # Fix name
    if not n.get('name'):
        if ':' in nid:
            n['name'] = nid.split(':')[-1]
        else:
            n['name'] = nid
        fixes['name'] += 1
    # Fix summary
    if not n.get('summary'):
        n['summary'] = f'A {n.get("type", "module")} node in the voxlblade-builder project'
        fixes['summary'] += 1
    # Fix tags
    if not n.get('tags') or len(n['tags']) == 0:
        n['tags'] = ['untagged']
        fixes['tags'] += 1
    # Fix type (should already be fixed, but just in case)
    if not n.get('type'):
        if nid.startswith('file:'):
            n['type'] = 'file'
        elif nid.startswith('function:'):
            n['type'] = 'function'
        elif nid.startswith('class:'):
            n['type'] = 'class'
        elif nid.startswith('config:'):
            n['type'] = 'config'
        elif nid.startswith('document:'):
            n['type'] = 'document'
        elif nid.startswith('concept:'):
            n['type'] = 'concept'
        else:
            n['type'] = 'file'
        fixes['type'] += 1

# Fix tour step that references missing node
for step in graph.get('tour', []):
    nids = step.get('nodeIds', [])
    keep = []
    for nid in nids:
        exists = any(n['id'] == nid for n in graph['nodes'])
        if exists:
            keep.append(nid)
        else:
            print(f'Tour: removing missing node {nid}')
    step['nodeIds'] = keep

print(f'Fixes: {fixes}')

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'w') as f:
    json.dump(graph, f, indent=2)

print('Saved')
