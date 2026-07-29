import json

ua_dir = 'C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything'

with open(f'{ua_dir}/intermediate/assembled-graph.json') as f:
    graph = json.load(f)

# Remove nodes with :: in their ID and file type (these are malformed from agent analysis)
malformed_ids = set()
clean_nodes = []
for n in graph['nodes']:
    if '::' in n['id'] and n.get('type') == 'file':
        malformed_ids.add(n['id'])
    else:
        clean_nodes.append(n)

print(f'Removed {len(malformed_ids)} malformed nodes')

# Remove edges referencing malformed nodes
clean_edges = []
dropped = 0
for e in graph['edges']:
    if e.get('source') in malformed_ids or e.get('target') in malformed_ids:
        dropped += 1
    else:
        clean_edges.append(e)

print(f'Dropped {dropped} edges referencing malformed nodes')

graph['nodes'] = clean_nodes
graph['edges'] = clean_edges

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'w') as f:
    json.dump(graph, f, indent=2)

print(f'Final: {len(clean_nodes)} nodes, {len(clean_edges)} edges')
