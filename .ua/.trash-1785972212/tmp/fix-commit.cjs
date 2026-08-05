const fs = require('fs');
const p = '.ua/intermediate/assembled-graph.json';
const g = JSON.parse(fs.readFileSync(p, 'utf8'));
g.project.gitCommitHash = 'd29e715487098ad4bba90ce842ca6821b9a3365e';
fs.writeFileSync(p, JSON.stringify(g, null, 2));
console.log('commit fixed:', g.project.gitCommitHash);