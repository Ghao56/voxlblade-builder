// Inspect remaining non-ASCII runs in src/App.svelte with context.
const fs = require('fs')
const s = fs.readFileSync('src/App.svelte', 'utf8')
const runs = [...new Set(s.match(/[^\x00-\x7F]+/g))]
console.log('non-ascii unique runs:', runs.length)
for (const r of runs) {
  const i = s.indexOf(r)
  console.log(JSON.stringify(r.slice(0, 30)), '@', JSON.stringify(s.slice(Math.max(0, i - 30), i).replace(/\r?\n/g, ' ')))
}
