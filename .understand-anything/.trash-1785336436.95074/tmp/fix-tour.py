import json

ua_dir = 'C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything'

with open(f'{ua_dir}/intermediate/tour.json', 'r') as f:
    tour = json.load(f)

if isinstance(tour, dict) and 'steps' in tour:
    tour = tour['steps']

with open(f'{ua_dir}/intermediate/assembled-graph.json', 'r') as f:
    graph = json.load(f)

node_ids = {n['id'] for n in graph['nodes']}

for step in tour:
    orig = len(step.get('nodeIds', []))
    step['nodeIds'] = [n for n in step.get('nodeIds', []) if n in node_ids]
    if len(step['nodeIds']) < orig:
        print(f'Step {step.get("order", "?")}: removed {orig - len(step["nodeIds"])} dangling refs')

with open(f'{ua_dir}/intermediate/tour.json', 'w') as f:
    json.dump(tour, f, indent=2)

print('Saved tour.json')
