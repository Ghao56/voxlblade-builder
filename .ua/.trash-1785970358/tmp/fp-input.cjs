const fs = require('fs');
const scan = JSON.parse(fs.readFileSync('.ua/intermediate/scan-result.json', 'utf8'));
const input = {
  projectRoot: 'C:\\Users\\Administrator\\Downloads\\voxlblade-builder',
  sourceFilePaths: scan.files.map(f => f.path),
  gitCommitHash: '03fd4971557c3b48d96a9f7922133889d0af6160'
};
fs.writeFileSync('.ua/intermediate/fingerprint-input.json', JSON.stringify(input, null, 2));
console.log('fingerprint-input.json written, files:', input.sourceFilePaths.length);