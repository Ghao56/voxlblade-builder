import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const graph = JSON.parse(
  readFileSync(join(root, ".understand-anything", "intermediate", "assembled-graph.json"), "utf8")
);

const FILE_TYPES = new Set(["file", "config", "document", "service", "pipeline"]);

const nodes = graph.nodes.filter((n) => FILE_TYPES.has(n.type));
const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

const groupOf = (node) => {
  const fp = node.filePath || (node.name && node.id.includes("/") ? node.id.split(":")[1] : node.name) || node.name || "";
  const clean = fp.replace(/\\/g, "/");
  const lower = clean.toLowerCase();
  if (lower.startsWith(".github/")) return "root/.github-workflows";
  if (clean.startsWith(".slim/")) return "root/.slim";
  if (clean.startsWith("docs/")) return "root/docs";
  if (clean.startsWith("tests/")) return "tests";
  if (clean.startsWith("src/data/")) return "src/data";
  if (clean.startsWith("src/lib/ui/")) return "src/lib/ui";
  if (clean.startsWith("src/lib/constants/")) return "src/lib/constants";
  if (clean.startsWith("src/lib/engine/")) return "src/lib/engine";
  if (clean.startsWith("src/lib/stores/")) return "src/lib/stores";
  if (clean.startsWith("src/lib/stats/")) return "src/lib/stats";
  if (clean.startsWith("src/lib/modals/")) return "src/lib/modals";
  if (clean.startsWith("src/lib/")) return "src/lib";
  if (clean.startsWith("src/")) return "src/root";
  return "root/scratch";
};

const topDirOf = (clean) => {
  const lower = clean.toLowerCase();
  if (lower.startsWith(".github/")) return "infra";
  if (clean.startsWith(".slim/")) return "notes";
  if (clean.startsWith("docs/")) return "docs";
  if (clean.startsWith("tests/")) return "tests";
  if (clean.startsWith("src/")) return "src";
  if (clean.startsWith("config")) return "config";
  return "root";
};

const nodeGroup = new Map();
for (const n of nodes) nodeGroup.set(n.id, groupOf(n));

const groups = [...new Set(nodes.map((n) => nodeGroup.get(n.id)))].sort();

const result = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalFileLevelNodes: nodes.length,
    nodeTypes: {},
    directoryGroups: {},
  },
  nodeTypeGrouping: {},
  directoryGrouping: {},
  importAdjacency: {},
  dependencyDirection: {},
  crossCategoryEdges: {},
};

for (const n of nodes) {
  result.summary.nodeTypes[n.type] = (result.summary.nodeTypes[n.type] || 0) + 1;
}

for (const g of groups) {
  result.summary.directoryGroups[g] = nodes.filter((n) => nodeGroup.get(n.id) === g).length;
}

for (const g of groups) {
  const members = nodes.filter((n) => nodeGroup.get(n.id) === g);
  result.directoryGrouping[g] = members.map((n) => n.id);
  result.nodeTypeGrouping[g] = {};
  for (const m of members) {
    result.nodeTypeGrouping[g][m.type] = (result.nodeTypeGrouping[g][m.type] || 0) + 1;
  }
}

const groupIdx = new Map(groups.map((g, i) => [g, i]));
const fanIn = Object.fromEntries(groups.map((g) => [g, new Set()]));
const fanOut = Object.fromEntries(groups.map((g) => [g, new Set()]));
const pairCount = Object.fromEntries(groups.map((g) => [g, Object.fromEntries(groups.map((h) => [h, { edges: 0, forward: 0, reverse: 0 }]))]));

for (const e of graph.edges) {
  const s = nodeById.get(e.source);
  const t = nodeById.get(e.target);
  if (!s || !t) continue;
  const sIsFile = FILE_TYPES.has(s.type);
  const tIsFile = FILE_TYPES.has(t.type);
  if (e.type !== "imports") continue;
  if (!sIsFile || !tIsFile) continue;
  const sg = nodeGroup.get(s.id);
  const tg = nodeGroup.get(t.id);
  if (sg === tg) continue;
  fanOut[sg].add(tg);
  fanIn[tg].add(sg);
  const rec = pairCount[sg][tg];
  rec.edges += 1;
  if (e.direction === "forward") rec.forward += 1;
  else if (e.direction === "reverse") rec.reverse += 1;
}

result.importAdjacency = {};
for (const g of groups) {
  result.importAdjacency[g] = {
    fanIn: [...fanIn[g]].sort(),
    fanOut: [...fanOut[g]].sort(),
  };
}

result.dependencyDirection = {};
for (const g of groups) {
  for (const h of groups) {
    const rec = pairCount[g][h];
    if (rec.edges === 0) continue;
    const fwd = rec.forward / rec.edges;
    const dir = fwd > 0.66 ? `${g} -> ${h}` : fwd < 0.34 ? `${h} -> ${g}` : `${g} <-> ${h} (mixed)`;
    result.dependencyDirection[`${g}|${h}`] = {
      pair: [g, h],
      edges: rec.edges,
      forwardEdges: rec.forward,
      dominantDirection: dir,
    };
  }
}

result.crossCategoryEdges = {};
for (const e of graph.edges) {
  const s = nodeById.get(e.source);
  const t = nodeById.get(e.target);
  if (!s || !t) continue;
  if (e.type === "imports") continue;
  if (e.type === "contains" || e.type === "calls" || e.type === "exports") continue;
  const key = `${s.type}->${t.type} (${e.type})`;
  result.crossCategoryEdges[key] = (result.crossCategoryEdges[key] || 0) + 1;
}

result.crossCategoryEdges.detail = {};
for (const e of graph.edges) {
  const s = nodeById.get(e.source);
  const t = nodeById.get(e.target);
  if (!s || !t) continue;
  if (!["configures", "documents", "depends_on", "serves", "tested_by", "related"].includes(e.type)) continue;
  result.crossCategoryEdges.detail[e.type] = result.crossCategoryEdges.detail[e.type] || [];
  result.crossCategoryEdges.detail[e.type].push(`${s.id} -> ${t.id}`);
}

const out = join(root, ".understand-anything", "tmp", "ua-arch-results.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 2), "utf8");

console.log("Total file-level nodes:", nodes.length);
console.log("\nDirectory groups and sizes:");
for (const [g, size] of Object.entries(result.summary.directoryGroups)) {
  console.log(`  ${g}: ${size}`);
}
console.log("\nImport adjacency:");
for (const [g, adj] of Object.entries(result.importAdjacency)) {
  console.log(`  ${g}:`);
  console.log(`    fans in : ${adj.fanIn.length ? adj.fanIn.join(", ") : "(none)"}`);
  console.log(`    fans out: ${adj.fanOut.length ? adj.fanOut.join(", ") : "(none)"}`);
}
console.log("\nWrote:", out);
