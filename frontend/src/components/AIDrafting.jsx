import React, { useState, useRef } from 'react';
import { Sparkles, Send, AlertCircle, RefreshCw, UploadCloud, FileText, Trash2, CheckCircle2, FileCode } from 'lucide-react';
import { extractTextFromFile } from '../utils/fileParser';

export default function AIDrafting({ company, formData, onDraftGenerated, onDataExtracted }) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('formal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fileError, setFileError] = useState('');
  const [parsingFile, setParsingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    setSuccessMessage('');
    setParsingFile(true);

    try {
      const extractedText = await extractTextFromFile(file);
      if (!extractedText.trim()) {
        throw new Error('لم يتم العثور على نصوص قابلة للقراءة داخل هذا الملف.');
      }

      setAttachedFile({
        name: file.name,
        size: file.size,
        text: extractedText
      });
    } catch (err) {
      console.error('File parse error:', err);
      setFileError(err.message || 'فشل استخراج النصوص من الملف. يرجى تجربة ملف آخر.');
      setAttachedFile(null);
    } finally {
      setParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileError('');
    setSuccessMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim() && !attachedFile) {
      setError('الرجاء كتابة موضوع الخطاب أو إرفاق ملف مستند (PDF/Word/TXT) للاستناد إليه.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const effectivePrompt = prompt.trim();
      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: effectivePrompt,
          recipient: formData?.recipient || '',
          recipients: formData?.recipients || [],
          subject: formData?.subject || '',
          company,
          tone,
          attachedText: attachedFile?.text || ''
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'حدث خطأ أثناء معالجة طلبك مع الذكاء الاصطناعي.');
      }

      if (onDataExtracted) {
        onDataExtracted({
          recipients: data.recipients,
          subject: data.subject,
          content: data.content
        });
      } else if (onDraftGenerated) {
        onDraftGenerated(data.content);
      }

      setSuccessMessage('✨ تم تحليل البيانات وصياغة الخطاب وتعبئة النموذج تلقائياً بنجاح!');

    } catch (err) {
      console.error("AI Fetch Error: ", err);
      setError(err.message || 'فشلت عملية الصياغة. تأكد من تشغيل خادم الخلفية وإعداد مفتاح API بشكل صحيح.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-drafting-card glass-panel animate-fade-in">
      <div className="card-header">
        <div className="header-title">
          <Sparkles className="sparkle-icon" size={20} />
          <h3>مساعد الصياغة الذكي (AI)</h3>
        </div>
        <p className="card-subtitle">اكتب الفكرة الأساسية أو أرفق مستنداً مرجعياً وسيقوم الذكاء الاصطناعي بصياغة خطاب رسمي متكامل</p>
      </div>

      <form onSubmit={handleGenerate} className="drafting-form">
        {error && (
          <div className="error-alert animate-shake">
            <AlertCircle size={18} className="icon-error" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="success-alert animate-fade-in">
            <CheckCircle2 size={18} className="icon-success" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* File Upload Section */}
        <div className="input-group file-upload-section">
          <label>إرفاق مستند مرجعي (Word / PDF / TXT) <span className="optional-tag">اختياري</span></label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
            style={{ display: 'none' }}
            id="ai-file-input"
            disabled={loading || parsingFile}
          />

          {!attachedFile && !parsingFile && (
            <div 
              className="file-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={24} className="upload-icon" />
              <div className="dropzone-text">
                <span className="primary-text">انقر لرفع ملف للاستناد إليه في الصياغة</span>
                <span className="secondary-text">يدعم PDF, Word (.docx), والملفات النصية (.txt)</span>
              </div>
            </div>
          )}

          {parsingFile && (
            <div className="file-parsing-status">
              <RefreshCw className="spinner-icon animate-spin" size={20} />
              <span>جاري قراءة واستخراج النصوص من الملف المرفق...</span>
            </div>
          )}

          {attachedFile && (
            <div className="attached-file-badge">
              <div className="file-info-left">
                <FileText size={22} className="file-icon-success" />
                <div className="file-meta">
                  <span className="file-name">{attachedFile.name}</span>
                  <span className="file-stats">
                    {formatFileSize(attachedFile.size)} • {attachedFile.text.length.toLocaleString('ar-EG')} حرف مستخرج
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="btn-remove-file"
                onClick={handleRemoveFile}
                title="إزالة الملف"
                disabled={loading}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {fileError && (
            <div className="error-alert file-alert animate-shake">
              <AlertCircle size={16} className="icon-error" />
              <span>{fileError}</span>
            </div>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="ai-prompt">موضوع الخطاب / توجيهات الصياغة</label>
          <textarea
            id="ai-prompt"
            rows={4}
            placeholder={attachedFile ? "مثال: لخص النقاط الواردة في الملف المرفق في صورة خطاب رسمي يوجه لشركة..." : "مثال: طلب توريد قطع غيار لحقل الصيانة البترولي بصفة عاجلة، أو خطاب تهنئة لشركاء النجاح..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="input-group tone-group">
            <label>نبرة وأسلوب الصياغة</label>
            <div className="tone-selectors">
              <label className={`tone-radio ${tone === 'formal' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="tone"
                  value="formal"
                  checked={tone === 'formal'}
                  onChange={() => setTone('formal')}
                  disabled={loading}
                />
                <span>رسمي ومهني</span>
              </label>
              <label className={`tone-radio ${tone === 'urgent' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="tone"
                  value="urgent"
                  checked={tone === 'urgent'}
                  onChange={() => setTone('urgent')}
                  disabled={loading}
                />
                <span>عاجل وهام</span>
              </label>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary generate-btn" disabled={loading || parsingFile}>
          {loading ? (
            <span className="loading-spinner-wrapper">
              <RefreshCw className="spinner-icon animate-spin" size={18} />
              جاري صياغة الخطاب بالذكاء الاصطناعي...
            </span>
          ) : (
            <span className="btn-content">
              <Sparkles size={18} />
              توليد مسودة الخطاب
            </span>
          )}
        </button>
      </form>

      <style>{`
        .ai-drafting-card {
          padding: 24px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        .card-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 14px;
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          margin-bottom: 6px;
        }
        .header-title h3 {
          font-size: 16px;
          font-weight: 700;
        }
        .sparkle-icon {
          color: #818cf8;
        }
        .card-subtitle {
          font-size: 12px;
          color: var(--text-sub);
          line-height: 1.5;
        }
        .drafting-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .optional-tag {
          font-size: 11px;
          color: #94a3b8;
          font-weight: normal;
          margin-right: 6px;
        }
        .file-dropzone {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(99, 102, 241, 0.35);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .file-dropzone:hover {
          background: rgba(99, 102, 241, 0.06);
          border-color: #6366f1;
        }
        .upload-icon {
          color: #818cf8;
          flex-shrink: 0;
        }
        .dropzone-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dropzone-text .primary-text {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
        }
        .dropzone-text .secondary-text {
          font-size: 11px;
          color: #94a3b8;
        }
        .file-parsing-status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: #c7d2fe;
        }
        .attached-file-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.25);
          border-radius: var(--radius-sm);
        }
        .file-info-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .file-icon-success {
          color: #4ade80;
        }
        .file-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .file-meta .file-name {
          font-size: 13px;
          font-weight: 700;
          color: #f8fafc;
          word-break: break-all;
        }
        .file-meta .file-stats {
          font-size: 11px;
          color: #86efac;
        }
        .btn-remove-file {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-remove-file:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #fff;
        }
        .success-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-sm);
          color: #86efac;
          font-size: 13px;
          font-weight: 600;
        }
        .icon-success {
          color: #4ade80;
          flex-shrink: 0;
        }
        .file-alert {
          margin-top: 8px;
          font-size: 12px;
          padding: 8px 12px;
        }
        .drafting-form textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 14px;
          color: #fff;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          transition: var(--transition-smooth);
        }
        .drafting-form textarea:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.04);
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.08);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        .tone-selectors {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }
        .tone-radio {
          flex: 1;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-sub);
          transition: var(--transition-smooth);
        }
        .tone-radio input {
          display: none;
        }
        .tone-radio:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .tone-radio.active {
          background: rgba(99, 102, 241, 0.08);
          border-color: #6366f1;
          color: #fff;
          font-weight: 600;
        }
        .generate-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        }
        .spinner-icon {
          animation: spin 1.2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
