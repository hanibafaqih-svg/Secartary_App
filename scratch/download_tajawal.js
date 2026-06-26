const fs = require('fs');
const path = require('path');
const https = require('https');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (Status Code: ${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const publicDir = path.resolve(__dirname, '..', 'frontend', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const regularUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf';
  const boldUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf';

  const regularDest = path.join(publicDir, 'Tajawal-Regular.ttf');
  const boldDest = path.join(publicDir, 'Tajawal-Bold.ttf');

  console.log('Downloading Tajawal fonts to public folder...');
  try {
    await downloadFile(regularUrl, regularDest);
    await downloadFile(boldUrl, boldDest);
    console.log('Tajawal fonts downloaded successfully.');
  } catch (error) {
    console.error('Error downloading fonts:', error.message);
  }
}

main();
