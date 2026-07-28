const fs = require('fs');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: node ua-tour-analyze.js <input.json> <output.json>');
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
const { nodes, edges } = input;
const layers = Array.isArray(input.layers) ? input.layers : (input.layers && input.layers.value ? input.layers.value : []);

// Build adjacency maps
const fanIn = {};   // node -> count of edges pointing TO it
const fanOut = {};  // node -> count of edges pointing FROM it
const outEdges = {}; // node -> [target nodes] (imports/calls only)
const inEdges = {};  // node -> [source nodes]

nodes.forEach(n => {
  fanIn[n.id] = 0;
  fanOut[n.id] = 0;
  outEdges[n.id] = [];
  inEdges[n.id] = [];
});

// Only count import/calls/depends_on edges for fan-in/fan-out
const importEdgeTypes = new Set(['imports', 'calls', 'depends_on', 'import']);

edges.forEach(e => {
  if (!fanIn[e.target]) fanIn[e.target] = 0;
  if (!fanOut[e.source]) fanOut[e.source] = 0;
  if (!outEdges[e.source]) outEdges[e.source] = [];
  if (!inEdges[e.target]) inEdges[e.target] = [];

  fanIn[e.target] = (fanIn[e.target] || 0) + 1;
  fanOut[e.source] = (fanOut[e.source] || 0) + 1;
  outEdges[e.source].push(e.target);
  inEdges[e.target].push(e.source);
});

// A. Fan-In Ranking (top 20)
const fanInRanking = Object.entries(fanIn)
  .map(([id, count]) => ({
    id,
    fanIn: count,
    name: (nodes.find(n => n.id === id) || {}).name || id
  }))
  .sort((a, b) => b.fanIn - a.fanIn)
  .slice(0, 20);

// B. Fan-Out Ranking (top 20)
const fanOutRanking = Object.entries(fanOut)
  .map(([id, count]) => ({
    id,
    fanOut: count,
    name: (nodes.find(n => n.id === id) || {}).name || id
  }))
  .sort((a, b) => b.fanOut - a.fanOut)
  .slice(0, 20);

// C. Entry Point Candidates
const codeEntryPatterns = ['index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js', 'main.py', 'main.go', 'main.rs', 'manage.py', 'app.py', 'run.py', '__main__.py', 'vite.config.ts'];
const totalNodes = nodes.length;
const fanOutValues = Object.values(fanOut);
const fanInValues = Object.values(fanIn);
const fanOutThreshold = fanOutValues.sort((a, b) => b - a)[Math.floor(totalNodes * 0.1)] || 0;
const fanInValuesSorted = [...fanInValues].sort((a, b) => a - b);
const fanInLowThreshold = fanInValuesSorted[Math.floor(totalNodes * 0.25)] || 0;

const entryCandidates = nodes.filter(n => n.type === 'file' || n.type === 'document').map(n => {
  let score = 0;
  const name = n.name || n.id.split('/').pop();
  const filePath = n.filePath || '';

  if (n.type === 'document' && (name === 'README.md' || filePath === 'README.md') && !filePath.includes('/')) {
    score += 5;
  } else if (n.type === 'document' && name.endsWith('.md') && !filePath.includes('/')) {
    score += 2;
  }

  if (n.type === 'file') {
    for (const pattern of codeEntryPatterns) {
      if (name === pattern || filePath.endsWith('/' + pattern) || filePath === pattern) {
        score += 3;
        break;
      }
    }
    // Check if at project root or one level deep
    const pathParts = filePath.split('/').filter(Boolean);
    if (pathParts.length <= 2) score += 1;

    // High fan-out
    if ((fanOut[n.id] || 0) >= fanOutThreshold) score += 1;

    // Low fan-in
    if ((fanIn[n.id] || 0) <= fanInLowThreshold) score += 1;
  }

  return { id: n.id, score, name, summary: n.summary || '' };
}).sort((a, b) => b.score - a.score).slice(0, 5);

// D. Dependency Chains (BFS from top code entry point)
const topCodeEntry = entryCandidates.find(c => c.id.startsWith('file:'));
const bfsStart = topCodeEntry ? topCodeEntry.id : 'file:src/main.ts';

const bfsTraversal = { startNode: bfsStart, order: [], depthMap: {}, byDepth: {} };
const visited = new Set();
const queue = [{ id: bfsStart, depth: 0 }];

while (queue.length > 0) {
  const { id, depth } = queue.shift();
  if (visited.has(id)) continue;
  visited.add(id);
  bfsTraversal.order.push(id);
  bfsTraversal.depthMap[id] = depth;
  if (!bfsTraversal.byDepth[depth]) bfsTraversal.byDepth[depth] = [];
  bfsTraversal.byDepth[depth].push(id);

  const targets = outEdges[id] || [];
  for (const target of targets) {
    if (!visited.has(target)) {
      queue.push({ id: target, depth: depth + 1 });
    }
  }
}

// E. Non-Code File Inventory
const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
nodes.forEach(n => {
  if (n.type === 'document') {
    nonCodeFiles.documentation.push({ id: n.id, name: n.name || n.id, summary: n.summary || '' });
  } else if (n.type === 'service' || n.type === 'pipeline' || n.type === 'resource') {
    nonCodeFiles.infrastructure.push({ id: n.id, name: n.name || n.id, summary: n.summary || '' });
  } else if (n.type === 'table' || n.type === 'schema' || n.type === 'endpoint') {
    nonCodeFiles.data.push({ id: n.id, name: n.name || n.id, summary: n.summary || '' });
  } else if (n.type === 'config') {
    nonCodeFiles.config.push({ id: n.id, name: n.name || n.id, summary: n.summary || '' });
  }
});

// F. Tightly Coupled Clusters
// Find bidirectional edges (A->B and B->A on import/calls)
const bidirectional = new Map();
edges.forEach(e => {
  if (importEdgeTypes.has(e.type)) {
    const reverse = edges.find(e2 => e2.source === e.target && e2.target === e.source && importEdgeTypes.has(e2.type));
    if (reverse) {
      const key = [e.source, e.target].sort().join('|||');
      if (!bidirectional.has(key)) {
        bidirectional.set(key, new Set([e.source, e.target]));
      }
    }
  }
});

// Also add file->function contains relationships
const containsEdges = edges.filter(e => e.type === 'contains');
const fileFunctionGroups = {};
containsEdges.forEach(e => {
  if (!fileFunctionGroups[e.source]) fileFunctionGroups[e.source] = new Set();
  fileFunctionGroups[e.source].add(e.target);
});

// Build clusters from bidirectional edges, then expand
const clusterSets = [];
bidirectional.forEach((members) => {
  const existing = clusterSets.find(cs => [...members].some(m => cs.has(m)));
  if (existing) {
    members.forEach(m => existing.add(m));
  } else {
    clusterSets.push(new Set(members));
  }
});

// Add file-function groups as clusters too (pick top ones by size)
Object.entries(fileFunctionGroups).forEach(([file, funcs]) => {
  if (funcs.size >= 2) {
    const cluster = new Set([file, ...funcs]);
    clusterSets.push(cluster);
  }
});

// Score clusters by edge count between members
const clusters = clusterSets
  .map(cs => {
    const memberArr = [...cs];
    let edgeCount = 0;
    for (let i = 0; i < memberArr.length; i++) {
      for (let j = 0; j < memberArr.length; j++) {
        if (i !== j) {
          edgeCount += edges.filter(e =>
            (e.source === memberArr[i] && e.target === memberArr[j]) ||
            (e.source === memberArr[j] && e.target === memberArr[i])
          ).length;
        }
      }
    }
    return { nodes: memberArr.slice(0, 5), edgeCount };
  })
  .filter(c => c.nodes.length >= 2)
  .sort((a, b) => b.edgeCount - a.edgeCount)
  .slice(0, 10);

// G. Layer List
const layerList = layers.map(l => ({ id: l.id, name: l.name, description: l.description }));

// H. Node Summary Index
const nodeSummaryIndex = {};
nodes.forEach(n => {
  nodeSummaryIndex[n.id] = {
    name: n.name || n.id,
    type: n.type,
    summary: n.summary || ''
  };
});

const result = {
  scriptCompleted: true,
  entryPointCandidates: entryCandidates,
  fanInRanking,
  fanOutRanking,
  bfsTraversal,
  nonCodeFiles,
  clusters,
  layers: { count: layers.length, list: layerList },
  nodeSummaryIndex,
  totalNodes: nodes.length,
  totalEdges: edges.length
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log('Analysis complete. Output written to', outputPath);
console.log('Total nodes:', nodes.length, 'Total edges:', edges.length);
