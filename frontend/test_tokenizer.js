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

  // Shape the Arabic characters first so we get connected forms
  const shapedText = ArabicShaper.convertArabic(text);

  // Tokenize the shaped text.
  // We match contiguous Arabic characters OR contiguous Latin/numeric characters.
  // The separators (neutrals like spaces, slashes, punctuation) will be split out as separate items.
  const bidiRegex = /([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0660-\u0669\u0621-\u064A]+|[a-zA-Z0-9]+)/g;
  const parts = shapedText.split(bidiRegex);

  const processed = parts.map(part => {
    if (!part) return '';
    if (hasArabic(part)) {
      // It is an Arabic segment. Reverse it.
      return part.split('').reverse().join('');
    } else {
      // It is LTR (English/numbers) or Neutral (spaces, slashes, colons, etc.).
      // Keep it as is.
      return part;
    }
  });

  // Reverse the entire array of segments so that LTR segments are placed on the left
  // and RTL segments are placed on the right, while English words and numbers themselves remain LTR.
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
