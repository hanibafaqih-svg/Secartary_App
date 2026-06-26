const fs = require('fs');
const path = require('path');

function searchLogsDir(dir, pattern) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchLogsDir(fullPath, pattern);
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.jsonl') || file.endsWith('.md'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (pattern.test(content) && !file.includes('search_')) {
          console.log(`Found match in brain history: ${fullPath}`);
        }
      }
    } catch (e) {
      // Ignore reading errors
    }
  }
}

const brainDir = 'C:\\Users\\Hani\\.gemini\\antigravity\\brain';
console.log(`Searching brain history in ${brainDir}...`);
searchLogsDir(brainDir, /pdf-lib/i);
console.log('Search finished.');
