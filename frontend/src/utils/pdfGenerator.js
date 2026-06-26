import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ArabicShaper } from 'arabic-persian-reshaper';
import { tafqeet } from './tafqeet';

// Import assets to get their resolved Vite URLs
import petroLetterhead from '../assets/petro_south_letterhead.jpg';
import mbtkronLetterhead from '../assets/mbtkron_letterhead.jpg';
import petroStamp from '../assets/petro_south_stamp.png';
import mbtkronStamp from '../assets/mbtkron_stamp.png';

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

export function processBidiText(text) {
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

export function wrapText(text, maxWidth, font, fontSize) {
  if (!text) return [];
  const lines = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    const words = paragraph.split(/\s+/).filter(w => w.length > 0);
    let currentLineWords = [];
    let currentWidth = 0;
    
    for (const word of words) {
      const processedWord = processBidiText(word);
      const wordWidth = font.widthOfTextAtSize(processedWord, fontSize);
      const spaceWidth = font.widthOfTextAtSize(' ', fontSize);
      
      if (currentLineWords.length === 0) {
        currentLineWords.push(word);
        currentWidth = wordWidth;
      } else {
        const addedWidth = spaceWidth + wordWidth;
        if (currentWidth + addedWidth <= maxWidth) {
          currentLineWords.push(word);
          currentWidth += addedWidth;
        } else {
          lines.push(currentLineWords.join(' '));
          currentLineWords = [word];
          currentWidth = wordWidth;
        }
      }
    }
    if (currentLineWords.length > 0) {
      lines.push(currentLineWords.join(' '));
    }
  }
  return lines;
}

// Utility to fetch assets as ArrayBuffer
const assetCache = {};
async function fetchAsset(url) {
  if (assetCache[url]) {
    return assetCache[url];
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${url}`);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  assetCache[url] = data;
  return data;
}

export async function generatePDFBytes({ company, formData, mode, quotationData }) {
  const isPetro = company === 'Petro South';
  
  // Create PDF Document
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  // Load background and stamp bytes
  const bgBytes = await fetchAsset(isPetro ? petroLetterhead : mbtkronLetterhead);
  const backgroundJpg = await pdfDoc.embedJpg(bgBytes);
  
  // Fetch fonts
  const fontRegBytes = await fetchAsset('/Tajawal-Regular.ttf');
  const fontBoldBytes = await fetchAsset('/Tajawal-Bold.ttf');
  const fontRegular = await pdfDoc.embedFont(fontRegBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);
  
  // Setup first page
  let page = pdfDoc.addPage([595, 842]);
  page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
  
  // 1. Draw Date & Reference Number Overlays
  const headerX = formData.headerX !== undefined ? formData.headerX : 380;
  const headerY = formData.headerY !== undefined ? formData.headerY : (isPetro ? 755 : 800);
  
  // Date string formatting
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };
  const dateStr = formatDate(formData.date);
  const refStr = formData.refNumber || '';
  
  // Draw Date on top
  const processedDate = processBidiText(dateStr);
  const dateW = fontRegular.widthOfTextAtSize(processedDate, 10);
  page.drawText(processedDate, {
    x: headerX + 180 - dateW,
    y: headerY,
    size: 10,
    font: fontRegular,
    color: rgb(26/255, 35/255, 126/255)
  });
  
  // Draw Ref Number below it
  const processedRef = processBidiText(refStr);
  const refW = fontRegular.widthOfTextAtSize(processedRef, 10);
  page.drawText(processedRef, {
    x: headerX + 180 - refW,
    y: headerY - 25,
    size: 10,
    font: fontRegular,
    color: rgb(26/255, 35/255, 126/255)
  });
  
  let currentY = 660; // Start of content area
  
  if (mode === 'letter') {
    // ==========================================
    // OFFICIAL LETTER MODE
    // ==========================================
    
    // Recipient block
    if (formData.recipient) {
      const recLine = processBidiText(formData.recipient);
      page.drawText(recLine, { x: 75, y: currentY, size: 16, font: fontBold });
      currentY -= 30;
    }
    
    // Greeting
    const greetingLine = processBidiText("تحية طيبة وبعد،،،");
    page.drawText(greetingLine, { x: 75, y: currentY, size: 15, font: fontRegular });
    currentY -= 35;
    
    // Subject block
    if (formData.subject) {
      const subjectText = `الموضوع: ${formData.subject}`;
      const processedSubject = processBidiText(subjectText);
      const subjectWidth = fontBold.widthOfTextAtSize(processedSubject, 16);
      const subjectX = (595 - subjectWidth) / 2;
      page.drawText(processedSubject, { x: subjectX, y: currentY, size: 16, font: fontBold });
      currentY -= 40;
    }
    
    // Body paragraphs
    const bodyFontSize = formData.bodyFontSize || 15;
    const bodyLineHeight = formData.lineHeight || 1.8;
    const paragraphSpacing = formData.paragraphSpacing || 16;
    
    const lines = wrapText(formData.body, 445, fontRegular, bodyFontSize);
    
    for (const line of lines) {
      if (line === '') {
        currentY -= paragraphSpacing;
        continue;
      }
      
      // Page break check
      if (currentY < 130) {
        page = pdfDoc.addPage([595, 842]);
        page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
        currentY = 660;
      }
      
      const processedLine = processBidiText(line);
      const lineW = fontRegular.widthOfTextAtSize(processedLine, bodyFontSize);
      // Align to right margin (520 = 595 - 75)
      page.drawText(processedLine, {
        x: 520 - lineW,
        y: currentY,
        size: bodyFontSize,
        font: fontRegular
      });
      currentY -= bodyLineHeight * bodyFontSize;
    }
    
    // Closing
    if (currentY - 30 < 130) {
      page = pdfDoc.addPage([595, 842]);
      page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
      currentY = 660;
    }
    currentY -= 15;
    const closingLine = processBidiText("وتقبلوا منا فائق الاحترام والتقدير،،");
    const closingW = fontBold.widthOfTextAtSize(closingLine, 14);
    page.drawText(closingLine, {
      x: (595 - closingW) / 2,
      y: currentY,
      size: 14,
      font: fontBold
    });
    currentY -= 40;
    
  } else {
    // ==========================================
    // QUOTATION MODE
    // ==========================================
    
    // Title
    const titleText = processBidiText("عـرض سـعـر");
    const titleW = fontBold.widthOfTextAtSize(titleText, 20);
    page.drawText(titleText, { x: (595 - titleW) / 2, y: currentY, size: 20, font: fontBold });
    currentY -= 30;
    
    // Client Details Block
    const clientNameLabelText = processBidiText("اسم العميل / الشركة:");
    const clientNameValText = processBidiText(quotationData.clientName || '');
    const clientNameLabelW = fontBold.widthOfTextAtSize(clientNameLabelText, 11);
    const clientNameValW = fontRegular.widthOfTextAtSize(clientNameValText, 11);
    
    page.drawText(clientNameLabelText, { x: 520 - clientNameLabelW, y: currentY, size: 11, font: fontBold });
    page.drawText(clientNameValText, { x: 520 - clientNameLabelW - clientNameValW - 6, y: currentY, size: 11, font: fontRegular });
    currentY -= 18;
    
    const clientAddressLabelText = processBidiText("العنوان / العناية:");
    const clientAddressValText = processBidiText(quotationData.clientAddress || '');
    const clientAddressLabelW = fontBold.widthOfTextAtSize(clientAddressLabelText, 11);
    const clientAddressValW = fontRegular.widthOfTextAtSize(clientAddressValText, 11);
    
    page.drawText(clientAddressLabelText, { x: 520 - clientAddressLabelW, y: currentY, size: 11, font: fontBold });
    page.drawText(clientAddressValText, { x: 520 - clientAddressLabelW - clientAddressValW - 6, y: currentY, size: 11, font: fontRegular });
    currentY -= 18;
    
    if (quotationData.rfqNumber) {
      const rfqLabelText = processBidiText("طلب تسعير رقم (RFQ):");
      const rfqValText = processBidiText(quotationData.rfqNumber);
      const rfqLabelW = fontBold.widthOfTextAtSize(rfqLabelText, 11);
      const rfqValW = fontRegular.widthOfTextAtSize(rfqValText, 11);
      
      page.drawText(rfqLabelText, { x: 520 - rfqLabelW, y: currentY, size: 11, font: fontBold });
      page.drawText(rfqValText, { x: 520 - rfqLabelW - rfqValW - 6, y: currentY, size: 11, font: fontRegular });
      currentY -= 18;
    }
    
    currentY -= 15;
    
    // Intro greeting
    const introTextRaw = "تحية طيبة وبعد،،، بناءً على طلبكم الكريم، يسرنا أن نقدم لكم عرض السعر والخدمات للأصناف الموضحة أدناه:";
    const introLines = wrapText(introTextRaw, 445, fontRegular, 11);
    for (const line of introLines) {
      const proc = processBidiText(line);
      const lineW = fontRegular.widthOfTextAtSize(proc, 11);
      page.drawText(proc, { x: 520 - lineW, y: currentY, size: 11, font: fontRegular });
      currentY -= 16;
    }
    
    currentY -= 15; // gap before table
    
    // Table Headers Definition
    const headers = [
      { text: "م", x: 75, w: 30, align: 'center' },
      { text: "الوصف والصنف (Description)", x: 105, w: 230, align: 'right' },
      { text: "الكمية", x: 335, w: 50, align: 'center' },
      { text: "سعر الوحدة", x: 385, w: 65, align: 'center' },
      { text: "الإجمالي", x: 450, w: 70, align: 'center' }
    ];
    
    // Draw table header background (soft gray block)
    page.drawRectangle({
      x: 75,
      y: currentY - 5,
      width: 445,
      height: 25,
      color: rgb(240/255, 240/255, 240/255),
      borderColor: rgb(180/255, 180/255, 180/255),
      borderWidth: 1
    });
    
    for (const h of headers) {
      const text = processBidiText(h.text);
      const textWidth = fontBold.widthOfTextAtSize(text, 10);
      let textX = h.x;
      if (h.align === 'center') {
        textX = h.x + (h.w - textWidth) / 2;
      } else if (h.align === 'right') {
        textX = h.x + h.w - textWidth - 5;
      } else {
        textX = h.x + 5;
      }
      page.drawText(text, { x: textX, y: currentY, size: 10, font: fontBold, color: rgb(0,0,0) });
    }
    
    currentY -= 5;
    let tableTopY = currentY; // track starting Y of the table for vertical grid lines
    currentY -= 20;
    
    // Draw Items
    const items = quotationData.items || [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const descLines = wrapText(item.description, 220, fontRegular, 10);
      const rowHeight = Math.max(1, descLines.length) * 15 + 10;
      
      // Page break check for table rows
      if (currentY - rowHeight < 130) {
        // Draw vertical lines on the current page for the table so far
        page.drawLine({ start: { x: 75, y: tableTopY }, end: { x: 75, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
        page.drawLine({ start: { x: 105, y: tableTopY }, end: { x: 105, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
        page.drawLine({ start: { x: 335, y: tableTopY }, end: { x: 335, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
        page.drawLine({ start: { x: 385, y: tableTopY }, end: { x: 385, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
        page.drawLine({ start: { x: 450, y: tableTopY }, end: { x: 450, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
        page.drawLine({ start: { x: 520, y: tableTopY }, end: { x: 520, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
        page.drawLine({ start: { x: 75, y: currentY + 15 }, end: { x: 520, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
        
        // Add new page
        page = pdfDoc.addPage([595, 842]);
        page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
        currentY = 660;
        
        // Re-draw headers
        page.drawRectangle({
          x: 75,
          y: currentY - 5,
          width: 445,
          height: 25,
          color: rgb(240/255, 240/255, 240/255),
          borderColor: rgb(180/255, 180/255, 180/255),
          borderWidth: 1
        });
        
        for (const h of headers) {
          const text = processBidiText(h.text);
          const textWidth = fontBold.widthOfTextAtSize(text, 10);
          let textX = h.x;
          if (h.align === 'center') {
            textX = h.x + (h.w - textWidth) / 2;
          } else if (h.align === 'right') {
            textX = h.x + h.w - textWidth - 5;
          } else {
            textX = h.x + 5;
          }
          page.drawText(text, { x: textX, y: currentY, size: 10, font: fontBold, color: rgb(0,0,0) });
        }
        
        currentY -= 5;
        tableTopY = currentY;
        currentY -= 20;
      }
      
      // Draw horizontal line under row
      page.drawLine({
        start: { x: 75, y: currentY - rowHeight + 15 },
        end: { x: 520, y: currentY - rowHeight + 15 },
        thickness: 0.5,
        color: rgb(210/255, 210/255, 210/255)
      });
      
      // Serial
      const sNumText = String(idx + 1);
      const sNumW = fontRegular.widthOfTextAtSize(sNumText, 10);
      page.drawText(sNumText, { x: 75 + (30 - sNumW) / 2, y: currentY - 10, size: 10, font: fontRegular });
      
      // Description wrapped
      let descY = currentY - 10;
      for (const descLine of descLines) {
        const procDesc = processBidiText(descLine);
        const lineW = fontRegular.widthOfTextAtSize(procDesc, 10);
        // Align to right side of Description column: 105 + 230 = 335.
        // Padding right = 5. So rightmost X = 330.
        page.drawText(procDesc, { x: 330 - lineW, y: descY, size: 10, font: fontRegular });
        descY -= 15;
      }
      
      // Qty
      const qtyText = String(item.qty || 0);
      const qtyW = fontRegular.widthOfTextAtSize(qtyText, 10);
      page.drawText(qtyText, { x: 335 + (50 - qtyW) / 2, y: currentY - 10, size: 10, font: fontRegular });
      
      // Price
      const priceVal = (item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const priceW = fontRegular.widthOfTextAtSize(priceVal, 10);
      page.drawText(priceVal, { x: 385 + (65 - priceW) / 2, y: currentY - 10, size: 10, font: fontRegular });
      
      // Total
      const totalVal = ((item.qty || 0) * (item.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totalW = fontRegular.widthOfTextAtSize(totalVal, 10);
      page.drawText(totalVal, { x: 450 + (70 - totalW) / 2, y: currentY - 10, size: 10, font: fontRegular });
      
      currentY -= rowHeight;
    }
    
    // Draw final table borders
    page.drawLine({ start: { x: 75, y: tableTopY }, end: { x: 75, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
    page.drawLine({ start: { x: 105, y: tableTopY }, end: { x: 105, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
    page.drawLine({ start: { x: 335, y: tableTopY }, end: { x: 335, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
    page.drawLine({ start: { x: 385, y: tableTopY }, end: { x: 385, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
    page.drawLine({ start: { x: 450, y: tableTopY }, end: { x: 450, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
    page.drawLine({ start: { x: 520, y: tableTopY }, end: { x: 520, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
    page.drawLine({ start: { x: 75, y: currentY + 15 }, end: { x: 520, y: currentY + 15 }, thickness: 1, color: rgb(180/255, 180/255, 180/255) });
    
    currentY += 10;
    
    // Calculations
    const subtotal = items.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0);
    const discount = parseFloat(quotationData.discountValue) || 0;
    let grandTotal = subtotal;
    if (quotationData.discountType === 'percent') {
      grandTotal = Math.max(0, subtotal - (subtotal * (discount / 100)));
    } else {
      grandTotal = Math.max(0, subtotal - discount);
    }
    
    if (currentY - 100 < 130) {
      page = pdfDoc.addPage([595, 842]);
      page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
      currentY = 660;
    }
    
    // Subtotal
    const subtotalLabel = processBidiText("المجموع الفرعي:");
    const subtotalText = subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + quotationData.currency;
    const subtotalValText = processBidiText(subtotalText);
    const subW = fontRegular.widthOfTextAtSize(subtotalValText, 10);
    page.drawText(subtotalLabel, { x: 340, y: currentY - 15, size: 10, font: fontBold });
    page.drawText(subtotalValText, { x: 520 - subW - 5, y: currentY - 15, size: 10, font: fontRegular });
    currentY -= 20;
    
    // Discount
    if (discount > 0) {
      const discountLabel = processBidiText("الخصم المطبق:");
      const discText = quotationData.discountType === 'percent'
        ? `${discount}% (-${(subtotal * (discount / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        : `-${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const discountValText = processBidiText(discText + " " + quotationData.currency);
      const discW = fontRegular.widthOfTextAtSize(discountValText, 10);
      page.drawText(discountLabel, { x: 340, y: currentY - 10, size: 10, font: fontBold });
      page.drawText(discountValText, { x: 520 - discW - 5, y: currentY - 10, size: 10, font: fontRegular });
      currentY -= 20;
    }
    
    // Grand Total box and label
    page.drawRectangle({
      x: 335,
      y: currentY - 15,
      width: 185,
      height: 22,
      color: rgb(230/255, 230/255, 230/255)
    });
    
    const grandLabel = processBidiText("الإجمالي الكلي:");
    const grandText = grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + quotationData.currency;
    const grandValText = processBidiText(grandText);
    const grandW = fontBold.widthOfTextAtSize(grandValText, 10);
    
    page.drawText(grandLabel, { x: 340, y: currentY - 10, size: 10, font: fontBold });
    page.drawText(grandValText, { x: 520 - grandW - 5, y: currentY - 10, size: 10, font: fontBold });
    currentY -= 25;
    
    // Tafqeet text
    const tafqeetText = tafqeet(grandTotal, quotationData.currency);
    const tafqeetLine = processBidiText(tafqeetText);
    const tafqeetW = fontBold.widthOfTextAtSize(tafqeetLine, 11);
    page.drawText(tafqeetLine, {
      x: 520 - tafqeetW,
      y: currentY - 10,
      size: 11,
      font: fontBold,
      color: rgb(26/255, 35/255, 126/255)
    });
    currentY -= 30;
    
    // Terms & Conditions block
    if (currentY - 60 < 130) {
      page = pdfDoc.addPage([595, 842]);
      page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
      currentY = 660;
    }
    
    const validityLabel = processBidiText("صلاحية العرض:");
    const validityVal = processBidiText(quotationData.validity || '');
    const validityLabelW = fontBold.widthOfTextAtSize(validityLabel, 10);
    const validityValW = fontRegular.widthOfTextAtSize(validityVal, 10);
    page.drawText(validityLabel, { x: 520 - validityLabelW, y: currentY, size: 10, font: fontBold });
    page.drawText(validityVal, { x: 520 - validityLabelW - validityValW - 6, y: currentY, size: 10, font: fontRegular });
    currentY -= 18;
    
    const paymentLabel = processBidiText("شروط الدفع:");
    const paymentVal = processBidiText(quotationData.paymentTerms || '');
    const paymentLabelW = fontBold.widthOfTextAtSize(paymentLabel, 10);
    const paymentValW = fontRegular.widthOfTextAtSize(paymentVal, 10);
    page.drawText(paymentLabel, { x: 520 - paymentLabelW, y: currentY, size: 10, font: fontBold });
    page.drawText(paymentVal, { x: 520 - paymentLabelW - paymentValW - 6, y: currentY, size: 10, font: fontRegular });
    currentY -= 20;
    
    if (quotationData.notes) {
      const noteLabel = processBidiText("شروط وملاحظات إضافية:");
      const noteLabelW = fontBold.widthOfTextAtSize(noteLabel, 10);
      page.drawText(noteLabel, { x: 520 - noteLabelW, y: currentY, size: 10, font: fontBold });
      currentY -= 15;
      
      const notesLines = wrapText(quotationData.notes, 445, fontRegular, 10);
      for (const noteLine of notesLines) {
        if (currentY - 15 < 130) {
          page = pdfDoc.addPage([595, 842]);
          page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
          currentY = 660;
        }
        const procNote = processBidiText(noteLine);
        const noteW = fontRegular.widthOfTextAtSize(procNote, 10);
        page.drawText(procNote, { x: 520 - noteW, y: currentY, size: 10, font: fontRegular });
        currentY -= 15;
      }
    }
    
    currentY -= 20;
    
    // Closing
    if (currentY - 30 < 130) {
      page = pdfDoc.addPage([595, 842]);
      page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
      currentY = 660;
    }
    const closingText = processBidiText("شاكرين لكم حسن تعاونكم واهتمامكم،،");
    const closingW = fontBold.widthOfTextAtSize(closingText, 13);
    page.drawText(closingText, { x: (595 - closingW) / 2, y: currentY, size: 13, font: fontBold });
    currentY -= 40;
  }
  
  // ==========================================
  // SIGNATORY & STAMP (COMMON FOR BOTH)
  // ==========================================
  
  if (currentY - 120 < 130) {
    page = pdfDoc.addPage([595, 842]);
    page.drawImage(backgroundJpg, { x: 0, y: 0, width: 595, height: 842 });
    currentY = 660;
  }
  
  const signatureMarginTop = formData.signatureMarginTop !== undefined ? formData.signatureMarginTop : 40;
  currentY -= (signatureMarginTop / 2); // adapt to range offset safely
  
  const signTitleText = processBidiText(formData.signatoryTitle || '');
  const signNameText = processBidiText(formData.signatoryName || '');
  const sTitleW = fontBold.widthOfTextAtSize(signTitleText, 14);
  const sNameW = fontBold.widthOfTextAtSize(signNameText, 13);
  
  // Center signature block inside X = [75, 275]
  const blockCenterX = 75 + 100; // 175
  const titleX = blockCenterX - (sTitleW / 2);
  const nameX = blockCenterX - (sNameW / 2);
  
  page.drawText(signTitleText, { x: titleX, y: currentY, size: 14, font: fontBold });
  page.drawText(signNameText, { x: nameX, y: currentY - 20, size: 13, font: fontBold });
  
  // Stamp Image Drawing
  if (formData.includeStamp) {
    const stampImgBytes = await fetchAsset(isPetro ? petroStamp : mbtkronStamp);
    const stampPng = await pdfDoc.embedPng(stampImgBytes);
    const stampWidth = 100;
    const stampHeight = 100;
    const stampX = blockCenterX - (stampWidth / 2) - 15;
    const stampY = currentY - 55;
    page.drawImage(stampPng, {
      x: stampX,
      y: stampY,
      width: stampWidth,
      height: stampHeight,
      opacity: 0.85
    });
  }
  
  // Save and return bytes
  return await pdfDoc.save();
}

export async function generatePDF({ company, formData, mode, quotationData }) {
  const pdfBytes = await generatePDFBytes({ company, formData, mode, quotationData });
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  
  const docTypeName = mode === 'letter' ? 'Official_Letter' : 'Quotation';
  const companyName = company === 'Petro South' ? 'PetroSouth' : 'MBTKRON';
  link.download = `${companyName}_${docTypeName}_${formData.refNumber || 'Draft'}.pdf`;
  link.click();
}
