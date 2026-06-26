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
  let lastResolved = 'RTL';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const isAr = isArabicChar(ch);
    const isLat = /[a-zA-Z0-9]/.test(ch);
    if (isAr) {
      resolvedTypes[i] = 'RTL';
      lastResolved = 'RTL';
    } else if (isLat) {
      resolvedTypes[i] = 'LTR';
      lastResolved = 'LTR';
    } else {
      resolvedTypes[i] = null;
    }
  }

  let currentType = 'RTL';
  for (let i = 0; i < chars.length; i++) {
    if (resolvedTypes[i] === null) {
      let nextType = null;
      for (let j = i + 1; j < chars.length; j++) {
        if (resolvedTypes[j] !== null) {
          nextType = resolvedTypes[j];
          break;
        }
      }
      if (nextType === currentType) {
        resolvedTypes[i] = currentType;
      } else {
        resolvedTypes[i] = currentType;
      }
    } else {
      currentType = resolvedTypes[i];
    }
  }

  const segments = [];
  let currentSeg = chars[0] || '';
  let currentTypeRun = resolvedTypes[0] || 'RTL';

  for (let i = 1; i < chars.length; i++) {
    if (resolvedTypes[i] === currentTypeRun) {
      currentSeg += chars[i];
    } else {
      segments.push({ text: currentSeg, type: currentTypeRun });
      currentSeg = chars[i];
      currentTypeRun = resolvedTypes[i];
    }
  }
  if (currentSeg) {
    segments.push({ text: currentSeg, type: currentTypeRun });
  }

  const processedSegments = segments.map(seg => {
    if (seg.type === 'RTL') {
      return seg.text.split('').reverse().join('');
    } else {
      return seg.text;
    }
  });

  return processedSegments.join('');
}

console.log(`Output: "${processBidiText("Longi solar panels / ألواح")}"`);
