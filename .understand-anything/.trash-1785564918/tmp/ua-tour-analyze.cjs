const fs = require("fs");

const inputPath = process.argv[2];
const outputPath = process.argv[3];

try {
  const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  let nodes, edges, layers;
  if (raw.fileNodes && raw.edges && raw.layers) {
    nodes = raw.fileNodes;
    edges = raw.edges;
    layers = raw.layers;
  } else {
    nodes = raw.nodes || [];
    edges = raw.edges || [];
    layers = raw.layers || [];
  }

  const byId = new Map();
  for (const n of nodes) {
    byId.set(n.id, n);
  }

  // Validate edges reference known nodes
  const validEdges = edges.filter(
    (e) => byId.has(e.source) && byId.has(e.target)
  );

  // A. Fan-In
  const fanIn = new Map();
  for (const n of nodes) fanIn.set(n.id, 0);
  for (const e of validEdges) fanIn.set(e.target, (fanIn.get(e.target) || 0) + 1);

  const fanInRanking = [...fanIn.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, count]) => ({ id, fanIn: count, name: byId.get(id).name, summary: byId.get(id).summary }));

  // B. Fan-Out
  const fanOut = new Map();
  for (const n of nodes) fanOut.set(n.id, 0);
  for (const e of validEdges) fanOut.set(e.source, (fanOut.get(e.source) || 0) + 1);

  const fanOutRanking = [...fanOut.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, count]) => ({ id, fanOut: count, name: byId.get(id).name, summary: byId.get(id).summary }));

  // C. Entry point candidates
  const ENTRY_NAMES = new Set([
    "index.ts", "index.js", "main.ts", "main.js", "app.ts", "app.js",
    "server.ts", "server.js", "mod.rs", "main.go", "main.py", "main.rs",
    "manage.py", "app.py", "wsgi.py", "asgi.py", "run.py", "__main__.py",
    "Application.java", "Main.java", "Program.cs", "config.ru", "index.php",
    "App.swift", "Application.kt", "main.cpp", "main.c",
  ]);

  const fanOutValues = [...fanOut.values()];
  const fanInValues = [...fanIn.values()];
  fanOutValues.sort((a, b) => b - a);
  fanInValues.sort((a, b) => a - b);

  const highFanOutThreshold = fanOutValues[Math.max(0, Math.floor(fanOutValues.length * 0.1) - 1)] || 0;
  const lowFanInThreshold = fanInValues[Math.max(0, Math.floor(fanInValues.length * 0.25) - 1)] || 0;

  const candidates = [];
  for (const n of nodes) {
    let score = 0;
    if (n.type === "document") {
      if (n.name === "README.md") score += 5;
      else if (n.filePath && n.filePath.endsWith(".md")) score += 2;
    } else if (n.type === "file" || n.type === "config" || n.type === "service") {
      const base = n.name.split(".")[0] + "." + n.name.split(".").slice(1).join(".");
      if (ENTRY_NAMES.has(n.name)) score += 3;
      const depth = (n.filePath || "").split(/[\\/]/).filter(Boolean).length;
      if (depth <= 2) score += 1;
      if ((fanOut.get(n.id) || 0) >= highFanOutThreshold) score += 1;
      if ((fanIn.get(n.id) || 0) <= lowFanInThreshold) score += 1;
    }
    candidates.push({ id: n.id, score, name: n.name, summary: n.summary, type: n.type, filePath: n.filePath });
  }

  candidates.sort((a, b) => b.score - a.score);
  const entryPointCandidates = candidates.slice(0, 5).map((c) => ({
    id: c.id, score: c.score, name: c.name, summary: c.summary, type: c.type, filePath: c.filePath,
  }));

  // D. BFS from top code entry point
  const topCodeEntry = candidates.find(
    (c) => c.type === "file" || c.type === "config"
  );
  const startNode = topCodeEntry ? topCodeEntry.id : (nodes[0] && nodes[0].id);

  const bfsOrder = [];
  const depthMap = {};
  if (startNode) {
    const queue = [{ id: startNode, depth: 0 }];
    const seen = new Set([startNode]);
    while (queue.length) {
      const { id, depth } = queue.shift();
      bfsOrder.push(id);
      depthMap[id] = depth;
      for (const e of validEdges) {
        if (e.source === id && !seen.has(e.target)) {
          seen.add(e.target);
          queue.push({ id: e.target, depth: depth + 1 });
        }
      }
    }
  }

  const byDepth = {};
  for (const [id, d] of Object.entries(depthMap)) {
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(id);
  }

  const bfsTraversal = { startNode, order: bfsOrder, depthMap, byDepth };

  // E. Non-code file inventory
  const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
  for (const n of nodes) {
    const rec = { id: n.id, name: n.name, type: n.type, summary: n.summary, filePath: n.filePath };
    if (n.type === "document") nonCodeFiles.documentation.push(rec);
    else if (["service", "pipeline", "resource"].includes(n.type)) nonCodeFiles.infrastructure.push(rec);
    else if (["table", "schema", "endpoint"].includes(n.type)) nonCodeFiles.data.push(rec);
    else if (n.type === "config") nonCodeFiles.config.push(rec);
  }

  // F. Clusters
  const pairCount = {};
  for (const e of validEdges) {
    const key = [e.source, e.target].sort().join("|");
    pairCount[key] = (pairCount[key] || 0) + 1;
  }

  const clusterEdges = {};
  for (const e of validEdges) {
    if (!clusterEdges[e.source]) clusterEdges[e.source] = new Set();
    clusterEdges[e.source].add(e.target);
    if (!clusterEdges[e.target]) clusterEdges[e.target] = new Set();
    clusterEdges[e.target].add(e.source);
  }

  const clusters = [];
  const used = new Set();
  for (const [key, count] of Object.entries(pairCount)) {
    if (count < 2) continue;
    const [a, b] = key.split("|");
    const members = new Set([a, b]);
    // expand
    let changed = true;
    while (changed && members.size < 5) {
      changed = false;
      for (const m of [...members]) {
        for (const nb of clusterEdges[m] || []) {
          if (members.has(nb)) continue;
          let connects = 0;
          for (const m2 of members) {
            if ((clusterEdges[nb] || new Set()).has(m2)) connects++;
          }
          if (connects >= 2 && members.size < 5) {
            members.add(nb);
            changed = true;
          }
        }
      }
    }
    const list = [...members];
    const key2 = [...members].sort().join("|");
    if (used.has(key2)) continue;
    let edgeCount = 0;
    for (const e of validEdges) {
      if (members.has(e.source) && members.has(e.target)) edgeCount++;
    }
    used.add(key2);
    clusters.push({ nodes: list, edgeCount });
  }

  clusters.sort((a, b) => b.edgeCount - a.edgeCount);
  const topClusters = clusters.slice(0, 10);

  // G. Layers
  const layerList = {
    count: layers.length,
    list: layers.map((l) => ({ id: l.id, name: l.name, description: l.description })),
  };

  // H. Node summary index
  const nodeSummaryIndex = {};
  for (const n of nodes) {
    nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary, filePath: n.filePath };
  }

  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal,
    nonCodeFiles,
    clusters: topClusters,
    layers: layerList,
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: validEdges.length,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
  process.exit(0);
} catch (err) {
  console.error(err.stack || err.message);
  process.exit(1);
}
