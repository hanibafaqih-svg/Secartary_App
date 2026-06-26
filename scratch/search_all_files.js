const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.vercel') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile()) {
      if (file.toLowerCase().includes('pdf') || file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/pdf/i.test(content) || /pdf-lib/i.test(content)) {
          console.log(`Match found in: ${fullPath}`);
        }
      }
    }
  }
}

console.log('Searching all files for "pdf"...');
searchDir(path.resolve(__dirname, '..'));
console.log('Search finished.');
