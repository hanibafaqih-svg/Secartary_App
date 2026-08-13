import fs from 'fs';

const filePath = 'd:\\Hani\\Antigravity_Apps\\Secartary_App\\frontend\\src\\assets\\petro_south_letterhead.jpg';

function getJpegDimensions(path) {
  const buffer = fs.readFileSync(path);
  let i = 0;
  if (buffer[i] !== 0xFF || buffer[i+1] !== 0xD8) return null;
  i += 2;
  while (i < buffer.length) {
    while (buffer[i] !== 0xFF) i++;
    let marker = buffer[i+1];
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      let height = buffer.readUInt16BE(i + 5);
      let width = buffer.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + buffer.readUInt16BE(i + 2);
  }
  return null;
}

const stats = fs.statSync(filePath);
console.log("Petro South Letterhead file size:", stats.size, "bytes");
console.log("Dimensions:", getJpegDimensions(filePath));
