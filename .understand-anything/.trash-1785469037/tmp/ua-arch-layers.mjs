import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const graph = JSON.parse(
  readFileSync(join(root, ".understand-anything", "intermediate", "assembled-graph.json"), "utf8")
);

const FILE_TYPES = new Set(["file", "config", "document", "service", "pipeline"]);
const nodes = graph.nodes.filter((n) => FILE_TYPES.has(n.type));

const p = (id) => id.startsWith("file:") || id.startsWith("config:") || id.startsWith("document:") || id.startsWith("pipeline:") || id.startsWith("service:");

const dataIds = new Set();
const engineIds = new Set();
const uiIds = new Set();
const configIds = new Set();
const infraIds = new Set();
const docIds = new Set();
const devtoolIds = new Set();
const testIds = new Set();

for (const n of nodes) {
  const id = n.id;
  const fp = (n.filePath || "").replace(/\\/g, "/");
  if (fp.startsWith("src/data/")) { dataIds.add(id); continue; }
  if (fp.startsWith("src/lib/engine/") || fp.startsWith("src/lib/constants/")) { engineIds.add(id); continue; }
  if (fp.startsWith("src/lib/")) {
    if (fp.endsWith(".svelte") || fp.startsWith("src/lib/ui/") || fp.startsWith("src/lib/modals/")
        || fp.startsWith("src/lib/stats/") || fp === "src/lib/stores/toast.ts" || fp === "src/lib/uiConstants.ts") {
      uiIds.add(id);
    } else {
      engineIds.add(id);
    }
    continue;
  }
  if (fp.startsWith("src/")) { uiIds.add(id); continue; }
  if (fp.startsWith("tests/")) { testIds.add(id); continue; }
  if (id === "pipeline:.github/workflows/static.yml" || id === "config:vercel.json") { infraIds.add(id); continue; }
  if (id === "config:package.json" || id === "config:tsconfig.app.json" || id === "config:tsconfig.json"
      || id === "config:tsconfig.node.json" || id === "config:.fallowrc.json" || id === "file:vite.config.ts") {
    configIds.add(id); continue;
  }
  if (id === "document:README.md" || id === "document:AGENTS.md" || id === "document:docs/ONBOARDING.md"
      || id === "document:.slim/deepwork/ui-upgrade.md") { docIds.add(id); continue; }
  devtoolIds.add(id);
}

const layers = [
  {
    id: "layer:data",
    name: "Game Data",
    description: "Raw game definitions and data modules (perks, enchantments, weapon arts, rune/mount/potion damage, item JSON registries) consumed by the calculation engine.",
    nodeIds: [...dataIds],
  },
  {
    id: "layer:engine",
    name: "Calculation Engine",
    description: "Core damage/build computation: engine pipeline modules, game constants, shared types, the build store, and library logic (crit, defense, damage-type resolution, formatting).",
    nodeIds: [...engineIds],
  },
  {
    id: "layer:ui",
    name: "UI Components",
    description: "All Svelte components and their direct helpers (modals, ui primitives, stat filters, toast state, shared UI constants) plus app entry point and global stylesheet.",
    nodeIds: [...uiIds],
  },
  {
    id: "layer:config",
    name: "Configuration",
    description: "Root project configuration: package manifests, TypeScript/tsconfig settings, Vite build config, and tool configuration (.fallowrc).",
    nodeIds: [...configIds],
  },
  {
    id: "layer:infrastructure",
    name: "Infrastructure & CI",
    description: "Deployment and CI configuration: Vercel deployment settings and the GitHub Actions static-site pipeline.",
    nodeIds: [...infraIds],
  },
  {
    id: "layer:documentation",
    name: "Documentation",
    description: "Project guides and working notes: README, agent context, onboarding doc, and the UI refactor planning note.",
    nodeIds: [...docIds],
  },
  {
    id: "layer:dev-tools",
    name: "Dev Tools & Scratch Artifacts",
    description: "Standalone debug/analysis scripts and ad-hoc output artifacts (build decodes, fallow reports, ts-errors, stats visualizer, index.html shell).",
    nodeIds: [...devtoolIds],
  },
  {
    id: "layer:tests",
    name: "Tests",
    description: "Unit tests exercising the damage engine and data modules.",
    nodeIds: [...testIds],
  },
];

const assigned = new Set();
let total = 0;
for (const layer of layers) {
  for (const id of layer.nodeIds) {
    if (!p(id)) throw new Error(`Non-file node id in layers: ${id}`);
    if (assigned.has(id)) throw new Error(`Duplicate assignment: ${id}`);
    assigned.add(id);
  }
  total += layer.nodeIds.length;
}

const all = new Set(nodes.map((n) => n.id));
const missing = [...all].filter((id) => !assigned.has(id));
const extra = [...assigned].filter((id) => !all.has(id));
if (missing.length) throw new Error(`Unassigned nodes: ${missing.join(", ")}`);
if (extra.length) throw new Error(`Invented nodes: ${extra.join(", ")}`);
if (total !== nodes.length) throw new Error(`Count mismatch: ${total} != ${nodes.length}`);

const out = join(root, ".understand-anything", "intermediate", "layers.json");
writeFileSync(out, JSON.stringify(layers, null, 2), "utf8");

console.log(`Verified: ${nodes.length} file-level nodes, ${layers.length} layers, ${total} assigned (0 missing, 0 duplicated).`);
for (const layer of layers) console.log(`  ${layer.id} (${layer.nodeIds.length})`);
