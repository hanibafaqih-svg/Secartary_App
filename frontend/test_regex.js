import pkg from 'arabic-persian-reshaper';
const ArabicShaper = pkg.ArabicShaper || pkg;

function isArabicChar(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) ||
         (code >= 0x0750 && code <= 0x077F) ||
         (code >= 0xFB50 && code <= 0xFDFF) ||
         (code >= 0xFE70 && code <= 0xFEFF);
}

function hasArabic(text) {
  for (let i = 0; i < text.length; i++) {
    if (isArabicChar(text[i])) return true;
  }
  return false;
}

function processBidiText(text) {
  if (!text) return '';

  // Regex to match contiguous Arabic characters (letters, shapes, etc.)
  const arabicRegex = /([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0660-\u0669]+)/g;
  
  // Split the text into segments. Because of the capturing group,
  // matching segments (Arabic) are included in the split array.
  const parts = text.split(arabicRegex);
  
  const processedSegments = parts.map(part => {
    if (!part) return '';
    if (hasArabic(part)) {
      // Shape and reverse the Arabic segment
      const shaped = ArabicShaper.convertArabic(part);
      return shaped.split('').reverse().join('');
    } else {
      // Keep non-Arabic segments (English/Numbers/Symbols) LTR
      return part;
    }
  });

  // Reassemble the segments by reversing their block order so that
  // they flow right-to-left overall, while English words themselves remain LTR.
  processedSegments.reverse();
  return processedSegments.join('');
}

const testCases = [
  "العنوان",
  "الاجمالي الكلي",
  "العنوان / العناية: صنعاء",
  "Longi / ألواح",
  "اسم العميل / الشركة: Tesla",
  "الاجمالي: 150.00 YER",
  "Longi solar panels"
];

for (const tc of testCases) {
  console.log(`Input:  "${tc}"`);
  console.log(`Output: "${processBidiText(tc)}"`);
  console.log('---');
}
