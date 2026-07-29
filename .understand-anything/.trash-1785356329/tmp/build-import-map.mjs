import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = 'C:\\Users\\Administrator\\Downloads\\voxlblade-builder';
const scan = JSON.parse(readFileSync(join(ROOT, '.understand-anything', 'intermediate', 'scan-result.json'), 'utf8'));

const pathIndex = new Set();
for (const f of scan.files) {
  pathIndex.add(f.path.replace(/\\/g, '/'));
}

function resolveImport(sourcePath, importSpec) {
  sourcePath = sourcePath.replace(/\\/g, '/');
  if (!importSpec.startsWith('./') && !importSpec.startsWith('../')) {
    return null;
  }
  const sourceDir = dirname(sourcePath);
  // Resolve relative path manually
  let parts = importSpec.split('/');
  let srcParts = sourceDir.split('/');
  for (const p of parts) {
    if (p === '.') continue;
    if (p === '..') { if (srcParts.length > 0) srcParts.pop(); }
    else srcParts.push(p);
  }
  const resolved = srcParts.join('/');
  
  if (pathIndex.has(resolved)) return resolved;
  for (const ext of ['.ts', '.js', '.mjs', '.svelte', '.json', '.css']) {
    if (pathIndex.has(resolved + ext)) return resolved + ext;
  }
  for (const ext of ['.ts', '.js', '.mjs', '.svelte']) {
    if (pathIndex.has(resolved + '/index' + ext)) return resolved + '/index' + ext;
  }
  return null;
}

const importMap = {};
const importRe = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"]/g;
const importRe2 = /import\s+['"]([^'"]+)['"]/g;
const exportRe = /export\s+(?:\{[^}]*\}|[\w*{][^;]*)\s+from\s+['"]([^'"]+)['"]/g;

let totalFound = 0;
let totalResolved = 0;

for (const file of scan.files) {
  const path = file.path.replace(/\\/g, '/');
  if (file.fileCategory !== 'code') {
    importMap[path] = [];
    continue;
  }
  
  let content;
  try { content = readFileSync(join(ROOT, file.path), 'utf-8'); } 
  catch { importMap[path] = []; continue; }
  
  const specs = [];
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(content)) !== null) { specs.push(m[1]); }
  importRe2.lastIndex = 0;
  while ((m = importRe2.exec(content)) !== null) { specs.push(m[1]); }
  exportRe.lastIndex = 0;
  while ((m = exportRe.exec(content)) !== null) { specs.push(m[1]); }
  
  totalFound += specs.length;
  
  const resolved = [];
  for (const spec of specs) {
    const r = resolveImport(path, spec);
    if (r) { resolved.push(r); totalResolved++; }
  }
  importMap[path] = [...new Set(resolved)];
}

scan.importMap = importMap;
writeFileSync(join(ROOT, '.understand-anything', 'intermediate', 'scan-result.json'), JSON.stringify(scan, null, 2));

const totalEdges = Object.values(importMap).reduce((s, v) => s + v.length, 0);
const filesWithImports = Object.entries(importMap).filter(([k,v]) => v.length > 0).length;
console.log(`Scanned ${scan.files.length} files, ${totalFound} specifiers found, ${totalResolved} resolved, ${filesWithImports} files with imports, ${totalEdges} edges`);
