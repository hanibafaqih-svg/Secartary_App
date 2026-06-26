import pkg from 'arabic-persian-reshaper';
const ArabicShaper = pkg.ArabicShaper || pkg;

function isArabicChar(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) ||
         (code >= 0x0750 && code <= 0x077F) ||
         (code >= 0xFB50 && code <= 0xFDFF) ||
         (code >= 0xFE70 && code <= 0xFEFF);
}

function processBidiText(text) {
  if (!text) return '';

  const chars = text.split('');
  const blocks = [];
  let currentBlock = null;

  for (const ch of chars) {
    let type = 'NEUTRAL';
    if (isArabicChar(ch)) {
      type = 'RTL';
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      type = 'LTR';
    }

    if (!currentBlock) {
      currentBlock = { type, text: ch };
    } else if (currentBlock.type === type) {
      currentBlock.text += ch;
    } else {
      blocks.push(currentBlock);
      currentBlock = { type, text: ch };
    }
  }
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // Process each block
  const processed = blocks.map(block => {
    if (block.type === 'RTL') {
      // Shape and reverse Arabic blocks
      const shaped = ArabicShaper.convertArabic(block.text);
      return shaped.split('').reverse().join('');
    } else {
      // Keep LTR and NEUTRAL blocks as they are
      return block.text;
    }
  });

  // Reverse the blocks order so they render from right to left overall
  processed.reverse();
  return processed.join('');
}

const testCases = [
  "العنوان",
  "الاجمالي الكلي",
  "العنوان / العناية: صنعاء",
  "Longi / ألواح",
  "اسم العميل / الشركة: Tesla",
  "الاجمالي: 150.00 YER",
  "Longi solar panels",
  "ألواح طاقة شمسية من نوع Longi ممتازة"
];

for (const tc of testCases) {
  console.log(`Input:  "${tc}"`);
  console.log(`Output: "${processBidiText(tc)}"`);
  console.log('---');
}
