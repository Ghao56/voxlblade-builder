import fs from 'fs';
const p = 'D:/voxlblade-builder/.understand-anything/intermediate/assembled-graph.json';
const g = JSON.parse(fs.readFileSync(p, 'utf8'));
const m = new Map();
g.nodes.forEach(n => {
  if (n.id && /^[a-z]+::/.test(n.id)) {
    const nid = n.id.replace(/^([a-z]+)::/, '$1:');
    m.set(n.id, nid);
    n.id = nid;
  }
});
let ec = 0;
g.edges.forEach(e => {
  if (m.has(e.source)) { e.source = m.get(e.source); ec++; }
  if (m.has(e.target)) { e.target = m.get(e.target); ec++; }
});
let lc = 0;
g.layers.forEach(l => {
  l.nodeIds = l.nodeIds.map(id => {
    if (m.has(id)) { lc++; return m.get(id); }
    return id;
  });
});
let tc = 0;
g.tour.forEach(s => {
  s.nodeIds = s.nodeIds.map(id => {
    if (m.has(id)) { tc++; return m.get(id); }
    return id;
  });
});
fs.writeFileSync(p, JSON.stringify(g, null, 2));
console.log('Fixed ' + m.size + ' IDs, ' + ec + ' edges, ' + lc + ' layers, ' + tc + ' tour');
