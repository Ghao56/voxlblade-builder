import { readFileSync } from 'fs';

const content = readFileSync('C:\\Users\\Administrator\\Downloads\\voxlblade-builder\\src\\lib\\store.ts', 'utf-8');
console.log('First 200 chars:', content.substring(0, 200));

const re = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"]/g;
let m;
while ((m = re.exec(content)) !== null) {
  console.log('Match:', m[0], '-> spec:', m[1]);
}
