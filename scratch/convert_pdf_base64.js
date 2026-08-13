import fs from 'fs';

const pdfPath = 'C:\\Users\\Hani\\.gemini\\antigravity\\brain\\81013e0f-28a5-4ac0-8a38-2d7543e04a18\\.user_uploaded\\media_1786641400640.pdf';
const buf = fs.readFileSync(pdfPath);
fs.writeFileSync('d:\\Hani\\Antigravity_Apps\\Secartary_App\\scratch\\pdf_base64.txt', buf.toString('base64'));
console.log("Converted PDF to base64 txt, length:", buf.length);
