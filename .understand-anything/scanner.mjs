import fs from 'fs';
import path from 'path';

const root = process.cwd();

function walk(dir, exclude) {
  const result = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (exclude.some(p => full.includes(p))) continue;
      if (e.isDirectory()) result.push(...walk(full, exclude));
      else result.push(full);
    }
  } catch (_) {}
  return result;
}

const files = walk(root, ['node_modules', '.git', 'dist', '.understand-anything'])
  .filter(f => !f.endsWith('pnpm-lock.yaml') && !f.endsWith('package-lock.json'));

const importRe = /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?)\s+from\s+)?['"]([^'"]+)['"]/gm;
const exportRe = /^export\s+\*\s+from\s+['"]([^'"]+)['"]/gm;

const data = [];
for (const f of files) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  let content;
  try { content = fs.readFileSync(f, 'utf-8'); } catch { content = ''; }
  const lines = content.split('\n').length;
  const ext = path.extname(f).toLowerCase();

  let lang = '';
  if (['.ts', '.mjs', '.js'].includes(ext)) lang = 'TypeScript/JavaScript';
  else if (ext === '.svelte') lang = 'Svelte';
  else if (ext === '.json') lang = 'JSON';
  else if (ext === '.html') lang = 'HTML';
  else if (ext === '.css') lang = 'CSS';
  else if (ext === '.md') lang = 'Markdown';
  else if (['.yml', '.yaml'].includes(ext)) lang = 'YAML';
  else lang = 'Other';

  let category = '';
  if (rel.startsWith('src/data')) category = 'game-data';
  else if (rel.startsWith('src/lib/engine')) category = 'engine';
  else if (rel.startsWith('src/lib/constants')) category = 'constants';
  else if (rel.startsWith('src/lib/stores')) category = 'store';
  else if (rel.startsWith('src/lib/stats')) category = 'stats';
  else if (rel.startsWith('src/lib/ui')) category = 'ui';
  else if (rel.startsWith('src/lib/modals')) category = 'modals';
  else if (rel.startsWith('src/lib')) category = 'lib';
  else if (rel.startsWith('src')) category = 'page';
  else if (rel.startsWith('tests')) category = 'test';
  else if (rel.startsWith('docs')) category = 'doc';
  else if (rel.startsWith('.github')) category = 'ci';
  else if (rel.startsWith('.vscode')) category = 'config';
  else if (rel.startsWith('.slim')) category = 'doc';
  else category = 'config';

  const imports = [];
  importRe.lastIndex = 0;
  let m;
  while ((m = importRe.exec(content)) !== null) imports.push(m[1]);
  exportRe.lastIndex = 0;
  while ((m = exportRe.exec(content)) !== null) imports.push(m[1]);

  const complexity = lines > 500 ? 'high' : lines > 100 ? 'medium' : 'low';

  data.push({ rel, lang, category, sizeLines: lines, complexity, imports });
}

data.sort((a, b) => a.rel.localeCompare(b.rel));

const allLangs = [...new Set(data.map(d => d.lang))];
const importMap = {};
for (const d of data) {
  for (const i of d.imports) {
    importMap[i] = (importMap[i] || 0) + 1;
  }
}
const totalLines = data.reduce((s, d) => s + d.sizeLines, 0);

const result = {
  projectName: 'voxlblade-builder',
  projectDescription: 'A web-based damage calculator and build optimizer for the Roblox game Voxel Blade',
  frameworks: ['Svelte 5', 'Vite', 'Tailwind CSS'],
  languages: allLangs.filter(Boolean),
  fileCount: data.length,
  totalLines,
  importMap,
  files: data
};

const outDir = path.join(root, '.understand-anything', 'intermediate');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'scan-result.json'), JSON.stringify(result, null, 2));
console.log('Written: ' + path.join(outDir, 'scan-result.json'));
console.log('Files: ' + data.length + ', Lines: ' + totalLines);
