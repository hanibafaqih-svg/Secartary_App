import React, { useState } from 'react';
import { Sparkles, Send, AlertCircle, RefreshCw } from 'lucide-react';

export default function AIDrafting({ company, formData, onDraftGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('formal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('الرجاء كتابة موضوع أو فكرة الخطاب أولاً.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          recipient: formData?.recipient || '',
          subject: formData?.subject || '',
          company,
          tone
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
        } else {
          throw new Error('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      // Initialize the draft as empty in the parent component
      onDraftGenerated('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Hold onto incomplete lines

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              onDraftGenerated(accumulatedText);
            }
          } catch (jsonErr) {
            console.error('Failed to parse streaming json chunk:', jsonErr, dataStr);
          }
        }
      }

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
        <p className="card-subtitle">اكتب الفكرة الأساسية وسيقوم الذكاء الاصطناعي بصياغة خطاب رسمي متكامل</p>
      </div>

      <form onSubmit={handleGenerate} className="drafting-form">
        {error && (
          <div className="error-alert animate-shake">
            <AlertCircle size={18} className="icon-error" />
            <span>{error}</span>
          </div>
        )}

        <div className="input-group">
          <label htmlFor="ai-prompt">موضوع الخطاب / التوجيه</label>
          <textarea
            id="ai-prompt"
            rows={4}
            placeholder="مثال: طلب توريد قطع غيار لحقل الصيانة البترولي بصفة عاجلة، أو خطاب تهنئة لشركة شركاء النجاح بمناسبة العام الجديد..."
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

        <button type="submit" className="btn-primary generate-btn" disabled={loading}>
          {loading ? (
            <span className="loading-spinner-wrapper">
              <RefreshCw className="spinner-icon animate-spin" size={18} />
              جاري صياغة الخطاب...
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
