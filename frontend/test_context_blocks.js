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

  const shapedText = ArabicShaper.convertArabic(text);
  const chars = shapedText.split('');
  const resolvedTypes = [];

  // Helper to find closest non-neutral to the left
  const getLeftType = (index) => {
    for (let i = index - 1; i >= 0; i--) {
      const ch = chars[i];
      if (isArabicChar(ch)) return 'RTL';
      if (/[a-zA-Z0-9]/.test(ch)) return 'LTR';
    }
    return null;
  };

  // Helper to find closest non-neutral to the right
  const getRightType = (index) => {
    for (let i = index + 1; i < chars.length; i++) {
      const ch = chars[i];
      if (isArabicChar(ch)) return 'RTL';
      if (/[a-zA-Z0-9]/.test(ch)) return 'LTR';
    }
    return null;
  };

  // Classify each character
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (isArabicChar(ch)) {
      resolvedTypes[i] = 'RTL';
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      resolvedTypes[i] = 'LTR';
    } else {
      // It is a neutral character. Resolve using context.
      const left = getLeftType(i);
      const right = getRightType(i);

      if (left === null && right === null) {
        resolvedTypes[i] = 'NEUTRAL';
      } else if (left === null) {
        resolvedTypes[i] = right;
      } else if (right === null) {
        resolvedTypes[i] = left;
      } else if (left === right) {
        resolvedTypes[i] = left; // Same context on both sides
      } else {
        resolvedTypes[i] = 'NEUTRAL'; // Boundary between LTR and RTL
      }
    }
  }

  // Segment the characters into blocks of matching resolved types
  const blocks = [];
  let currentSeg = chars[0] || '';
  let currentType = resolvedTypes[0] || 'NEUTRAL';

  for (let i = 1; i < chars.length; i++) {
    if (resolvedTypes[i] === currentType) {
      currentSeg += chars[i];
    } else {
      blocks.push({ text: currentSeg, type: currentType });
      currentSeg = chars[i];
      currentType = resolvedTypes[i];
    }
  }
  if (currentSeg) {
    blocks.push({ text: currentSeg, type: currentType });
  }

  // Process each block
  const processed = blocks.map(block => {
    if (block.type === 'RTL') {
      return block.text.split('').reverse().join('');
    } else {
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
