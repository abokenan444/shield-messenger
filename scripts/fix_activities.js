/**
 * Fix activities that extend AppCompatActivity directly — make them extend BaseActivity
 * so they get locale application via attachBaseContext.
 * Skips BaseActivity.kt itself.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'app', 'src', 'main', 'java', 'com', 'shieldmessenger');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.kt') && f !== 'BaseActivity.kt');

let changed = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it extends AppCompatActivity
  if (content.includes(': AppCompatActivity()')) {
    // Don't change LockActivity - we already added attachBaseContext manually
    if (file === 'LockActivity.kt') {
      console.log(`Skipping ${file} (already has custom attachBaseContext)`);
      continue;
    }
    
    // Replace the parent class
    content = content.replace(/:\s*AppCompatActivity\(\)/, ': BaseActivity()');
    
    fs.writeFileSync(filePath, content, 'utf8');
    changed++;
    console.log(`Updated ${file}`);
  }
}

console.log(`\nUpdated ${changed} activities to extend BaseActivity`);
