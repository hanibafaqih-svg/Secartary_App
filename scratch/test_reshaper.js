try {
  const { reshape } = require('arabic-persian-reshaper');
  console.log('Shaping "مرحبا":', reshape('مرحبا'));
} catch (e) {
  console.log('CommonJS import failed:', e.message);
  try {
    const reshape = require('arabic-persian-reshaper');
    console.log('Default import shaping:', reshape('مرحبا'));
  } catch (err) {
    console.log('Both imports failed:', err.message);
  }
}
