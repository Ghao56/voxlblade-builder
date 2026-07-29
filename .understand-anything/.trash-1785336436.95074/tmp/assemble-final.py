import json
from datetime import datetime, timezone

ua_dir = 'C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything'
project_root = 'C:/Users/Administrator/Downloads/voxlblade-builder'

with open(f'{ua_dir}/intermediate/assembled-graph.json') as f:
    graph = json.load(f)
with open(f'{ua_dir}/intermediate/layers.json') as f:
    layers = json.load(f)
with open(f'{ua_dir}/intermediate/tour.json') as f:
    tour_raw = json.load(f)
with open(f'{ua_dir}/intermediate/scan-result.json') as f:
    scan = json.load(f)

# Unwrap tour envelope
if isinstance(tour_raw, dict) and 'steps' in tour_raw:
    tour = tour_raw['steps']
else:
    tour = tour_raw

# Get commit hash
commit_hash = '71df73c19251b8d827e8a7d0db1b68e9960bd4b1'

final = {
    'version': '1.0.0',
    'project': {
        'name': 'voxlblade-builder',
        'languages': list(scan.get('stats', {}).get('byLanguage', {}).keys()),
        'frameworks': ['Svelte', 'Vite', 'TypeScript'],
        'description': 'A web-based damage calculator and build optimizer for the Roblox game "Voxel Blade"',
        'analyzedAt': datetime.now(timezone.utc).isoformat(),
        'gitCommitHash': commit_hash
    },
    'nodes': graph['nodes'],
    'edges': graph['edges'],
    'layers': layers,
    'tour': tour
}

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'w') as f:
    json.dump(final, f, indent=2)

print(f'Assembled final graph: {len(graph["nodes"])} nodes, {len(graph["edges"])} edges, {len(layers)} layers, {len(tour)} tour steps')
