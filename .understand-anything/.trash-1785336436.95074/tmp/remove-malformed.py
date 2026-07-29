import json

ua_dir = 'C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything'

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'r') as f:
    graph = json.load(f)

malformed_ids = set()
clean_nodes = []
for n in graph['nodes']:
    nid = n.get('id', '')
    # Remove nodes with :: in their ID (malformed analysis artifacts from stats.html and store analysis)
    if '::' in nid:
        malformed_ids.add(nid)
        print(f'Removing malformed: {nid} (type={n.get("type","")})')
    else:
        clean_nodes.append(n)

print(f'Removed {len(malformed_ids)} malformed nodes')

clean_edges = []
dropped = 0
for e in graph['edges']:
    if e.get('source') in malformed_ids or e.get('target') in malformed_ids:
        dropped += 1
    else:
        clean_edges.append(e)
if dropped:
    print(f'Dropped {dropped} edges')

# Also remove tour step that references removed node
if 'tour' in graph:
    for step in graph['tour']:
        step['nodeIds'] = [nid for nid in step.get('nodeIds', []) if nid not in malformed_ids]

graph['nodes'] = clean_nodes
graph['edges'] = clean_edges

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'w') as f:
    json.dump(graph, f, indent=2)

print(f'Final: {len(clean_nodes)} nodes, {len(clean_edges)} edges')
