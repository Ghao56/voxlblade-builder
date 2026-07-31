import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const intermediate = join(__dirname, '..', 'intermediate');
const outDir = join(__dirname);
mkdirSync(outDir, { recursive: true });

const graph = JSON.parse(readFileSync(join(intermediate, 'assembled-graph.json'), 'utf8'));
const layers = JSON.parse(readFileSync(join(intermediate, 'layers.json'), 'utf8'));

const nodes = graph.nodes;
const edges = graph.edges;
const nodeSet = new Set(nodes.map((n) => n.id));
const idToNode = new Map(nodes.map((n) => [n.id, n]));

const fileTypes = new Set(['file', 'config', 'document', 'service', 'pipeline']);

function isFileLevel(id) {
  return idToNode.has(id) && fileTypes.has(idToNode.get(id).type);
}

// Edge indices (skip contains/exports which are self-module metadata)
const semanticTypes = new Set(['imports', 'calls', 'depends_on']);
const inEdges = new Map();
const outEdges = new Map();
for (const n of nodes) {
  inEdges.set(n.id, []);
  outEdges.set(n.id, []);
}
for (const e of edges) {
  if (!semanticTypes.has(e.type)) continue;
  if (inEdges.has(e.target)) inEdges.get(e.target).push(e);
  if (outEdges.has(e.source)) outEdges.get(e.source).push(e);
}

// 1. Fan-in ranking (all nodes)
const fanIn = [...nodes]
  .map((n) => ({ id: n.id, type: n.type, name: n.name, count: inEdges.get(n.id).length }))
  .sort((a, b) => b.count - a.count);
const fanInTop = fanIn.slice(0, 30);

// 2. Fan-out ranking (all nodes)
const fanOut = [...nodes]
  .map((n) => ({ id: n.id, type: n.type, name: n.name, count: outEdges.get(n.id).length }))
  .sort((a, b) => b.count - a.count);
const fanOutTop = fanOut.slice(0, 30);

// 3. Entry point candidates
function depthOf(id) {
  const p = id.split(':');
  return p.length > 1 ? p.slice(1).join(':').split('/').length : 0;
}
const entryCandidates = [
  { id: 'file:src/main.ts', score: 3 + depthOf('file:src/main.ts'), note: 'main.ts' },
  { id: 'file:src/App.svelte', score: 1 + depthOf('file:src/App.svelte'), note: 'root component' },
  { id: 'document:README.md', score: 5 + depthOf('document:README.md'), note: 'README at root' },
  { id: 'file:index.html', score: 2 + depthOf('file:index.html'), note: 'html shell' },
  { id: 'document:docs/ONBOARDING.md', score: 2 + depthOf('document:docs/ONBOARDING.md'), note: 'onboarding guide' },
  { id: 'document:AGENTS.md', score: 1 + depthOf('document:AGENTS.md'), note: 'agent context' },
]
  .filter((c) => nodeSet.has(c.id))
  .sort((a, b) => b.score - a.score);

// 4. BFS from main.ts along imports/calls edges (forward)
const entry = 'file:src/main.ts';
const bfsOrder = [];
const levels = new Map();
const queue = [entry];
const visited = new Set([entry]);
levels.set(entry, 0);
while (queue.length) {
  const cur = queue.shift();
  bfsOrder.push(cur);
  const nxt = outEdges.get(cur) || [];
  for (const e of nxt) {
    if (!visited.has(e.target) && e.type === 'imports') {
      visited.add(e.target);
      levels.set(e.target, levels.get(cur) + 1);
      queue.push(e.target);
    }
  }
}
const bfsLevels = [];
for (const [id, lvl] of [...levels.entries()].sort((a, b) => a[1] - b[1])) {
  bfsLevels.push({ level: lvl, id, name: idToNode.get(id).name, type: idToNode.get(id).type });
}

// Also BFS on file-level nodes only, following imports/depends_on
const entry2 = 'file:src/main.ts';
const levels2 = new Map();
const queue2 = [entry2];
const visited2 = new Set([entry2]);
levels2.set(entry2, 0);
const children2 = new Map();
while (queue2.length) {
  const cur = queue2.shift();
  const nxt = outEdges.get(cur) || [];
  for (const e of nxt) {
    const t = e.target;
    if (visited2.has(t)) continue;
    if (!isFileLevel(t)) continue;
    if (!semanticTypes.has(e.type)) continue;
    visited2.add(t);
    levels2.set(t, levels2.get(cur) + 1);
    if (!children2.has(cur)) children2.set(cur, []);
    children2.get(cur).push(t);
    queue2.push(t);
  }
}
const fileBfs = [];
for (const [id, lvl] of [...levels2.entries()].sort((a, b) => a[1] - b[1])) {
  fileBfs.push({ level: lvl, id, name: idToNode.get(id).name, type: idToNode.get(id).type });
}

// 5. Tightly coupled clusters: mutual imports among file-level nodes
function mutualGraph() {
  const m = new Map();
  for (const e of edges) {
    if (e.type !== 'imports') continue;
    const s = e.source;
    const t = e.target;
    if (!isFileLevel(s) || !isFileLevel(t)) continue;
    if (!m.has(s)) m.set(s, new Set());
    if (!m.has(t)) m.set(t, new Set());
    m.get(s).add(t);
    m.get(t).add(s);
  }
  return m;
}
const mg = mutualGraph();
const visitedM = new Set();
const clusters = [];
for (const n of nodes) {
  if (visitedM.has(n.id) || !mg.has(n.id)) continue;
  // BFS component
  const comp = [];
  const q = [n.id];
  visitedM.add(n.id);
  while (q.length) {
    const cur = q.shift();
    comp.push(cur);
    for (const nb of mg.get(cur) || []) {
      if (!visitedM.has(nb)) {
        visitedM.add(nb);
        q.push(nb);
      }
    }
  }
  if (comp.length >= 2) {
    // mutual pair count
    let mutualPairs = 0;
    for (let i = 0; i < comp.length; i++) {
      for (let j = i + 1; j < comp.length; j++) {
        if (mg.get(comp[i]).has(comp[j]) && mg.get(comp[j]).has(comp[i])) mutualPairs++;
      }
    }
    clusters.push({
      size: comp.length,
      mutualPairs,
      ids: comp.sort(),
      names: comp.map((id) => idToNode.get(id).name),
    });
  }
}
clusters.sort((a, b) => b.size - a.size);

// Extra: count incoming file-level edges per file-level node (foundational score)
const fileFanIn = fanIn.filter((f) => isFileLevel(f.id)).slice(0, 40);

const results = {
  graphStats: { nodes: nodes.length, edges: edges.length, fileLevelNodes: nodes.filter((n) => fileTypes.has(n.type)).length },
  fanInTop,
  fanOutTop,
  fileFanInTop: fileFanIn,
  entryCandidates,
  bfsFromMain: bfsOrder.map((id) => ({ level: levels.get(id), id, name: idToNode.get(id).name, type: idToNode.get(id).type })),
  bfsFileLevel: fileBfs,
  clusters,
};

const outPath = join(outDir, 'ua-tour-results.json');
writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log('Wrote', outPath);
console.log('graphStats', JSON.stringify(results.graphStats));
console.log('\n-- Entry candidates --');
for (const c of entryCandidates) console.log(`${c.score}\t${c.id}`);
console.log('\n-- File fan-in top 25 --');
for (const f of fileFanIn.slice(0, 25)) console.log(`${f.count}\t${f.id}`);
console.log('\n-- Fan-out top 15 --');
for (const f of fanOutTop.slice(0, 15)) console.log(`${f.count}\t${f.id}`);
console.log('\n-- BFS levels from main.ts (file-level) --');
for (const f of fileBfs) console.log(`L${f.level}\t${f.id}`);
console.log('\n-- Clusters --');
for (const c of clusters) {
  console.log(`size=${c.size} pairs=${c.mutualPairs}  ${c.names.join(', ')}`);
}
