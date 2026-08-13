import fs from 'fs';

// Let's check all .jpg and .png files in frontend/src/assets
const assetsDir = 'd:\\Hani\\Antigravity_Apps\\Secartary_App\\frontend\\src\\assets';
const files = fs.readdirSync(assetsDir);
console.log("Assets directory contents:");
files.forEach(f => {
  const stat = fs.statSync(`${assetsDir}\\${f}`);
  console.log(`  ${f}: ${stat.size} bytes, modified: ${stat.mtime.toISOString()}`);
});
