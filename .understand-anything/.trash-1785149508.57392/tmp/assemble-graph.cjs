const fs = require('fs');

// Read assembled nodes/edges
const assembled = JSON.parse(fs.readFileSync('.understand-anything/intermediate/assembled-graph.json', 'utf8'));

// Read layers
let layers = JSON.parse(fs.readFileSync('.understand-anything/intermediate/layers.json', 'utf8'));
if (layers.layers) layers = layers.layers;
if (layers.value) layers = layers.value;

// Read tour
let tour = JSON.parse(fs.readFileSync('.understand-anything/intermediate/tour.json', 'utf8'));
if (tour.steps) tour = tour.steps;
if (tour.value) tour = tour.value;

// Fix layers nodeIds
layers.forEach(layer => {
  if (layer.nodeIds) {
    layer.nodeIds = layer.nodeIds.map(id => {
      if (!/^(file:|config:|document:|service:|pipeline:|table:|schema:|resource:|endpoint:|function:|class:)/.test(id)) {
        return 'file:' + id;
      }
      return id;
    });
  }
});

// Fix tour nodeIds
tour.forEach(step => {
  if (step.nodeIds) {
    step.nodeIds = step.nodeIds.map(id => {
      if (!/^(file:|config:|document:|service:|pipeline:|table:|schema:|resource:|endpoint:|function:|class:)/.test(id)) {
        return 'file:' + id;
      }
      return id;
    });
  }
});

// Build final graph
const graph = {
  version: '1.0.0',
  project: {
    name: 'voxlblade',
    languages: ['typescript', 'svelte', 'html'],
    frameworks: ['svelte', 'vite'],
    description: 'A web-based damage calculator and build optimizer for the Roblox game Voxel Blade',
    analyzedAt: new Date().toISOString(),
    gitCommitHash: 'fa44a72a4ed06248e708bb8bf4f319374c86a514'
  },
  nodes: assembled.nodes,
  edges: assembled.edges,
  layers: layers,
  tour: tour
};

fs.writeFileSync('.understand-anything/intermediate/assembled-graph.json', JSON.stringify(graph, null, 2));
console.log(`Assembled: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.layers.length} layers, ${graph.tour.length} tour steps`);