import { readFileSync } from 'fs';
const c = readFileSync('src/MountIcon.svelte', 'utf8');
const m = c.match(/d="([^"]+)"/);
if (m) {
  const d = m[1];
  console.log('Path d length:', d.length, 'chars');
  console.log('First 300:', d.slice(0, 300));
  console.log('Last 200:', d.slice(-200));
} else {
  console.log('No d attribute match');
}
