'use strict';
const fs = require('fs');

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error('Usage: node ua-tour-analyze.js <input.json> <output.json>');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const nodes = raw.nodes || [];
  const edges = raw.edges || [];
  const layers = raw.layers || [];

  const idSet = new Set(nodes.map((n) => n.id));
  const nameById = new Map(nodes.map((n) => [n.id, n.name]));
  const summaryById = new Map(nodes.map((n) => [n.id, n.summary || '']));
  const typeById = new Map(nodes.map((n) => [n.id, n.type]));

  const fanIn = new Map();
  const fanOut = new Map();
  for (const n of nodes) {
    fanIn.set(n.id, 0);
    fanOut.set(n.id, 0);
  }
  for (const e of edges) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      fanIn.set(e.target, (fanIn.get(e.target) || 0) + 1);
      fanOut.set(e.source, (fanOut.get(e.source) || 0) + 1);
    }
  }

  const fanInRanking = [...fanIn.entries()]
    .map(([id, v]) => ({ id, fanIn: v, name: nameById.get(id) }))
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 20);

  const fanOutRanking = [...fanOut.entries()]
    .map(([id, v]) => ({ id, fanOut: v, name: nameById.get(id) }))
    .sort((a, b) => b.fanOut - a.fanOut)
    .slice(0, 20);

  const ENTRY_FILENAMES = new Set([
    'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js',
    'server.ts', 'server.js', 'mod.rs', 'main.go', 'main.py', 'main.rs',
    'manage.py', 'app.py', 'wsgi.py', 'asgi.py', 'run.py', '__main__.py',
    'Application.java', 'Main.java', 'Program.cs', 'config.ru', 'index.php',
    'App.swift', 'Application.kt', 'main.cpp', 'main.c',
  ]);

  const fanOutValues = [...fanOut.values()].sort((a, b) => a - b);
  const p90Index = Math.max(0, Math.floor(fanOutValues.length * 0.9) - 1);
  const p90Threshold = fanOutValues.length ? fanOutValues[p90Index] : 0;
  const fanInValues = [...fanIn.values()].sort((a, b) => a - b);
  const p25Index = Math.max(0, Math.floor(fanInValues.length * 0.25) - 1);
  const p25Threshold = fanInValues.length ? fanInValues[p25Index] : 0;

  const entryCandidates = nodes.map((n) => {
    let score = 0;
    if (n.type === 'document') {
      if (n.filePath === 'README.md') score += 5;
      else if (/\.md$/.test(n.filePath || '') && n.filePath && !n.filePath.includes('/')) score += 2;
      return { id: n.id, score, name: n.name, summary: n.summary };
    }
    if (n.type === 'file' || n.type === 'entry') {
      const base = (n.name || '').split('/').pop();
      if (ENTRY_FILENAMES.has(base)) score += 3;
      const depth = (n.filePath || '').split('/').filter(Boolean).length;
      if (depth <= 2) score += 1;
      if ((fanOut.get(n.id) || 0) >= p90Threshold) score += 1;
      if ((fanIn.get(n.id) || 0) <= p25Threshold) score += 1;
    }
    return { id: n.id, score, name: n.name, summary: n.summary };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  const codeEntry = entryCandidates.find((c) => {
    const t = typeById.get(c.id);
    return t === 'file' || t === 'entry';
  });

  const bfsTraversal = { startNode: null, order: [], depthMap: {}, byDepth: {} };
  if (codeEntry) {
    const start = codeEntry.id;
    const queue = [[start, 0]];
    const visited = new Set();
    while (queue.length) {
      const [node, depth] = queue.shift();
      if (visited.has(node)) continue;
      visited.add(node);
      bfsTraversal.order.push(node);
      bfsTraversal.depthMap[node] = depth;
      if (!bfsTraversal.byDepth[depth]) bfsTraversal.byDepth[depth] = [];
      bfsTraversal.byDepth[depth].push(node);
      for (const e of edges) {
        if (e.source === node && (e.type === 'imports' || e.type === 'calls') && !visited.has(e.target)) {
          queue.push([e.target, depth + 1]);
        }
      }
    }
    bfsTraversal.startNode = start;
  }

  const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
  for (const n of nodes) {
    const entry = { id: n.id, name: n.name, type: n.type, summary: n.summary };
    if (n.type === 'document') nonCodeFiles.documentation.push(entry);
    else if (n.type === 'service' || n.type === 'pipeline' || n.type === 'resource') nonCodeFiles.infrastructure.push(entry);
    else if (n.type === 'table' || n.type === 'schema' || n.type === 'endpoint') nonCodeFiles.data.push(entry);
    else if (n.type === 'config') nonCodeFiles.config.push(entry);
  }

  const adjIn = new Map();
  const adjOut = new Map();
  for (const n of nodes) {
    adjIn.set(n.id, []);
    adjOut.set(n.id, []);
  }
  for (const e of edges) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      adjOut.get(e.source).push(e.target);
      adjIn.get(e.target).push(e.source);
    }
  }

  const bidirectionalPairs = new Set();
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    if (e.direction === 'bidirectional') {
      bidirectionalPairs.add([e.source, e.target].sort().join('|'));
    } else if (adjOut.get(e.target).includes(e.source)) {
      bidirectionalPairs.add([e.source, e.target].sort().join('|'));
    }
  }

  const clusters = [];
  const used = new Set();
  for (const pairKey of bidirectionalPairs) {
    const [a, b] = pairKey.split('|');
    if (used.has(a) || used.has(b)) continue;
    const cluster = new Set([a, b]);
    let changed = true;
    while (changed && cluster.size < 5) {
      changed = false;
      for (const n of nodes) {
        if (cluster.has(n.id)) continue;
        let connections = 0;
        for (const m of cluster) {
          if (adjOut.get(n.id).includes(m) || adjOut.get(m).includes(n.id)) connections++;
        }
        if (connections >= 2) {
          cluster.add(n.id);
          changed = true;
          if (cluster.size >= 5) break;
        }
      }
    }
    if (cluster.size >= 2) {
      const arr = [...cluster];
      for (const x of arr) used.add(x);
      let edgeCount = 0;
      for (const e of edges) {
        if (arr.includes(e.source) && arr.includes(e.target)) edgeCount++;
      }
      clusters.push({ nodes: arr, edgeCount });
    }
  }
  clusters.sort((a, b) => b.edgeCount - a.edgeCount).slice(0, 10);

  const nodeSummaryIndex = {};
  for (const n of nodes) {
    nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary };
  }

  const result = {
    scriptCompleted: true,
    entryPointCandidates: entryCandidates,
    fanInRanking: fanInRanking,
    fanOutRanking: fanOutRanking,
    bfsTraversal: bfsTraversal,
    nonCodeFiles: nonCodeFiles,
    clusters: clusters,
    layers: { count: layers.length, list: layers },
    nodeSummaryIndex: nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
