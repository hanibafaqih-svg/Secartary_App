const https = require('https');

const urls = [
  'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo%5Bwght%5D.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/static/Cairo-Regular.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/static/Cairo-Bold.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/static/Amiri-Regular.ttf',
  'https://github.com/google/fonts/raw/main/ofl/cairo/Cairo%5Bwght%5D.ttf',
  'https://github.com/google/fonts/raw/main/ofl/tajawal/Tajawal-Regular.ttf'
];

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`URL: ${url} -> Status: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    }).on('error', (e) => {
      console.log(`URL: ${url} -> Error: ${e.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('Checking font URLs...');
  for (const url of urls) {
    await checkUrl(url);
  }
  console.log('Done.');
}

main();
