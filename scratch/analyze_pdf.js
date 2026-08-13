import fs from 'fs';

const pdfPath = 'C:\\Users\\Hani\\.gemini\\antigravity\\brain\\81013e0f-28a5-4ac0-8a38-2d7543e04a18\\.user_uploaded\\media_1786641400640.pdf';
const content = fs.readFileSync(pdfPath, 'utf8');

console.log("PDF length:", content.length);
console.log("Substrings with phone/ops/petro:");

const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('771') || line.includes('ops') || line.includes('petro') || line.includes('Font') || line.includes('Image')) {
    console.log(`Line ${i}: ${line.slice(0, 120)}`);
  }
});
