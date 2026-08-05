const fs = require('fs');
const dir = '.ua/intermediate';
const graph = JSON.parse(fs.readFileSync(`${dir}/assembled-graph.json`, 'utf8'));
let layers = JSON.parse(fs.readFileSync(`${dir}/layers.json`, 'utf8'));
let tour = JSON.parse(fs.readFileSync(`${dir}/tour.json`, 'utf8'));
if (!Array.isArray(layers) && layers.layers) layers = layers.layers;
if (!Array.isArray(tour) && tour.steps) tour = tour.steps;
const ids = new Set(graph.nodes.map(n => n.id));
layers = layers.map(l => {
  if (!l.id) l.id = 'layer:' + l.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  l.nodeIds = (l.nodeIds || []).filter(id => ids.has(id));
  return l;
});
tour = tour.map((s, i) => {
  s.nodeIds = (s.nodeIds || []).filter(id => ids.has(id));
  s.order = i + 1;
  return s;
});
const final = {
  version: '1.0.0',
  project: {
    name: 'voxlblade',
    languages: ['typescript', 'svelte', 'json', 'css', 'html', 'yaml', 'javascript'],
    frameworks: ['Svelte 5', 'Vite', 'Vitest'],
    description: 'A web-based damage calculator and build optimizer for the Roblox game Voxel Blade',
    analyzedAt: new Date().toISOString(),
    gitCommitHash: '03fd4971557c3b48d96a9f7922133889d0af6160'
  },
  nodes: graph.nodes,
  edges: graph.edges,
  layers,
  tour
};
fs.writeFileSync(`${dir}/assembled-graph.json`, JSON.stringify(final, null, 2));
console.log(`assembled: nodes=${final.nodes.length} edges=${final.edges.length} layers=${layers.length} tour=${tour.length}`);