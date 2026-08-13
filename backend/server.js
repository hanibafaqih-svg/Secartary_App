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

// ─── CORS ───────────────────────────────────────────────────────────────────
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

// Multer – memory storage (required for Vercel serverless)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30 MB
});

// ─── GOOGLE DRIVE HELPERS ───────────────────────────────────────────────────

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
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
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
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    if (res.data.files.length > 0) return res.data.files[0].id;
  } catch (_) { /* fall through to create */ }

  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
    supportsAllDrives: true
  });
  return folder.data.id;
}

async function fileExists(drive, folderId, fileName) {
  const safe = fileName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name='${safe}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
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
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: false })
  });
  const data = await res.json();
  if (!data.ok) console.error('Telegram error:', data.description);
}

// ─── HEALTH CHECK ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!process.env.GEMINI_API_KEY,
    drive: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_GROUP_ID),
    timestamp: new Date().toISOString()
  });
});

// ─── FINALIZE & SAVE ────────────────────────────────────────────────────────
app.post('/api/finalize', upload.single('pdf'), async (req, res) => {
  try {
    const { company, refNumber, clientOrSubject, documentType, userEmail } = req.body;
    const pdfBuffer = req.file?.buffer;

    if (!pdfBuffer)           return res.status(400).json({ error: 'لم يتم إرفاق ملف PDF.' });
    if (!company)             return res.status(400).json({ error: 'اسم الشركة مطلوب.' });
    if (!refNumber)           return res.status(400).json({ error: 'الرقم المرجعي مطلوب.' });
    if (!documentType)        return res.status(400).json({ error: 'نوع الوثيقة مطلوب.' });

    const isPetro = company === 'Petro South';
    const rootId  = isPetro ? process.env.PETRO_SOUTH_DRIVE_FOLDER_ID : process.env.MBTKRON_DRIVE_FOLDER_ID;
    if (!rootId) return res.status(500).json({ error: `مجلد Drive غير معرَّف للشركة: ${company}` });

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
        error: `الملف "${fileName}" موجود مسبقاً في الأرشيف لهذا الشهر. يُرجى تعديل الرقم المرجعي إن كانت وثيقة مختلفة.`
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
      fields: 'id, webViewLink',
      supportsAllDrives: true
    });

    const fileId    = uploaded.data.id;
    const driveLink = uploaded.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    // Make readable by anyone with link
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true
    }).catch(err => console.warn('Permission grant warning:', err.message));

    // Telegram notification (fire-and-forget)
    const companyLabel = isPetro ? 'بيترو ساوث (Petro South)' : 'المبتكرون العرب (MBTKRON)';
    let typeLabel = '📂 خطاب رسمي';
    if (documentType === 'Quotation') typeLabel = '📊 عرض سعر';
    else if (documentType === 'Invoice') typeLabel = '🧾 فاتورة';
    const dateStr      = now.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Aden' });

    const tgMsg = [
      `📁 تمت أرشفة وثيقة جديدة`,
      ``,
      `🏢 الشركة: ${companyLabel}`,
      `${typeLabel}`,
      `🔢 الرقم المرجعي: ${refNumber}`,
      `👤 العميل / المرسل إليه: ${clientOrSubject || 'غير محدد'}`,
      `📅 التاريخ: ${dateStr}`,
      `✉️ رُفع بواسطة: ${userEmail || 'unknown'}`,
      ``,
      `🔗 رابط فتح الوثيقة في Google Drive:`,
      driveLink
    ].join('\n');

    sendTelegram(tgMsg).catch(err => console.error('Telegram failed (non-blocking):', err.message));

    console.log(`[FINALIZE] ✅ ${userEmail} → ${company} → ${year}/${month}/${typeFolder}/${fileName}`);

    return res.json({ success: true, fileName, driveLink, fileId, path: `${year}/${month}/${typeFolder}/${fileName}` });

  } catch (err) {
    console.error('[FINALIZE] ❌', err);
    return res.status(500).json({ error: 'حدث خطأ أثناء رفع الملف إلى Google Drive.', details: err.message });
  }
});

// ─── AI LETTER GENERATION ───────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
let ai;
if (apiKey) ai = new GoogleGenerativeAI(apiKey);

app.post('/api/generate-letter', async (req, res) => {
  const { prompt, company, tone = 'formal', recipient = '', subject = '' } = req.body;

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ error: 'الرجاء إدخال موضوع الرسالة.' });
  }
  if (!apiKey || !ai) {
    return res.status(500).json({ error: 'مفتاح Gemini API غير مبرمج في الخادم.' });
  }

  try {
    const companyContext = company === 'Petro South'
      ? 'شركة بيترو ساوث (Petro South) - وهي شركة متخصصة في قطاع النفط والغاز والخدمات البترولية واللوجستية.'
      : 'شركة المبتكرون العرب (MBTKRON Arab) - وهي شركة رائدة في المقاولات العامة والخدمات الهندسية والطاقة البديلة.';

    const systemPrompt = `
أنت مساعد ذكاء اصطناعي محترف متخصص في صياغة الرسائل والخطابات الرسمية للشركات باللغة العربية الفصحى.
سياق الشركة الحالية: ${companyContext}
${recipient ? `الجهة المرسل إليها: ${recipient}` : ''}
${subject ? `موضوع الخطاب: ${subject}` : ''}

المطلوب منك:
كتابة نص الرسالة الأساسي (مضمون الخطاب) بأسلوب مهني ومقنع، ومكتوب بلغة عربية فصحى بليغة وخالية تماماً من الأخطاء الإملائية والنحوية.

قواعد الصياغة الهامة جداً:
1. اكتب فقط فقرات المضمون الأساسي للخطاب (عادة من فقرتين إلى ثلاث فقرات متناسقة).
2. لا تكتب البسملة ("بسم الله الرحمن الرحيم") في البداية.
3. لا تكتب اسم المرسل إليه أو الترحيب الافتتاحي.
4. لا تكتب سطر الموضوع.
5. لا تكتب عبارة الختام.
6. لا تكتب حقل التوقيع أو اسم المدير أو الختم في النهاية.
7. جميع هذه العناصر تُضاف تلقائياً بواسطة قالب النظام.
8. ابدأ مباشرة بكتابة نص الفقرة الأولى (نبرة: ${tone === 'urgent' ? 'عاجلة وهامة جداً' : 'رسمية ومهنية'}).
9. لا تستخدم علامات Markdown.
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
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nالموضوع:\n${prompt}` }] }],
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
      res.status(500).json({ error: 'حدث خطأ أثناء معالجة طلبك مع الذكاء الاصطناعي.', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// ─── START ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
