import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Use standard CDN or bundled worker for pdfjs-dist
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

/**
 * Extract clean textual content from uploaded PDF, Word (docx), or Text files
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();

  if (extension === 'txt') {
    return await file.text();
  }

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value ? result.value.trim() : '';
  }

  if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      if (pageText.trim()) {
        fullText += `--- [صفحة ${i}] ---\n${pageText.trim()}\n\n`;
      }
    }
    return fullText.trim();
  }

  throw new Error('نوع الملف غير مدعوم. يرجى رفع ملف بصيغة PDF أو Word (.docx) أو Text (.txt)');
}
