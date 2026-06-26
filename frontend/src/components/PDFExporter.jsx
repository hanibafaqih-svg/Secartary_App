import React from 'react';
import { Printer, Download, HelpCircle } from 'lucide-react';

export default function PDFExporter({ onExport }) {
  const handlePrint = () => {
    if (onExport) {
      onExport();
    } else {
      window.print();
    }
  };

  return (
    <div className="pdf-exporter-panel glass-panel animate-fade-in">
      <div className="exporter-header">
        <h4>خيارات تصدير المستند</h4>
        <p>قم بتنزيل الخطاب الرسمي بصيغة PDF عالية الجودة</p>
      </div>

      <div className="export-actions">
        <button onClick={handlePrint} className="btn-primary print-action-btn">
          <Printer size={18} />
          <span>طباعة الخطاب / حفظ كـ PDF</span>
        </button>
      </div>

      <div className="print-guide">
        <HelpCircle size={16} className="guide-icon" />
        <div className="guide-text">
          <strong>ملاحظة هامة للحصول على أفضل جودة وتفادي تداخل الصفحات:</strong>
          <p>عند ظهور نافذة الطباعة، يرجى التأكد من ضبط <b>"مقاس الورق" (Paper Size) على A4</b>، وتفعيل خيار <b>"رسومات الخلفية" (Background Graphics)</b> في الإعدادات الإضافية ليظهر ورق الشركة الرسمي والختم بالحجم والموقع الصحيحين تماماً.</p>
        </div>
      </div>

      <style>{`
        .pdf-exporter-panel {
          padding: 20px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-color: rgba(99, 102, 241, 0.2);
        }
        .exporter-header h4 {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        .exporter-header p {
          font-size: 11px;
          color: var(--text-sub);
        }
        .export-actions {
          display: flex;
          gap: 12px;
        }
        .print-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .print-action-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.3);
        }
        .print-guide {
          display: flex;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          padding: 12px;
          align-items: flex-start;
        }
        .guide-icon {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .guide-text strong {
          display: block;
          font-size: 11px;
          color: #fff;
          margin-bottom: 2px;
        }
        .guide-text p {
          font-size: 10px;
          color: var(--text-sub);
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
