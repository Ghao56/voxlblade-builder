const fs = require('fs');
const dir = '.ua/intermediate';
const oldGraph = JSON.parse(fs.readFileSync('.ua/knowledge-graph.json', 'utf8'));
const merged = JSON.parse(fs.readFileSync(`${dir}/assembled-graph.json`, 'utf8'));
const removedIds = new Set(oldGraph.nodes.filter(n => n.filePath === 'src/data/Perkbasedmg.ts').map(n => n.id));
const nodeIds = new Set(merged.nodes.map(n => n.id));
const existing = new Set(merged.edges.map(e => `${e.source}|${e.target}|${e.type}`));
let restored = 0, skipped = 0;
for (const e of oldGraph.edges) {
  if (!removedIds.has(e.source) && !removedIds.has(e.target)) continue;
  if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) { skipped++; continue; }
  const key = `${e.source}|${e.target}|${e.type}`;
  if (existing.has(key)) continue;
  merged.edges.push(e); existing.add(key); restored++;
}
fs.writeFileSync(`${dir}/assembled-graph.json`, JSON.stringify(merged, null, 2));
console.log(`restored=${restored} skipped=${skipped} totalEdges=${merged.edges.length}`);