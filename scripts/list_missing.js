const fs = require('fs');
const path = require('path');

const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'strings_map.json'), 'utf8'));
const keys = Object.keys(map);
console.log('Total keys in strings_map:', keys.length);

const arXml = fs.readFileSync(path.join(__dirname, '..', 'app/src/main/res/values-ar/strings.xml'), 'utf8');
const arKeys = Array.from(arXml.matchAll(/name="([^"]+)"/g)).map(m => m[1]);
console.log('Arabic translations:', arKeys.length);

const missing = keys.filter(k => !arKeys.includes(k));
console.log('Missing from Arabic:', missing.length);
console.log('\n--- All missing keys with English text ---');
missing.forEach(k => console.log(k + ' = ' + map[k]));
