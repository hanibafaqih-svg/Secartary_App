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

// ─── AI LETTER GENERATION & AUTO-FILL EXTRACTOR ───────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
let ai;
if (apiKey) ai = new GoogleGenerativeAI(apiKey);

app.post('/api/generate-letter', async (req, res) => {
  const { prompt = '', company, tone = 'formal', recipient = '', recipients = [], subject = '', attachedText = '' } = req.body;

  if (!prompt.trim() && !attachedText.trim()) {
    return res.status(400).json({ error: 'الرجاء إدخال موضوع الرسالة أو إرفاق ملف مستند للاستناد إليه.' });
  }
  if (!apiKey || !ai) {
    return res.status(500).json({ error: 'مفتاح Gemini API غير مبرمج في الخادم.' });
  }

  try {
    const companyContext = company === 'Petro South'
      ? 'شركة بيترو ساوث (Petro South) - متخصصة في الخدمات البترولية والنفط والغاز واللوجستيات.'
      : 'شركة المبتكرون العرب (MBTKRON Arab) - متخصصة في المقاولات العامة والخدمات الهندسية والطاقة البديلة.';

    const systemPrompt = `
أنت خبير ذكاء اصطناعي محترف متخصص في تحليل وفهم المستندات، واستخراج البيانات الرسمية، وصياغة الخطابات للشركات باللغة العربية الفصحى.

سياق الشركة: ${companyContext}
${recipient || (recipients && recipients.length) ? `المرسل إليهم المدخلين مسبقاً: ${[...recipients, recipient].filter(Boolean).join('، ')}` : ''}
${subject ? `الموضوع المدخل مسبقاً: ${subject}` : ''}

${attachedText ? `نص المستند المرفق للاستناد إليه واستخراج البيانات وصياغة الخطاب منه:\n"""\n${attachedText.slice(0, 20000)}\n"""` : ''}

توجيهات المستخدم الإضافية:
${prompt || 'استخرج بيانات الخطاب بالكامل (المرسل إليهم، الموضوع، ومضمون الخطاب) بناءً على المستند المرفق.'}

المطلوب منك بدقة:
1. استخراج الجهة أو الجهات المرسل إليها (recipients) كمصفوفة نصوص. إذا لم تكن مذكورة صراحة، استنتج جهة مناسبة أو استخدم الجهة المدخلة.
2. صياغة عنوان موضوع واضح ومهني ودقيق للخطاب (subject).
3. صياغة المضمون الأساسي الكامل للخطاب (content) بأسلوب مقنع ومحترف وبلغة عربية فصحى بليغة (نبرة: ${tone === 'urgent' ? 'عاجلة وهامة جداً' : 'رسمية ومهنية'}).
   - لا تكتب البسملة ("بسم الله الرحمن الرحيم").
   - لا تكتب سطر الموضوع داخل المضمون.
   - لا تكتب الترحيب الافتتاحي أو الخاتمة أو التوقيع لأن النظام يضيفها تلقائياً.

يجب أن تكون النتيجة حصراً بصيغة JSON مطابقة تماماً للمخطط التالي:
{
  "recipients": ["اسم الجهة أو الشخص 1", "اسم الجهة 2 (اختياري)"],
  "subject": "موضوع الخطاب الدقيق والمهني",
  "content": "نص المضمون الأساسي للخطاب..."
}
`;

    const candidateModels = [
      'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest'
    ];

    let result = null;
    let selectedModel = '';
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`Attempting structured letter generation with model: ${modelName}`);
        const model = ai.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4
          }
        });
        result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
        });
        selectedModel = modelName;
        break;
      } catch (err) {
        console.error(`Model ${modelName} failed:`, err.message || err);
        lastError = err;
      }
    }

    if (!result) throw new Error(`All Gemini models failed. Last: ${lastError?.message}`);
    
    const rawText = result.response.text();
    let parsedData;
    try {
      parsedData = JSON.parse(rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim());
    } catch (parseErr) {
      console.warn("JSON parse fallback for AI response:", rawText);
      parsedData = {
        recipients: recipient ? [recipient] : [],
        subject: subject || '',
        content: rawText
      };
    }

    res.json({
      success: true,
      recipients: Array.isArray(parsedData.recipients) && parsedData.recipients.length > 0 
        ? parsedData.recipients 
        : (parsedData.recipients ? [parsedData.recipients] : (recipient ? [recipient] : [])),
      subject: parsedData.subject || subject || '',
      content: parsedData.content || rawText
    });

  } catch (error) {
    console.error('Error generating letter:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء معالجة طلبك مع الذكاء الاصطناعي.', details: error.message });
  }
});

// ─── START ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
