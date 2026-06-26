import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { Readable } from 'stream';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// â”€â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173', 'http://localhost:5174',
      'http://127.0.0.1:5173', 'http://127.0.0.1:5174'
    ];
    if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Multer â€“ memory storage (required for Vercel serverless)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30 MB
});

// â”€â”€â”€ GOOGLE DRIVE HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

function sanitizeForFilename(str) {
  if (!str) return 'unknown';
  return str
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 80)
    .trim();
}

async function initDrive() {
  const saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var not set');
  const credentials = JSON.parse(saRaw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  return google.drive({ version: 'v3', auth });
}

async function getOrCreateFolder(drive, parentId, name) {
  const safe = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  try {
    const res = await drive.files.list({
      q: `name='${safe}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive'
    });
    if (res.data.files.length > 0) return res.data.files[0].id;
  } catch (_) { /* fall through to create */ }

  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id'
  });
  return folder.data.id;
}

async function fileExists(drive, folderId, fileName) {
  const safe = fileName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name='${safe}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)'
  });
  return res.data.files.length > 0;
}

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_GROUP_ID;
  if (!token || !chatId) { console.warn('Telegram not configured, skipping.'); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: false })
  });
  const data = await res.json();
  if (!data.ok) console.error('Telegram error:', data.description);
}

// â”€â”€â”€ HEALTH CHECK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!process.env.GEMINI_API_KEY,
    drive: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_GROUP_ID),
    timestamp: new Date().toISOString()
  });
});

// â”€â”€â”€ FINALIZE & SAVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/finalize', upload.single('pdf'), async (req, res) => {
  try {
    const { company, refNumber, clientOrSubject, documentType, userEmail } = req.body;
    const pdfBuffer = req.file?.buffer;

    if (!pdfBuffer)           return res.status(400).json({ error: 'ظ„ظ… ظٹطھظ… ط¥ط±ظپط§ظ‚ ظ…ظ„ظپ PDF.' });
    if (!company)             return res.status(400).json({ error: 'ط§ط³ظ… ط§ظ„ط´ط±ظƒط© ظ…ط·ظ„ظˆط¨.' });
    if (!refNumber)           return res.status(400).json({ error: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط±ط¬ط¹ظٹ ظ…ط·ظ„ظˆط¨.' });
    if (!documentType)        return res.status(400).json({ error: 'ظ†ظˆط¹ ط§ظ„ظˆط«ظٹظ‚ط© ظ…ط·ظ„ظˆط¨.' });

    const isPetro = company === 'Petro South';
    const rootId  = isPetro ? process.env.PETRO_SOUTH_DRIVE_FOLDER_ID : process.env.MBTKRON_DRIVE_FOLDER_ID;
    if (!rootId) return res.status(500).json({ error: `ظ…ط¬ظ„ط¯ Drive ط؛ظٹط± ظ…ط¹ط±ظژظ‘ظپ ظ„ظ„ط´ط±ظƒط©: ${company}` });

    // Build folder path: [Root]/[YYYY]/[MM]/[Letters|Quotations]
    const now        = new Date();
    const year       = String(now.getFullYear());
    const month      = String(now.getMonth() + 1).padStart(2, '0');
    const typeFolder = documentType === 'Letter' ? 'Letters' : 'Quotations';

    // Construct filename
    const fileName = `${sanitizeForFilename(refNumber)}_${sanitizeForFilename(clientOrSubject || 'unknown')}.pdf`;

    // Connect to Drive and navigate/create folder hierarchy
    const drive        = await initDrive();
    const yearId       = await getOrCreateFolder(drive, rootId, year);
    const monthId      = await getOrCreateFolder(drive, yearId, month);
    const typeFolderId = await getOrCreateFolder(drive, monthId, typeFolder);

    // Duplicate check (refNumber + company + month)
    if (await fileExists(drive, typeFolderId, fileName)) {
      return res.status(409).json({
        duplicate: true,
        error: `ط§ظ„ظ…ظ„ظپ "${fileName}" ظ…ظˆط¬ظˆط¯ ظ…ط³ط¨ظ‚ط§ظ‹ ظپظٹ ط§ظ„ط£ط±ط´ظٹظپ ظ„ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±. ظٹظڈط±ط¬ظ‰ طھط¹ط¯ظٹظ„ ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط±ط¬ط¹ظٹ ط¥ظ† ظƒط§ظ†طھ ظˆط«ظٹظ‚ط© ظ…ط®طھظ„ظپط©.`
      });
    }

    // Upload PDF
    const uploaded = await drive.files.create({
      requestBody: {
        name:        fileName,
        parents:     [typeFolderId],
        description: `Archived by ${userEmail || 'unknown'} on ${now.toISOString()}`
      },
      media: {
        mimeType: 'application/pdf',
        body:     bufferToStream(pdfBuffer)
      },
      fields: 'id, webViewLink'
    });

    const fileId    = uploaded.data.id;
    const driveLink = uploaded.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    // Make readable by anyone with link
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' }
    }).catch(err => console.warn('Permission grant warning:', err.message));

    // Telegram notification (fire-and-forget)
    const companyLabel = isPetro ? 'ط¨ظٹطھط±ظˆ ط³ط§ظˆط« (Petro South)' : 'ط§ظ„ظ…ط¨طھظƒط±ظˆظ† ط§ظ„ط¹ط±ط¨ (MBTKRON)';
    const typeLabel    = documentType === 'Letter' ? 'ًں“‌ ط®ط·ط§ط¨ ط±ط³ظ…ظٹ' : 'ًں“ٹ ط¹ط±ط¶ ط³ط¹ط±';
    const dateStr      = now.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Aden' });

    const tgMsg = [
      `ًں“پ <b>طھظ…طھ ط£ط±ط´ظپط© ظˆط«ظٹظ‚ط© ط¬ط¯ظٹط¯ط©</b>`,
      ``,
      `ًںڈ¢ <b>ط§ظ„ط´ط±ظƒط©:</b> ${companyLabel}`,
      `${typeLabel}`,
      `ًں”¢ <b>ط§ظ„ط±ظ‚ظ… ط§ظ„ظ…ط±ط¬ط¹ظٹ:</b> <code>${refNumber}</code>`,
      `ًں‘¤ <b>ط§ظ„ط¹ظ…ظٹظ„ / ط§ظ„ظ…ط±ط³ظ„ ط¥ظ„ظٹظ‡:</b> ${clientOrSubject || 'ط؛ظٹط± ظ…ط­ط¯ط¯'}`,
      `ًں“… <b>ط§ظ„طھط§ط±ظٹط®:</b> ${dateStr}`,
      `âœ‰ï¸ڈ <b>ط±ظڈظپط¹ ط¨ظˆط§ط³ط·ط©:</b> ${userEmail || 'unknown'}`,
      ``,
      `ًں”— <a href="${driveLink}">ظپطھط­ ط§ظ„ظˆط«ظٹظ‚ط© ظپظٹ Google Drive</a>`
    ].join('\n');

    sendTelegram(tgMsg).catch(err => console.error('Telegram failed (non-blocking):', err.message));

    console.log(`[FINALIZE] âœ… ${userEmail} â†’ ${company} â†’ ${year}/${month}/${typeFolder}/${fileName}`);

    return res.json({ success: true, fileName, driveLink, fileId, path: `${year}/${month}/${typeFolder}/${fileName}` });

  } catch (err) {
    console.error('[FINALIZE] â‌Œ', err);
    return res.status(500).json({ error: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط±ظپط¹ ط§ظ„ظ…ظ„ظپ ط¥ظ„ظ‰ Google Drive.', details: err.message });
  }
});

// â”€â”€â”€ AI LETTER GENERATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const apiKey = process.env.GEMINI_API_KEY;
let ai;
if (apiKey) ai = new GoogleGenerativeAI(apiKey);

app.post('/api/generate-letter', async (req, res) => {
  const { prompt, company, tone = 'formal', recipient = '', subject = '' } = req.body;

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ error: 'ط§ظ„ط±ط¬ط§ط، ط¥ط¯ط®ط§ظ„ ظ…ظˆط¶ظˆط¹ ط§ظ„ط±ط³ط§ظ„ط©.' });
  }
  if (!apiKey || !ai) {
    return res.status(500).json({ error: 'ظ…ظپطھط§ط­ Gemini API ط؛ظٹط± ظ…ط¨ط±ظ…ط¬ ظپظٹ ط§ظ„ط®ط§ط¯ظ….' });
  }

  try {
    const companyContext = company === 'Petro South'
      ? 'ط´ط±ظƒط© ط¨ظٹطھط±ظˆ ط³ط§ظˆط« (Petro South) - ظˆظ‡ظٹ ط´ط±ظƒط© ظ…طھط®طµطµط© ظپظٹ ظ‚ط·ط§ط¹ ط§ظ„ظ†ظپط· ظˆط§ظ„ط؛ط§ط² ظˆط§ظ„ط®ط¯ظ…ط§طھ ط§ظ„ط¨طھط±ظˆظ„ظٹط© ظˆط§ظ„ظ„ظˆط¬ط³طھظٹط©.'
      : 'ط´ط±ظƒط© ط§ظ„ظ…ط¨طھظƒط±ظˆظ† ط§ظ„ط¹ط±ط¨ (MBTKRON Arab) - ظˆظ‡ظٹ ط´ط±ظƒط© ط±ط§ط¦ط¯ط© ظپظٹ ط§ظ„ظ…ظ‚ط§ظˆظ„ط§طھ ط§ظ„ط¹ط§ظ…ط© ظˆط§ظ„ط®ط¯ظ…ط§طھ ط§ظ„ظ‡ظ†ط¯ط³ظٹط© ظˆط§ظ„ط·ط§ظ‚ط© ط§ظ„ط¨ط¯ظٹظ„ط©.';

    const systemPrompt = `
ط£ظ†طھ ظ…ط³ط§ط¹ط¯ ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ ظ…ط­طھط±ظپ ظ…طھط®طµطµ ظپظٹ طµظٹط§ط؛ط© ط§ظ„ط±ط³ط§ط¦ظ„ ظˆط§ظ„ط®ط·ط§ط¨ط§طھ ط§ظ„ط±ط³ظ…ظٹط© ظ„ظ„ط´ط±ظƒط§طھ ط¨ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ظپطµط­ظ‰.
ط³ظٹط§ظ‚ ط§ظ„ط´ط±ظƒط© ط§ظ„ط­ط§ظ„ظٹط©: ${companyContext}
${recipient ? `ط§ظ„ط¬ظ‡ط© ط§ظ„ظ…ط±ط³ظ„ ط¥ظ„ظٹظ‡ط§: ${recipient}` : ''}
${subject ? `ظ…ظˆط¶ظˆط¹ ط§ظ„ط®ط·ط§ط¨: ${subject}` : ''}

ط§ظ„ظ…ط·ظ„ظˆط¨ ظ…ظ†ظƒ:
ظƒطھط§ط¨ط© ظ†طµ ط§ظ„ط±ط³ط§ظ„ط© ط§ظ„ط£ط³ط§ط³ظٹ (ظ…ط¶ظ…ظˆظ† ط§ظ„ط®ط·ط§ط¨) ط¨ط£ط³ظ„ظˆط¨ ظ…ظ‡ظ†ظٹ ظˆظ…ظ‚ظ†ط¹طŒ ظˆظ…ظƒطھظˆط¨ ط¨ظ„ط؛ط© ط¹ط±ط¨ظٹط© ظپطµط­ظ‰ ط¨ظ„ظٹط؛ط© ظˆط®ط§ظ„ظٹط© طھظ…ط§ظ…ط§ظ‹ ظ…ظ† ط§ظ„ط£ط®ط·ط§ط، ط§ظ„ط¥ظ…ظ„ط§ط¦ظٹط© ظˆط§ظ„ظ†ط­ظˆظٹط©.

ظ‚ظˆط§ط¹ط¯ ط§ظ„طµظٹط§ط؛ط© ط§ظ„ظ‡ط§ظ…ط© ط¬ط¯ط§ظ‹:
1. ط§ظƒطھط¨ ظپظ‚ط· ظپظ‚ط±ط§طھ ط§ظ„ظ…ط¶ظ…ظˆظ† ط§ظ„ط£ط³ط§ط³ظٹ ظ„ظ„ط®ط·ط§ط¨ (ط¹ط§ط¯ط© ظ…ظ† ظپظ‚ط±طھظٹظ† ط¥ظ„ظ‰ ط«ظ„ط§ط« ظپظ‚ط±ط§طھ ظ…طھظ†ط§ط³ظ‚ط©).
2. ظ„ط§ طھظƒطھط¨ ط§ظ„ط¨ط³ظ…ظ„ط© ("ط¨ط³ظ… ط§ظ„ظ„ظ‡ ط§ظ„ط±ط­ظ…ظ† ط§ظ„ط±ط­ظٹظ…") ظپظٹ ط§ظ„ط¨ط¯ط§ظٹط©.
3. ظ„ط§ طھظƒطھط¨ ط§ط³ظ… ط§ظ„ظ…ط±ط³ظ„ ط¥ظ„ظٹظ‡ ط£ظˆ ط§ظ„طھط±ط­ظٹط¨ ط§ظ„ط§ظپطھطھط§ط­ظٹ.
4. ظ„ط§ طھظƒطھط¨ ط³ط·ط± ط§ظ„ظ…ظˆط¶ظˆط¹.
5. ظ„ط§ طھظƒطھط¨ ط¹ط¨ط§ط±ط© ط§ظ„ط®طھط§ظ….
6. ظ„ط§ طھظƒطھط¨ ط­ظ‚ظ„ ط§ظ„طھظˆظ‚ظٹط¹ ط£ظˆ ط§ط³ظ… ط§ظ„ظ…ط¯ظٹط± ط£ظˆ ط§ظ„ط®طھظ… ظپظٹ ط§ظ„ظ†ظ‡ط§ظٹط©.
7. ط¬ظ…ظٹط¹ ظ‡ط°ظ‡ ط§ظ„ط¹ظ†ط§طµط± طھظڈط¶ط§ظپ طھظ„ظ‚ط§ط¦ظٹط§ظ‹ ط¨ظˆط§ط³ط·ط© ظ‚ط§ظ„ط¨ ط§ظ„ظ†ط¸ط§ظ….
8. ط§ط¨ط¯ط£ ظ…ط¨ط§ط´ط±ط© ط¨ظƒطھط§ط¨ط© ظ†طµ ط§ظ„ظپظ‚ط±ط© ط§ظ„ط£ظˆظ„ظ‰ (ظ†ط¨ط±ط©: ${tone === 'urgent' ? 'ط¹ط§ط¬ظ„ط© ظˆظ‡ط§ظ…ط© ط¬ط¯ط§ظ‹' : 'ط±ط³ظ…ظٹط© ظˆظ…ظ‡ظ†ظٹط©'}).
9. ظ„ط§ طھط³طھط®ط¯ظ… ط¹ظ„ط§ظ…ط§طھ Markdown.
`;

    const candidateModels = [
      'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest'
    ];

    let result = null;
    let selectedModel = '';
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`Attempting letter generation with model: ${modelName}`);
        const model = ai.getGenerativeModel({ model: modelName });
        result = await model.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nط§ظ„ظ…ظˆط¶ظˆط¹:\n${prompt}` }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
        });
        selectedModel = modelName;
        break;
      } catch (err) {
        console.error(`Model ${modelName} failed:`, err.message || err);
        lastError = err;
      }
    }

    if (!result) throw new Error(`All Gemini models failed. Last: ${lastError?.message}`);
    console.log(`Streaming with model: ${selectedModel}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of result.stream) {
      res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error generating letter:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط¹ط§ظ„ط¬ط© ط·ظ„ط¨ظƒ ظ…ط¹ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ.', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// â”€â”€â”€ START â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.listen(PORT, () => {
  console.log(`âœ… Backend running on http://localhost:${PORT}`);
});

