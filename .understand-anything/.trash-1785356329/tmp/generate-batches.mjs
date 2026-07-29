#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';

const ROOT = 'C:\\Users\\Administrator\\Downloads\\voxlblade-builder';
const UA = ROOT + '\\.understand-anything';

const scan = JSON.parse(readFileSync(UA + '\\intermediate\\scan-result.json', 'utf8'));
const structure = JSON.parse(readFileSync(UA + '\\intermediate\\structure-output.json', 'utf8'));
const batchesMeta = JSON.parse(readFileSync(UA + '\\intermediate\\batches.json', 'utf8'));
const importMap = scan.importMap || {};

// Build file path -> node type prefix lookup
const pathTypeMap = {};
for (const f of scan.files) {
  const p = f.path.replace(/\\/g, '/');
  const cat = f.fileCategory;
  if (cat === 'config') pathTypeMap[p] = 'config';
  else if (cat === 'docs') pathTypeMap[p] = 'document';
  else if (cat === 'infra') pathTypeMap[p] = 'service';
  else pathTypeMap[p] = 'file';
}

// Load existing batch data for reuse
const existingSummaries = {};
for (let i = 1; i <= 7; i++) {
  try {
    const batch = JSON.parse(readFileSync(UA + '\\intermediate\\batch-' + i + '.json', 'utf8'));
    batch.nodes.forEach(n => {
      if (n.filePath) existingSummaries[n.filePath] = { summary: n.summary, tags: n.tags, complexity: n.complexity, languageNotes: n.languageNotes };
    });
  } catch(e) {}
}

// Build structure lookup
const structByPath = {};
structure.results.forEach(r => { structByPath[r.path] = r; });

// Language -> type mapping
const langTypeMap = {
  'json': 'config', 'yaml': 'infra', 'markdown': 'document', 'html': 'markup',
  'css': 'markup', 'txt': 'document', 'javascript': 'file', 'typescript': 'file',
  'svelte': 'file', 'unknown': 'file'
};

const catTypeMap = {
  'config': 'config', 'infra': 'resource', 'docs': 'document', 'code': 'file',
  'markup': 'file', 'data': 'config', 'script': 'file'
};

const complexityMap = {
  'tiny': 'simple', 'small': 'simple', 'medium': 'moderate', 'moderate': 'moderate',
  'large': 'complex', 'complex': 'complex', 'very-large': 'very-complex'
};

function deriveComplexity(lines) {
  if (lines <= 30) return 'simple';
  if (lines <= 200) return 'moderate';
  if (lines <= 800) return 'complex';
  return 'very-complex';
}

function deriveTags(filePath, category, language) {
  const tags = [];
  const ext = filePath.split('.').pop();
  if (category === 'code') tags.push('source');
  else if (category === 'config') tags.push('config');
  else if (category === 'docs') tags.push('documentation');
  else if (category === 'infra') tags.push('infrastructure');
  else if (category === 'markup') tags.push('markup');
  else if (category === 'data') tags.push('data');
  
  if (language) tags.push(language);
  if (ext) tags.push(ext);
  
  const parts = filePath.replace(/\\/g, '/').split('/');
  if (parts.length > 1) tags.push(parts.slice(0, -1).join('/'));
  
  return [...new Set(tags)];
}

function deriveSummary(filePath, category, language, struct) {
  const name = filePath.split('/').pop().split('\\').pop();
  const parts = filePath.replace(/\\/g, '/').split('/');
  const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
  const funcs = struct?.metrics?.functionCount || 0;
  const exports = struct?.metrics?.exportCount || 0;
  const lines = struct?.totalLines || 0;
  
  const catLabels = { 'code': 'Source code', 'config': 'Configuration', 'docs': 'Documentation', 'infra': 'Infrastructure', 'markup': 'Markup', 'data': 'Data', 'script': 'Script' };
  const label = catLabels[category] || 'File';
  
  let summary = `${label} \`${name}\``;
  if (dir !== 'root') summary += ` in ${dir}`;
  if (language && language !== 'unknown') summary += ` (${language})`;
  if (funcs > 0) summary += ` with ${funcs} function${funcs > 1 ? 's' : ''}`;
  if (exports > 0) summary += `, ${exports} export${exports > 1 ? 's' : ''}`;
  if (lines > 0) summary += `, ${lines} lines`;
  return summary;
}

// For each batch, generate nodes and edges
const resultBatches = [];

for (const batch of batchesMeta.batches) {
  const batchIndex = batch.batchIndex;
  const files = batch.files;
  const batchImportData = batch.batchImportData || {};
  const neighborMap = batch.neighborMap || {};
  
  const nodes = [];
  const edges = [];
  
  for (const file of files) {
    const path = file.path;
    const language = file.language;
    const sizeLines = file.sizeLines;
    const fileCategory = file.fileCategory;
    
    // Determine node type
    let type = 'file';
    if (fileCategory === 'config') type = 'config';
    else if (fileCategory === 'docs') type = 'document';
    else if (fileCategory === 'infra') type = 'service';
    else if (fileCategory === 'markup') type = 'file';
    else if (fileCategory === 'data') type = 'config';
    
    // Node ID
    const id = type + ':' + path.replace(/\\/g, '/');
    
    // Reuse existing summary if available
    const existing = existingSummaries[path];
    const summary = existing?.summary || deriveSummary(path, fileCategory, language, structByPath[path]);
    const tags = existing?.tags || deriveTags(path, fileCategory, language);
    const complexity = existing?.complexity || deriveComplexity(sizeLines);
    const languageNotes = existing?.languageNotes || '';
    
    nodes.push({
      id, type, name: path.split('/').pop().split('\\').pop(),
      filePath: path.replace(/\\/g, '/'),
      summary, tags, complexity, languageNotes
    });
    
    // Add function nodes from structure extraction
    const struct = structByPath[path];
    if (struct && struct.metrics && struct.metrics.functionCount > 0) {
      // For code files, add function nodes based on exports/sections
      const exports = struct.metrics.exportCount || 0;
      if (exports > 0 && struct.sections) {
        struct.sections.forEach((section, idx) => {
          if (section.heading && !section.heading.startsWith('$')) {
            const funcId = `function:${path.replace(/\\/g, '/')}:${section.heading}`;
            nodes.push({
              id: funcId, type: 'function',
              name: section.heading,
              filePath: path.replace(/\\/g, '/'),
              summary: `Function ${section.heading}`,
              tags: ['function', language].filter(Boolean),
              complexity: 'simple',
              languageNotes: ''
            });
            edges.push({ source: funcId, target: id, type: 'contains', weight: 1.0 });
          }
        });
      }
    }
    
    // Add import edges from importMap
    const imports = importMap[path];
    if (imports && Array.isArray(imports)) {
      imports.forEach(imp => {
        const normPath = imp.replace(/\\/g, '/');
        const targetPrefix = pathTypeMap[normPath] || 'file';
        const targetId = targetPrefix + ':' + normPath;
        edges.push({ source: id, target: targetId, type: 'imports', weight: 0.7 });
      });
    }
  }
  
  resultBatches.push({ batchIndex, batchTotal: batchesMeta.totalBatches, fileCount: files.length, nodes, edges });
}

// Write batch files
resultBatches.forEach(b => {
  writeFileSync(`${UA}\\intermediate\\batch-${b.batchIndex}.json`, JSON.stringify(b, null, 2));
  console.log(`Wrote batch-${b.batchIndex}.json (${b.nodes.length} nodes, ${b.edges.length} edges)`);
});

console.log('Done - ' + resultBatches.length + ' batches written');
