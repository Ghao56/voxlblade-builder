const fs = require('fs');
const scan = JSON.parse(fs.readFileSync('.ua/intermediate/scan-result.json', 'utf8'));
const input = {
  projectRoot: 'C:\\Users\\Administrator\\Downloads\\voxlblade-builder',
  sourceFilePaths: scan.files.map(f => f.path),
  gitCommitHash: 'd29e715487098ad4bba90ce842ca6821b9a3365e'
};
fs.writeFileSync('.ua/intermediate/fingerprint-input.json', JSON.stringify(input, null, 2));
console.log('fp input written');