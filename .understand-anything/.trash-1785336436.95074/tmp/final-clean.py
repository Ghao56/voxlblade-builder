import json

ua_dir = 'C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything'

with open(f'{ua_dir}/intermediate/layers.json', 'r') as f:
    layers = json.load(f)

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'r') as f:
    graph = json.load(f)

node_ids = {n['id'] for n in graph['nodes']}

# Remove dangling refs from layers
for layer in layers:
    if 'nodeIds' in layer:
        orig = len(layer['nodeIds'])
        layer['nodeIds'] = [nid for nid in layer['nodeIds'] if nid in node_ids]
        if len(layer['nodeIds']) < orig:
            print(f'{layer["id"]}: removed {orig - len(layer["nodeIds"])} dangling refs')

with open(f'{ua_dir}/intermediate/layers.json', 'w') as f:
    json.dump(layers, f, indent=2)

# Fix tour
if 'tour' in graph:
    for step in graph['tour']:
        if 'nodeIds' in step:
            step['nodeIds'] = [nid for nid in step['nodeIds'] if nid in node_ids]

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'w') as f:
    json.dump(graph, f, indent=2)

print('Done')
