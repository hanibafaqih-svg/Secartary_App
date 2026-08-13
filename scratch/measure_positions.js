import { Jimp } from 'jimp';

async function measure() {
  const petro = await Jimp.read('d:\\Hani\\Antigravity_Apps\\Secartary_App\\frontend\\src\\assets\\petro_south_letterhead.jpg');
  const mbtkron = await Jimp.read('d:\\Hani\\Antigravity_Apps\\Secartary_App\\frontend\\src\\assets\\mbtkron_letterhead.jpg');

  console.log(`Petro: ${petro.bitmap.width}x${petro.bitmap.height}`);
  console.log(`MBTKRON: ${mbtkron.bitmap.width}x${mbtkron.bitmap.height}`);

  // Petro: scan right side for "Date:" text (dark pixels in upper-right)
  console.log('\n--- PETRO SOUTH: Scanning upper-right for Date/Ref text ---');
  for (let y = 100; y < 250; y += 2) {
    let firstDarkX = -1, lastDarkX = -1, darkCount = 0;
    for (let x = 700; x < petro.bitmap.width - 20; x++) {
      const color = petro.getPixelColor(x, y);
      const r = (color >> 24) & 255;
      const g = (color >> 16) & 255;
      const b = (color >> 8) & 255;
      if ((r + g + b) / 3 < 80) {
        darkCount++;
        if (firstDarkX === -1) firstDarkX = x;
        lastDarkX = x;
      }
    }
    if (darkCount > 5 && darkCount < 200) {
      const topPct = (y / petro.bitmap.height * 100).toFixed(2);
      const leftPct = (firstDarkX / petro.bitmap.width * 100).toFixed(2);
      const rightPct = (100 - (lastDarkX / petro.bitmap.width * 100)).toFixed(2);
      console.log(`Y=${y} (top:${topPct}%) | X range: ${firstDarkX}..${lastDarkX} (left:${leftPct}%, right-edge:${rightPct}%) | dark:${darkCount}`);
    }
  }

  // MBTKRON: scan right side for "Date:" text
  console.log('\n--- MBTKRON: Scanning upper-right for Date/Ref text ---');
  for (let y = 30; y < 120; y += 2) {
    let firstDarkX = -1, lastDarkX = -1, darkCount = 0;
    for (let x = 450; x < mbtkron.bitmap.width - 20; x++) {
      const color = mbtkron.getPixelColor(x, y);
      const r = (color >> 24) & 255;
      const g = (color >> 16) & 255;
      const b = (color >> 8) & 255;
      if ((r + g + b) / 3 < 80) {
        darkCount++;
        if (firstDarkX === -1) firstDarkX = x;
        lastDarkX = x;
      }
    }
    if (darkCount > 5 && darkCount < 200) {
      const topPct = (y / mbtkron.bitmap.height * 100).toFixed(2);
      const leftPct = (firstDarkX / mbtkron.bitmap.width * 100).toFixed(2);
      const rightPct = (100 - (lastDarkX / mbtkron.bitmap.width * 100)).toFixed(2);
      console.log(`Y=${y} (top:${topPct}%) | X range: ${firstDarkX}..${lastDarkX} (left:${leftPct}%, right-edge:${rightPct}%) | dark:${darkCount}`);
    }
  }
}

measure().catch(console.error);
