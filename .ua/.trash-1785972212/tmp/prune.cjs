const fs = require('fs');
const g = JSON.parse(fs.readFileSync('.ua/knowledge-graph.json', 'utf8'));
const removed = new Set(g.nodes.filter(n => n.filePath === 'src/data/Perkbasedmg.ts').map(n => n.id));
const keep = g.nodes.filter(n => !removed.has(n.id));
const keepEdges = g.edges.filter(e => !removed.has(e.source) && !removed.has(e.target));
fs.writeFileSync('.ua/intermediate/batch-existing.json', JSON.stringify({ nodes: keep, edges: keepEdges }, null, 2));
console.log('pruned nodes:', removed.size, 'kept nodes:', keep.length, 'kept edges:', keepEdges.length);
console.log([...removed].join('\n'));