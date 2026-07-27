const fs = require('fs');
const inputFile = process.argv[2];
const outputFile = process.argv[3];

const graph = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const { nodes, edges } = graph;

// Build adjacency maps
const fanIn = {};  // node -> count of edges pointing TO it
const fanOut = {}; // node -> count of edges pointing FROM it
const edgesByType = {};

nodes.forEach(n => { fanIn[n.id] = 0; fanOut[n.id] = 0; });

edges.forEach(e => {
  fanIn[e.target] = (fanIn[e.target] || 0) + 1;
  fanOut[e.source] = (fanOut[e.source] || 0) + 1;
  if (!edgesByType[e.type]) edgesByType[e.type] = [];
  edgesByType[e.type].push(e);
});

// A. Fan-In Ranking
const fanInRanking = nodes
  .filter(n => fanIn[n.id] > 0)
  .map(n => ({ id: n.id, fanIn: fanIn[n.id], name: n.name || n.label || '' }))
  .sort((a, b) => b.fanIn - a.fanIn)
  .slice(0, 20);

// B. Fan-Out Ranking
const fanOutRanking = nodes
  .filter(n => fanOut[n.id] > 0)
  .map(n => ({ id: n.id, fanOut: fanOut[n.id], name: n.name || n.label || '' }))
  .sort((a, b) => b.fanOut - a.fanOut)
  .slice(0, 20);

// C. Entry Point Candidates
const entryPatterns = ['index.ts','index.js','main.ts','main.js','app.ts','app.js','server.ts','server.js','App.svelte'];
const docPatterns = ['README.md'];
const codeNodes = nodes.filter(n => n.type === 'file');
const docNodes = nodes.filter(n => n.type === 'document');
const configNodes = nodes.filter(n => n.type === 'config');
const schemaNodes = nodes.filter(n => n.type === 'schema');
const pipelineNodes = nodes.filter(n => n.type === 'pipeline');

const maxFanOut = Math.max(...nodes.map(n => fanOut[n.id] || 0));
const sortedFanIns = nodes.map(n => fanIn[n.id] || 0).sort((a, b) => a - b);
const p25FanIn = sortedFanIns[Math.floor(sortedFanIns.length * 0.25)];

const entryCandidates = [];
codeNodes.forEach(n => {
  let score = 0;
  const name = n.name || n.label || '';
  const fp = n.filePath || '';
  if (entryPatterns.some(p => name === p || fp.endsWith('/' + p))) score += 3;
  if (!fp.includes('/') || fp.split('/').length <= 2) score += 1;
  if ((fanOut[n.id] || 0) >= maxFanOut * 0.9) score += 1;
  if ((fanIn[n.id] || 0) <= p25FanIn) score += 1;
  if (score > 0) entryCandidates.push({ id: n.id, score, name, summary: n.summary || '' });
});

docNodes.forEach(n => {
  let score = 0;
  const fp = n.filePath || '';
  if (fp === 'README.md') score += 5;
  else if (fp.endsWith('.md')) score += 2;
  if (score > 0) entryCandidates.push({ id: n.id, score, name: n.name || n.label || '', summary: n.summary || '' });
});

entryCandidates.sort((a, b) => b.score - a.score);

// D. BFS from top code entry point
const topCodeEntry = entryCandidates.find(c => c.id.startsWith('file:')) || entryCandidates[0];
const bfsStart = topCodeEntry ? topCodeEntry.id : null;

const bfsTraversal = { startNode: bfsStart, order: [], depthMap: {}, byDepth: {} };

if (bfsStart) {
  const importEdges = edges.filter(e => e.type === 'imports' || e.type === 'calls');
  const queue = [{ id: bfsStart, depth: 0 }];
  const visited = new Set([bfsStart]);

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    bfsTraversal.order.push(id);
    bfsTraversal.depthMap[id] = depth;
    if (!bfsTraversal.byDepth[depth]) bfsTraversal.byDepth[depth] = [];
    bfsTraversal.byDepth[depth].push(id);

    const outEdges = importEdges.filter(e => e.source === id);
    for (const e of outEdges) {
      if (!visited.has(e.target) && nodes.find(n => n.id === e.target)) {
        visited.add(e.target);
        queue.push({ id: e.target, depth: depth + 1 });
      }
    }
  }
}

// E. Non-Code File Inventory
const nonCodeFiles = {
  documentation: docNodes.map(n => ({ id: n.id, name: n.name || n.label || '', summary: n.summary || '' })),
  infrastructure: pipelineNodes.map(n => ({ id: n.id, name: n.name || n.label || '', summary: n.summary || '' })),
  data: schemaNodes.map(n => ({ id: n.id, name: n.name || n.label || '', summary: n.summary || '' })),
  config: configNodes.map(n => ({ id: n.id, name: n.name || n.label || '', summary: n.summary || '' }))
};

// F. Tightly Coupled Clusters
const bidirectional = new Set();
const edgePairs = edges.map(e => `${e.source}|||${e.target}`);
const clusters = [];

edges.forEach(e => {
  if (edgePairs.includes(`${e.target}|||${e.source}`)) {
    bidirectional.add(`${e.source}-${e.target}`);
  }
});

const clusterGraph = {};
edges.forEach(e => {
  if (e.type === 'imports' || e.type === 'calls' || e.type === 'depends_on') {
    if (!clusterGraph[e.source]) clusterGraph[e.source] = new Set();
    if (!clusterGraph[e.target]) clusterGraph[e.target] = new Set();
    clusterGraph[e.source].add(e.target);
    clusterGraph[e.target].add(e.source);
  }
});

const clusterVisited = new Set();
for (const pair of bidirectional) {
  const [a, b] = pair.split('-');
  if (clusterVisited.has(a) || clusterVisited.has(b)) continue;
  
  const cluster = [a, b];
  const clusterSet = new Set([a, b]);
  let edgeCount = 0;
  edges.forEach(e => {
    if (clusterSet.has(e.source) && clusterSet.has(e.target)) edgeCount++;
  });

  let changed = true;
  while (changed && cluster.length < 5) {
    changed = false;
    for (const [nodeId, neighbors] of Object.entries(clusterGraph)) {
      if (clusterSet.has(nodeId)) continue;
      const connCount = [...neighbors].filter(n => clusterSet.has(n)).length;
      if (connCount >= 2 && cluster.length < 5) {
        cluster.push(nodeId);
        clusterSet.add(nodeId);
        changed = true;
      }
    }
  }

  cluster.forEach(c => clusterVisited.add(c));
  if (cluster.length >= 2) {
    edges.forEach(e => {
      if (clusterSet.has(e.source) && clusterSet.has(e.target)) edgeCount++;
    });
    clusters.push({ nodes: cluster, edgeCount });
  }
}
clusters.sort((a, b) => b.edgeCount - a.edgeCount);

// G. Layers
const layers = graph.layers || [];
const layersInfo = { count: layers.length, list: layers };

// H. Node Summary Index
const nodeSummaryIndex = {};
nodes.forEach(n => {
  nodeSummaryIndex[n.id] = { name: n.name || n.label || '', type: n.type, summary: n.summary || '' };
});

// Output
const result = {
  scriptCompleted: true,
  entryPointCandidates: entryCandidates,
  fanInRanking,
  fanOutRanking,
  bfsTraversal,
  nonCodeFiles,
  clusters: clusters.slice(0, 10),
  layers: layersInfo,
  nodeSummaryIndex,
  totalNodes: nodes.length,
  totalEdges: edges.length
};

fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
console.log('Analysis complete. Output:', outputFile);
console.log('Entry candidates:', entryCandidates.length);
console.log('Top code entry:', topCodeEntry ? topCodeEntry.id : 'none');
console.log('BFS depth levels:', Object.keys(bfsTraversal.byDepth).length);
console.log('Clusters found:', clusters.length);
