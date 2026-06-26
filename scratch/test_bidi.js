const { ArabicShaper } = require('../frontend/node_modules/arabic-persian-reshaper/index.js');

function isArabicChar(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) ||
         (code >= 0x0750 && code <= 0x077F) ||
         (code >= 0xFB50 && code <= 0xFDFF) ||
         (code >= 0xFE70 && code <= 0xFEFF);
}

function reverseString(str) {
  return str.split('').reverse().join('');
}

function processBidiText(text) {
  if (!text) return '';
  
  const segments = [];
  let currentText = '';
  let currentIsArabic = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ') {
      let nextIsArabic = currentIsArabic;
      for (let j = i + 1; j < text.length; j++) {
        if (text[j] !== ' ') {
          nextIsArabic = isArabicChar(text[j]);
          break;
        }
      }
      if (nextIsArabic === currentIsArabic) {
        currentText += char;
      } else {
        if (currentText) {
          segments.push({ text: currentText, isArabic: currentIsArabic });
        }
        currentText = char;
        currentIsArabic = nextIsArabic;
      }
    } else {
      const isAr = isArabicChar(char);
      if (currentIsArabic === null) {
        currentIsArabic = isAr;
        currentText += char;
      } else if (isAr === currentIsArabic) {
        currentText += char;
      } else {
        if (currentText) {
          segments.push({ text: currentText, isArabic: currentIsArabic });
        }
        currentText = char;
        currentIsArabic = isAr;
      }
    }
  }
  if (currentText) {
    segments.push({ text: currentText, isArabic: currentIsArabic });
  }

  // Process segments
  const processed = segments.map(seg => {
    if (seg.isArabic) {
      const shaped = ArabicShaper.convertArabic(seg.text);
      return reverseString(shaped);
    } else {
      return seg.text;
    }
  });

  // Since overall context is RTL, reverse the order of segments
  processed.reverse();

  return processed.join('');
}

const test1 = "محول طاقة Deye Hybrid Inverter 550W شاحن";
console.log('Original:', test1);
console.log('Processed:', processBidiText(test1));
