const fs = require('fs');
const path = 'D:\\voxlblade-builder\\.understand-anything\\intermediate\\assembled-graph.json';
const out = 'D:\\voxlblade-builder\\.understand-anything\\intermediate\\batch-existing.json';

const graph = JSON.parse(fs.readFileSync(path, 'utf8'));

// Handle the wrapped layers format - extract raw nodes/edges
let nodes = graph.nodes || [];
let edges = graph.edges || [];

// If nodes are in layers.value format, flatten
if (graph.layers && graph.layers.value && !Array.isArray(nodes)) {
  // The assembled-graph has layers with nodeIds, but nodes/edges are separate
}

// Changed files to remove
const changedFiles = [
  'package.json',
  'src/BaseDamageCalc.svelte',
  'src/DamageAnalyzer.svelte',
  'src/data/weaponConditionalBoosts.ts',
];

// Also match double-colon prefix variants and filePath field
function isChangedNode(node) {
  const fp = node.filePath || node.path || '';
  const id = node.id || '';
  for (const cf of changedFiles) {
    if (fp === cf) return true;
    if (id.includes(cf)) return true;
    // Match both file::cf and file:cf patterns
    if (id === `file::${cf}` || id === `file:${cf}` || id === `config::${cf}` || id === `config:${cf}`) return true;
  }
  return false;
}

const removedIds = new Set();
const keptNodes = [];
for (const node of nodes) {
  if (isChangedNode(node)) {
    removedIds.add(node.id);
  } else {
    keptNodes.push(node);
  }
}

const keptEdges = edges.filter(e => !removedIds.has(e.source) && !removedIds.has(e.target));

console.error(`Removed ${removedIds.size} nodes: ${[...removedIds].join(', ')}`);
console.error(`Kept ${keptNodes.length} nodes, ${keptEdges.length} edges (removed ${edges.length - keptEdges.length} edges)`);

fs.writeFileSync(out, JSON.stringify({ nodes: keptNodes, edges: keptEdges }, null, 2));
console.log('Written batch-existing.json');
