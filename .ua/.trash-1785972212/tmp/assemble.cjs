const fs = require('fs');
const cur = JSON.parse(fs.readFileSync('.ua/knowledge-graph.json', 'utf8'));
const merged = JSON.parse(fs.readFileSync('.ua/intermediate/assembled-graph.json', 'utf8'));
const ids = new Set(merged.nodes.map(n => n.id));
let layers = cur.layers.map(l => ({ ...l, nodeIds: (l.nodeIds || []).filter(id => ids.has(id)) }));
let tour = cur.tour.map((s, i) => ({ ...s, nodeIds: (s.nodeIds || []).filter(id => ids.has(id)), order: i + 1 }));
const final = {
  version: '1.0.0',
  project: {
    name: 'voxlblade',
    languages: ['typescript','svelte','json','css','html','yaml','javascript'],
    frameworks: ['Svelte 5','Vite','Vitest'],
    description: 'A web-based damage calculator and build optimizer for the Roblox game Voxel Blade',
    analyzedAt: new Date().toISOString(),
    gitCommitHash: 'd29e71502f0a7c0f01a44a8d4be0ed39e6f1b89b'.slice(0, 40)
  },
  nodes: merged.nodes, edges: merged.edges, layers, tour
};
fs.writeFileSync('.ua/intermediate/assembled-graph.json', JSON.stringify(final, null, 2));
console.log(`assembled: nodes=${final.nodes.length} edges=${final.edges.length} layers=${layers.length} tour=${tour.length}`);