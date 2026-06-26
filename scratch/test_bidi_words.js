const { ArabicShaper } = require('../frontend/node_modules/arabic-persian-reshaper/index.js');

function isArabicChar(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) ||
         (code >= 0x0750 && code <= 0x077F) ||
         (code >= 0xFB50 && code <= 0xFDFF) ||
         (code >= 0xFE70 && code <= 0xFEFF);
}

function hasArabic(word) {
  for (let i = 0; i < word.length; i++) {
    if (isArabicChar(word[i])) return true;
  }
  return false;
}

function reverseString(str) {
  return str.split('').reverse().join('');
}

function processBidiText(text) {
  if (!text) return '';
  
  // Split into words, keeping track of original spaces
  const words = text.split(/(\s+)/).filter(x => x.length > 0);
  
  const blocks = [];
  let currentBlock = [];
  let currentIsArabic = null;

  for (const token of words) {
    if (/^\s+$/.test(token)) {
      // It's a space, we can attach it to the current block or ignore for type switching
      continue;
    }
    
    const isAr = hasArabic(token);
    if (currentIsArabic === null) {
      currentIsArabic = isAr;
      currentBlock.push(token);
    } else if (isAr === currentIsArabic) {
      currentBlock.push(token);
    } else {
      blocks.push({ words: currentBlock, isArabic: currentIsArabic });
      currentBlock = [token];
      currentIsArabic = isAr;
    }
  }
  if (currentBlock.length > 0) {
    blocks.push({ words: currentBlock, isArabic: currentIsArabic });
  }

  // Process blocks
  const processedBlocks = blocks.map(block => {
    if (block.isArabic) {
      // Shape and reverse each word, and reverse the word order
      const processedWords = block.words.map(w => {
        const shaped = ArabicShaper.convertArabic(w);
        return reverseString(shaped);
      });
      processedWords.reverse();
      return processedWords.join(' ');
    } else {
      // Keep English words in original order
      return block.words.join(' ');
    }
  });

  // Reverse the order of blocks
  processedBlocks.reverse();

  return processedBlocks.join(' ');
}

const test1 = "محول طاقة Deye Hybrid Inverter 550W شاحن ممتاز";
console.log('Original:', test1);
console.log('Processed:', processBidiText(test1));
