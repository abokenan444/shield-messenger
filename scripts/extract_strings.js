/**
 * Extract hardcoded strings from Android layout XML files,
 * generate strings.xml (English), create translations, and
 * update layouts to use @string references.
 */

const fs = require('fs');
const path = require('path');

const LAYOUT_DIR = path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'layout');
const VALUES_DIR = path.join(__dirname, '..', 'app', 'src', 'main', 'res', 'values');

// ── Step 1: Extract all hardcoded strings ──

const stringsMap = new Map(); // text -> { key, type:'text'|'hint' }
const usedKeys = new Set();
let keyIndex = 0;

function generateKey(text, prefix = '') {
  // Java reserved keywords that can't be used as resource names
  const reserved = new Set(['abstract','assert','boolean','break','byte','case','catch','char','class',
    'const','continue','default','do','double','else','enum','extends','final','finally','float','for',
    'goto','if','implements','import','instanceof','int','interface','long','native','new','package',
    'private','protected','public','return','short','static','strictfp','super','switch','synchronized',
    'this','throw','throws','transient','try','void','volatile','while','null','true','false']);

  let key = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  if (key.length > 40) key = key.substring(0, 40);
  if (!key) key = `str_${keyIndex}`;
  if (prefix) key = `${prefix}_${key}`;
  // Android resource names must start with a letter
  if (/^[^a-z]/.test(key)) key = `n_${key}`;
  // Avoid Java reserved keywords
  if (reserved.has(key)) key = `${key}_text`;
  
  let finalKey = key;
  let suffix = 2;
  while (usedKeys.has(finalKey)) {
    finalKey = `${key}_${suffix}`;
    suffix++;
  }
  usedKeys.add(finalKey);
  keyIndex++;
  return finalKey;
}

// Scan all layout files
const layoutFiles = fs.readdirSync(LAYOUT_DIR).filter(f => f.endsWith('.xml'));
console.log(`Found ${layoutFiles.length} layout files`);

for (const file of layoutFiles) {
  const content = fs.readFileSync(path.join(LAYOUT_DIR, file), 'utf8');
  
  // Match android:text="..." where value doesn't start with @ and isn't empty
  const textMatches = content.matchAll(/android:text="([^"@][^"]*)"/g);
  for (const m of textMatches) {
    const text = m[1];
    if (!stringsMap.has(text)) {
      stringsMap.set(text, { key: generateKey(text), type: 'text' });
    }
  }
  
  // Match android:hint="..." where value doesn't start with @
  const hintMatches = content.matchAll(/android:hint="([^"@][^"]*)"/g);
  for (const m of hintMatches) {
    const text = m[1];
    if (!stringsMap.has(text)) {
      stringsMap.set(text, { key: generateKey(text, 'hint'), type: 'hint' });
    }
  }
}

console.log(`Extracted ${stringsMap.size} unique strings`);

// ── Step 2: Generate English strings.xml ──

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

let stringsXml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n';
stringsXml += '    <string name="app_name">Shield Messenger</string>\n\n';

// Sort by key for readability
const sortedEntries = [...stringsMap.entries()].sort((a, b) => a[1].key.localeCompare(b[1].key));

for (const [text, { key }] of sortedEntries) {
  stringsXml += `    <string name="${key}">${escapeXml(text)}</string>\n`;
}

stringsXml += '</resources>\n';

fs.writeFileSync(path.join(VALUES_DIR, 'strings.xml'), stringsXml, 'utf8');
console.log(`Written strings.xml with ${stringsMap.size + 1} entries`);

// ── Step 3: Update layout files to use @string references ──

let replacementCount = 0;

for (const file of layoutFiles) {
  const filePath = path.join(LAYOUT_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const [text, { key }] of stringsMap) {
    // Replace android:text="exact text" with android:text="@string/key"
    const textPattern = `android:text="${text}"`;
    const textReplacement = `android:text="@string/${key}"`;
    if (content.includes(textPattern)) {
      content = content.split(textPattern).join(textReplacement);
      modified = true;
      replacementCount++;
    }
    
    // Replace android:hint="exact text" with android:hint="@string/key"
    const hintPattern = `android:hint="${text}"`;
    const hintReplacement = `android:hint="@string/${key}"`;
    if (content.includes(hintPattern)) {
      content = content.split(hintPattern).join(hintReplacement);
      modified = true;
      replacementCount++;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log(`Made ${replacementCount} replacements across layout files`);

// ── Step 4: Output the string map as JSON for translation ──
const mapOutput = {};
for (const [text, { key }] of sortedEntries) {
  mapOutput[key] = text;
}
fs.writeFileSync(path.join(__dirname, 'strings_map.json'), JSON.stringify(mapOutput, null, 2), 'utf8');
console.log('Written strings_map.json for translation reference');

console.log('\nDone! Next step: create translations in values-XX directories.');
