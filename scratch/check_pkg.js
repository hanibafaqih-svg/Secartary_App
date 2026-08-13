import fs from 'fs';

// Check installed packages in frontend and backend node_modules
function checkPackage(pkg) {
  try {
    import.meta.resolve(pkg);
    console.log(`Package ${pkg}: AVAILABLE`);
  } catch (e) {
    console.log(`Package ${pkg}: not found`);
  }
}

['pdfjs-dist', 'canvas', 'sharp', 'pdf2img', 'pdf-poppler', 'puppeteer', 'playwright'].forEach(checkPackage);
