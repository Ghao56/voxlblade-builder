import json
ua_dir = 'C:/Users/Administrator/Downloads/voxlblade-builder/.understand-anything'
with open(f'{ua_dir}/intermediate/layers.json') as f:
    layers = json.load(f)
with open(f'{ua_dir}/intermediate/assembled-graph.json') as f:
    graph = json.load(f)

for l in layers:
    nids = l['nodeIds']
    if l['id'] == 'layer:shared-utility':
        print(f'Shared utility: {nids}')
    if l['id'] == 'layer:state':
        has_weird = [n for n in nids if '::' in n]
        if has_weird:
            print(f'State weird nodes ({len(has_weird)}):')
            for n in has_weird[:5]:
                print(f'  {n}')
    if l['id'] == 'layer:project-root':
        has_weird = [n for n in nids if '::' in n]
        if has_weird:
            print(f'Project root weird nodes ({len(has_weird)}):')
            for n in has_weird[:5]:
                print(f'  {n}')
    if l['id'] == 'layer:engine-core':
        print(f'Engine core: {len(nids)} nodes')
        print(f'  {nids}')

# Check file-type nodes with ::
file_nodes_with_double = [n for n in graph['nodes'] if n.get('type') == 'file' and '::' in n['id']]
print(f'\nTotal weird file nodes: {len(file_nodes_with_double)}')
