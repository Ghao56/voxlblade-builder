const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: node ua-arch-analyze.js <input.json> <output.json>');
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
const { fileNodes, importEdges, allEdges } = input;

// A. Directory Grouping
function getCommonPrefix(paths) {
  if (paths.length === 0) return '';
  const parts = paths[0].split('/');
  let prefix = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '' || parts[i] === '.') { prefix.push(parts[i] || '.'); continue; }
    if (paths.every(p => p.split('/')[i] === parts[i])) {
      prefix.push(parts[i]);
    } else break;
  }
  const p = prefix.join('/');
  return p.endsWith('/') ? p : p + '/';
}

const filePaths = fileNodes.map(n => n.filePath).filter(Boolean);
const commonPrefix = getCommonPrefix(filePaths);

function getGroup(filePath) {
  const relative = filePath.startsWith(commonPrefix) ? filePath.slice(commonPrefix.length) : filePath;
  const segments = relative.split('/');
  if (segments.length > 1) return segments[0];
  // Flat file - classify by pattern
  if (filePath.startsWith('src/lib/engine/')) return 'engine';
  if (filePath.startsWith('src/lib/constants/')) return 'constants';
  if (filePath.startsWith('src/lib/modals/')) return 'modals';
  if (filePath.startsWith('src/lib/ui/')) return 'ui-lib';
  if (filePath.startsWith('src/lib/stats/')) return 'stats';
  if (filePath.startsWith('src/lib/')) return 'lib-root';
  if (filePath.startsWith('src/data/')) return 'data';
  if (filePath.startsWith('src/')) return 'src-root';
  if (filePath.startsWith('.understand-anything/')) return '.understand-anything';
  if (filePath.startsWith('.github/')) return '.github';
  if (filePath.startsWith('tests/')) return 'tests';
  if (filePath.startsWith('docs/')) return 'docs';
  if (filePath.startsWith('.slim/')) return '.slim';
  return 'root';
}

const directoryGroups = {};
for (const node of fileNodes) {
  const group = getGroup(node.filePath || node.id);
  if (!directoryGroups[group]) directoryGroups[group] = [];
  directoryGroups[group].push(node.id);
}

// B. Node Type Grouping
const nodeTypeGroups = {};
for (const node of fileNodes) {
  const t = node.type || 'file';
  if (!nodeTypeGroups[t]) nodeTypeGroups[t] = [];
  nodeTypeGroups[t].push(node.id);
}

// C. Import Adjacency
const fanIn = {};
const fanOut = {};
for (const node of fileNodes) { fanIn[node.id] = 0; fanOut[node.id] = 0; }
const importEdgesOnly = allEdges.filter(e => e.type === 'imports' || e.type === 'import');
for (const edge of importEdgesOnly) {
  if (fanOut[edge.source] !== undefined) fanOut[edge.source]++;
  if (fanIn[edge.target] !== undefined) fanIn[edge.target]++;
}

// Group adjacency
const groupFanIn = {};
const groupFanOut = {};
for (const g of Object.keys(directoryGroups)) { groupFanIn[g] = {}; groupFanOut[g] = {}; }
const nodeToGroup = {};
for (const [g, ids] of Object.entries(directoryGroups)) {
  for (const id of ids) nodeToGroup[id] = g;
}
for (const edge of importEdgesOnly) {
  const sg = nodeToGroup[edge.source];
  const tg = nodeToGroup[edge.target];
  if (sg && tg && sg !== tg) {
    if (!groupFanOut[sg][tg]) groupFanOut[sg][tg] = 0;
    groupFanOut[sg][tg]++;
    if (!groupFanIn[tg][sg]) groupFanIn[tg][sg] = 0;
    groupFanIn[tg][sg]++;
  }
}

// D. Cross-Category Dependencies
const crossCategoryEdges = [];
const ccMap = {};
for (const edge of allEdges) {
  const fromNode = fileNodes.find(n => n.id === edge.source);
  const toNode = fileNodes.find(n => n.id === edge.target);
  if (!fromNode || !toNode) continue;
  const fromType = fromNode.type || 'file';
  const toType = toNode.type || 'file';
  const edgeType = edge.type;
  const key = `${fromType}|${toType}|${edgeType}`;
  if (!ccMap[key]) ccMap[key] = 0;
  ccMap[key]++;
}
for (const [key, count] of Object.entries(ccMap)) {
  const [fromType, toType, edgeType] = key.split('|');
  crossCategoryEdges.push({ fromType, toType, edgeType, count });
}

// E. Inter-Group Import Frequency
const interGroupImports = [];
const igMap = {};
for (const edge of importEdgesOnly) {
  const sg = nodeToGroup[edge.source];
  const tg = nodeToGroup[edge.target];
  if (sg && tg && sg !== tg) {
    const key = `${sg}|${tg}`;
    if (!igMap[key]) igMap[key] = 0;
    igMap[key]++;
  }
}
for (const [key, count] of Object.entries(igMap)) {
  const [from, to] = key.split('|');
  interGroupImports.push({ from, to, count });
}

// F. Intra-Group Import Density
const intraGroupDensity = {};
for (const [g, ids] of Object.entries(directoryGroups)) {
  const idSet = new Set(ids);
  let internalEdges = 0;
  let totalEdges = 0;
  for (const edge of importEdgesOnly) {
    const srcIn = idSet.has(edge.source);
    const tgtIn = idSet.has(edge.target);
    if (srcIn || tgtIn) totalEdges++;
    if (srcIn && tgtIn) internalEdges++;
  }
  intraGroupDensity[g] = {
    internalEdges,
    totalEdges,
    density: totalEdges > 0 ? Math.round((internalEdges / totalEdges) * 100) / 100 : 0
  };
}

// G. Directory Pattern Matching
const patternTable = {
  routes: 'api', api: 'api', controllers: 'api', endpoints: 'api', handlers: 'api',
  services: 'service', core: 'service', lib: 'service', domain: 'service', logic: 'service',
  models: 'data', db: 'data', data: 'data', persistence: 'data', repository: 'data', entities: 'data',
  components: 'ui', views: 'ui', pages: 'ui', ui: 'ui', layouts: 'ui', screens: 'ui',
  middleware: 'middleware', plugins: 'middleware', interceptors: 'middleware', guards: 'middleware',
  utils: 'utility', helpers: 'utility', common: 'utility', shared: 'utility', tools: 'utility',
  config: 'config', constants: 'config', env: 'config', settings: 'config',
  __tests__: 'test', test: 'test', tests: 'test', spec: 'test', specs: 'test',
  types: 'types', interfaces: 'types', schemas: 'types', contracts: 'types', dtos: 'types',
  hooks: 'hooks',
  store: 'state', state: 'state', reducers: 'state', actions: 'state', slices: 'state',
  assets: 'assets', static: 'assets', public: 'assets',
  migrations: 'data',
  management: 'config', commands: 'config',
  modals: 'ui', stats: 'service', engine: 'service',
  '.github': 'ci-cd', '.gitlab': 'ci-cd', '.circleci': 'ci-cd',
  docs: 'documentation', documentation: 'documentation',
};

const patternMatches = {};
for (const g of Object.keys(directoryGroups)) {
  if (patternTable[g]) {
    patternMatches[g] = patternTable[g];
  } else {
    // Check file-level patterns
    const ids = directoryGroups[g];
    if (ids.some(id => /\.test\.|\.spec\.|_test\./.test(id))) patternMatches[g] = 'test';
    else if (ids.some(id => /\.md$/.test(id))) patternMatches[g] = 'documentation';
    else patternMatches[g] = 'other';
  }
}

// File-level pattern matching
function filePattern(id, filePath) {
  if (/\.test\.|\.spec\./.test(id) || /piercer\.test/.test(filePath)) return 'test';
  if (/\.md$/.test(filePath)) return 'documentation';
  if (/\.json$/.test(filePath) && !filePath.includes('src/')) return 'config';
  if (/package\.json|tsconfig|vercel\.json|fallowrc|fallow-output|fallow-security|stats-data/.test(filePath)) return 'config';
  if (/\.yml$|\.yaml$/.test(filePath)) return 'ci-cd';
  if (/Dockerfile|docker-compose/.test(filePath)) return 'infrastructure';
  if (/\.tf$/.test(filePath)) return 'infrastructure';
  if (/index\.html|stats\.html/.test(filePath)) return 'entry';
  if (/vite\.config/.test(filePath)) return 'config';
  if (/main\.ts$/.test(filePath)) return 'entry';
  if (/app\.css$/.test(filePath)) return 'ui-asset';
  if (/\.svelte$/.test(filePath)) return 'component';
  return null;
}

// H. Deployment Topology
const infraFiles = [];
const hasDockerfile = allEdges.some(e => /Dockerfile/.test(e.source) || /Dockerfile/.test(e.target));
const hasCompose = allEdges.some(e => /docker-compose/.test(e.source) || /docker-compose/.test(e.target));
const hasCI = fileNodes.some(n => /static\.yml/.test(n.filePath));
const deploymentTopology = {
  hasDockerfile: false,
  hasCompose: false,
  hasK8s: false,
  hasTerraform: false,
  hasCI,
  infraFiles: fileNodes.filter(n => /\.yml$/.test(n.filePath) || /vercel\.json/.test(n.filePath)).map(n => n.id)
};

// I. Data Pipeline
const dataPipeline = {
  schemaFiles: fileNodes.filter(n => n.type === 'schema').map(n => n.id),
  migrationFiles: [],
  dataModelFiles: fileNodes.filter(n => /src\/data\//.test(n.filePath || '') && /\.ts$/.test(n.filePath || '')).map(n => n.id),
  apiHandlerFiles: []
};

// J. Documentation Coverage
const docFiles = fileNodes.filter(n => n.type === 'document' || /\.md$/.test(n.filePath || ''));
const groupsWithDocs = new Set();
for (const doc of docFiles) {
  const g = getGroup(doc.filePath || doc.id);
  groupsWithDocs.add(g);
}
const allGroups = Object.keys(directoryGroups);
const undocumentedGroups = allGroups.filter(g => !groupsWithDocs.has(g));
const docCoverage = {
  groupsWithDocs: groupsWithDocs.size,
  totalGroups: allGroups.length,
  coverageRatio: allGroups.length > 0 ? Math.round((groupsWithDocs.size / allGroups.length) * 100) / 100 : 0,
  undocumentedGroups
};

// K. Dependency Direction
const dependencyDirection = [];
for (const [key, count] of Object.entries(igMap)) {
  const [from, to] = key.split('|');
  const reverseKey = `${to}|${from}`;
  const reverseCount = igMap[reverseKey] || 0;
  if (count > reverseCount) {
    dependencyDirection.push({ dependent: from, dependsOn: to, importCount: count, reverseImportCount: reverseCount });
  }
}

const result = {
  scriptCompleted: true,
  directoryGroups,
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
    filesPerGroup: Object.fromEntries(Object.entries(directoryGroups).map(([k, v]) => [k, v.length])),
    nodeTypeCounts: Object.fromEntries(Object.entries(nodeTypeGroups).map(([k, v]) => [k, v.length]))
  },
  fileFanIn: fanIn,
  fileFanOut: fanOut
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Analysis complete. ${fileNodes.length} file nodes, ${allEdges.length} edges.`);
console.log(`Groups: ${Object.keys(directoryGroups).length}`);
process.exit(0);
