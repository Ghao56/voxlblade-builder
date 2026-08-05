const fs = require("fs");

const inputPath = process.argv[2];
const outputPath = process.argv[3];

try {
  const graph = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const allNodes = graph.nodes;
  const allEdges = graph.edges;

  const isFileLevel = (id) => (id.match(/:/g) || []).length === 1;
  const fileNodes = allNodes.filter((n) => isFileLevel(n.id));

  const fileLevelIds = new Set(fileNodes.map((n) => n.id));
  const fileEdges = allEdges.filter(
    (e) => fileLevelIds.has(e.source) && fileLevelIds.has(e.target)
  );

  const importEdges = fileEdges.filter((e) => e.type === "imports");

  // --- A. Directory grouping ---
  const paths = fileNodes.map((n) => n.filePath);
  const normalize = (p) => p.replace(/\\/g, "/");
  const normalized = paths.map(normalize);

  const splitPath = (p) => p.split("/").filter((s) => s.length > 0);

  function commonPrefix(arr) {
    if (!arr.length) return "";
    let prefix = arr[0];
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i];
      let j = 0;
      while (j < prefix.length && j < a.length && prefix[j] === a[j]) j++;
      prefix = prefix.slice(0, j);
      if (!prefix) break;
    }
    return prefix.slice(0, prefix.lastIndexOf("/") + 1);
  }

  const prefix = commonPrefix(normalized);
  const groups = {};
  const groupOf = {};

  for (const n of fileNodes) {
    const p = normalize(n.filePath);
    const rel = prefix ? p.slice(prefix.length) : p;
    const parts = splitPath(rel);
    let group = "root";
    if (parts.length > 1) group = parts[0];
    else if (parts.length === 1) group = "root";
    (groups[group] = groups[group] || []).push(n.id);
    groupOf[n.id] = group;
  }

  // --- B. Node type grouping ---
  const nodeTypeGroups = {};
  for (const n of fileNodes) {
    (nodeTypeGroups[n.type] = nodeTypeGroups[n.type] || []).push(n.id);
  }

  // --- C. Import adjacency ---
  const fanOut = {};
  const fanIn = {};
  for (const n of fileNodes) {
    fanOut[n.id] = 0;
    fanIn[n.id] = 0;
  }
  for (const e of importEdges) {
    fanOut[e.source] = (fanOut[e.source] || 0) + 1;
    fanIn[e.target] = (fanIn[e.target] || 0) + 1;
  }

  // --- D. Cross-category dependency ---
  const typeOf = {};
  for (const n of fileNodes) typeOf[n.id] = n.type;
  const crossCategoryEdges = [];
  const ccMap = {};
  for (const e of fileEdges) {
    const from = typeOf[e.source];
    const to = typeOf[e.target];
    if (!from || !to) continue;
    const key = from + "->" + to + "|" + e.type;
    ccMap[key] = ccMap[key] || { fromType: from, toType: to, edgeType: e.type, count: 0 };
    ccMap[key].count++;
  }
  for (const k in ccMap) crossCategoryEdges.push(ccMap[k]);
  crossCategoryEdges.sort((a, b) => b.count - a.count);

  // --- E. Inter-group import frequency ---
  const igMap = {};
  for (const e of importEdges) {
    const from = groupOf[e.source];
    const to = groupOf[e.target];
    if (!from || !to || from === to) continue;
    const key = from + "->" + to;
    igMap[key] = igMap[key] || { from, to, count: 0 };
    igMap[key].count++;
  }
  const interGroupImports = Object.values(igMap).sort((a, b) => b.count - a.count);

  // --- F. Intra-group density ---
  const intraGroupDensity = {};
  for (const g in groups) {
    const members = new Set(groups[g]);
    let internal = 0;
    let total = 0;
    for (const e of importEdges) {
      if (members.has(e.source) || members.has(e.target)) {
        total++;
        if (members.has(e.source) && members.has(e.target)) internal++;
      }
    }
    intraGroupDensity[g] = {
      internalEdges: internal,
      totalEdges: total,
      density: total ? +(internal / total).toFixed(2) : 0,
    };
  }

  // --- G. Pattern matching ---
  const dirPatterns = {
    routes: "api", api: "api", controllers: "api", endpoints: "api", handlers: "api",
    services: "service", core: "service", lib: "service", domain: "service", logic: "service",
    models: "data", db: "data", data: "data", persistence: "data", repository: "data", entities: "data",
    components: "ui", views: "ui", pages: "ui", ui: "ui", layouts: "ui", screens: "ui",
    middleware: "middleware", plugins: "middleware", interceptors: "middleware", guards: "middleware",
    utils: "utility", helpers: "utility", common: "utility", shared: "utility", tools: "utility",
    config: "config", constants: "config", env: "config", settings: "config",
    __tests__: "test", test: "test", tests: "test", spec: "test", specs: "test",
    types: "types", interfaces: "types", schemas: "types", contracts: "types", dtos: "types",
    hooks: "hooks", store: "state", state: "state", reducers: "state", actions: "state", slices: "state",
    assets: "assets", static: "assets", public: "assets", migrations: "data",
    docs: "documentation", documentation: "documentation", wiki: "documentation",
    deploy: "infrastructure", deployment: "infrastructure", infra: "infrastructure", infrastructure: "infrastructure",
    ".github": "ci-cd", ".gitlab": "ci-cd", ".circleci": "ci-cd",
    k8s: "infrastructure", kubernetes: "infrastructure", helm: "infrastructure", charts: "infrastructure",
    terraform: "infrastructure", tf: "infrastructure", docker: "infrastructure",
    sql: "data", database: "data", schema: "data",
    engine: "service", stats: "service", stores: "state", modals: "ui", constants: "config",
  };
  const patternMatches = {};
  for (const g in groups) {
    patternMatches[g] = dirPatterns[g.toLowerCase()] || null;
  }

  // File-level patterns
  const patternOverride = {};
  for (const n of fileNodes) {
    const f = n.filePath.replace(/\\/g, "/");
    const base = f.split("/").pop();
    const low = f.toLowerCase();
    if (/\.test\.[a-z]+$|\.spec\.[a-z]+$|_test\.|\.test\./.test(low)) patternOverride[n.id] = "test";
    else if (/\.d\.ts$/.test(low)) patternOverride[n.id] = "types";
    else if (/^index\.(ts|js|mjs)$/.test(base)) patternOverride[n.id] = "entry";
    else if (/^manage\.py$/.test(base)) patternOverride[n.id] = "entry";
    else if (/\.(graphql|gql|proto)$/.test(low)) patternOverride[n.id] = "types";
    else if (/\.sql$/.test(low)) patternOverride[n.id] = "data";
    else if (/^Dockerfile/.test(base) || /docker-compose/.test(low)) patternOverride[n.id] = "infrastructure";
    else if (/\.(tf|tfvars)$/.test(low)) patternOverride[n.id] = "infrastructure";
    else if (/\.github\/workflows\//.test(low)) patternOverride[n.id] = "ci-cd";
    else if (/^Makefile$/.test(base)) patternOverride[n.id] = "infrastructure";
  }

  // --- H. Deployment topology ---
  const infraFiles = fileNodes.filter(
    (n) => patternOverride[n.id] === "infrastructure" || patternOverride[n.id] === "ci-cd"
  );
  const deploymentTopology = {
    hasDockerfile: fileNodes.some((n) => /^Dockerfile/.test(n.name)),
    hasCompose: fileNodes.some((n) => /docker-compose/.test(n.name)),
    hasK8s: fileNodes.some((n) => /\.ya?ml$/.test(n.name) && /k8s|helm|kubernetes/i.test(n.name)),
    hasTerraform: fileNodes.some((n) => /\.(tf|tfvars)$/.test(n.name)),
    hasCI: fileNodes.some((n) => n.type === "pipeline"),
    infraFiles: infraFiles.map((n) => n.filePath),
  };

  // --- I. Data pipeline ---
  const dataPipeline = {
    schemaFiles: fileNodes.filter((n) => /\.sql$|\.graphql$|\.proto$/.test(n.name)).map((n) => n.filePath),
    migrationFiles: fileNodes.filter((n) => /migration/i.test(n.filePath)).map((n) => n.filePath),
    dataModelFiles: fileNodes.filter((n) => /\/data\//.test(n.filePath) && /\.(ts|json)$/.test(n.name)).map((n) => n.filePath),
    apiHandlerFiles: [],
  };

  // --- J. Doc coverage ---
  const groupsWithDocs = new Set();
  for (const n of fileNodes) {
    if (/\.(md|rst)$/.test(n.name)) groupsWithDocs.add(groupOf[n.id]);
  }
  const allGroups = Object.keys(groups);
  const docCoverage = {
    groupsWithDocs: groupsWithDocs.size,
    totalGroups: allGroups.length,
    coverageRatio: allGroups.length ? +(groupsWithDocs.size / allGroups.length).toFixed(2) : 0,
    undocumentedGroups: allGroups.filter((g) => !groupsWithDocs.has(g)),
  };

  // --- K. Dependency direction ---
  const directionCount = {};
  for (const e of importEdges) {
    const from = groupOf[e.source];
    const to = groupOf[e.target];
    if (!from || !to || from === to) continue;
    const key = from + "|" + to;
    directionCount[key] = directionCount[key] || { a: from, b: to, ab: 0, ba: 0 };
    directionCount[key].ab++;
  }
  for (const e of importEdges) {
    const from = groupOf[e.source];
    const to = groupOf[e.target];
    if (!from || !to || from === to) continue;
    const key = to + "|" + from;
    if (directionCount[key]) directionCount[key].ba++;
  }
  const dependencyDirection = [];
  for (const k in directionCount) {
    const d = directionCount[k];
    if (d.ab > d.ba) dependencyDirection.push({ dependent: d.a, dependsOn: d.b });
    else if (d.ba > d.ab) dependencyDirection.push({ dependent: d.b, dependsOn: d.a });
  }

  const fileFanIn = {};
  for (const n of fileNodes) if (fanIn[n.id] > 0) fileFanIn[n.id] = fanIn[n.id];
  const fileFanOut = {};
  for (const n of fileNodes) if (fanOut[n.id] > 0) fileFanOut[n.id] = fanOut[n.id];

  const result = {
    scriptCompleted: true,
    directoryGroups: groups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology,
    dataPipeline,
    docCoverage,
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup: Object.fromEntries(Object.entries(groups).map(([g, ids]) => [g, ids.length])),
      nodeTypeCounts: Object.fromEntries(Object.entries(nodeTypeGroups).map(([t, ids]) => [t, ids.length])),
    },
    fileFanIn,
    fileFanOut,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
