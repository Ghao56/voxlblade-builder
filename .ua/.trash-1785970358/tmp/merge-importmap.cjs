const fs = require('fs');
const scanPath = '.ua/intermediate/scan-result.json';
const impPath = '.ua/tmp/import-map.json';
const scan = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
const imp = JSON.parse(fs.readFileSync(impPath, 'utf8'));
scan.importMap = imp.importMap;
fs.writeFileSync(scanPath, JSON.stringify(scan, null, 2));
console.log('importMap entries:', Object.keys(imp.importMap).length);