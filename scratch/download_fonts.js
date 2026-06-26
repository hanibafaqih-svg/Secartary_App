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

  // Cairo font files
  const regularUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Regular.ttf';
  const boldUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Bold.ttf';

  const regularDest = path.join(publicDir, 'Cairo-Regular.ttf');
  const boldDest = path.join(publicDir, 'Cairo-Bold.ttf');

  console.log('Downloading fonts to public folder...');
  try {
    await downloadFile(regularUrl, regularDest);
    await downloadFile(boldUrl, boldDest);
    console.log('Fonts downloaded successfully.');
  } catch (error) {
    console.error('Error downloading fonts:', error.message);
  }
}

main();
