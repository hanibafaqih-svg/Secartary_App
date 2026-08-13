import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  User, 
  FileText, 
  CheckSquare, 
  Square, 
  FileSignature, 
  Sliders, 
  Move, 
  Plus, 
  Minus, 
  Trash2, 
  PlusCircle, 
  DollarSign, 
  Settings,
  Briefcase,
  Printer,
  Archive,
  Loader,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  X,
  Paperclip,
  Copy,
  FileCheck
} from 'lucide-react';

const DEFAULT_AUTOCOMPLETE_ITEMS = [
  "Longi Solar Panels 550W / ألواح طاقة شمسية",
  "Deye Hybrid Inverter / محول هايبرد",
  "Growatt Inverter / محول طاقة",
  "LiFePO4 Battery System / نظام بطاريات ليثيوم",
  "Solar Pumping System Design / تصميم نظام ضخ شمسي",
  "Installation & Commissioning / توريد وتركيب وتشغيل"
];

export default function LetterForm({ 
  company, 
  formData, 
  setFormData, 
  onExportPDF,
  onFinalizeAndSave,
  isFinalizing,
  finalizeResult,
  onClearFinalizeResult,
  mode,
  setMode,
  quotationData,
  setQuotationData,
  user
}) {
  const isAdmin = user?.role === 'admin';
  const [suggestions, setSuggestions] = useState(() => {
    try {
      const saved = localStorage.getItem('autocomplete_items');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load autocomplete suggestions:", e);
    }
    return DEFAULT_AUTOCOMPLETE_ITEMS;
  });

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Multiple Recipients Handlers
  const recipientsList = (Array.isArray(formData.recipients) && formData.recipients.length > 0)
    ? formData.recipients
    : [(formData.recipient || '')];

  const handleRecipientChange = (index, value) => {
    const updated = [...recipientsList];
    updated[index] = value;
    setFormData(prev => ({
      ...prev,
      recipients: updated,
      recipient: updated[0] || ''
    }));
  };

  const handleAddRecipient = () => {
    const updated = [...recipientsList, ''];
    setFormData(prev => ({
      ...prev,
      recipients: updated,
      recipient: updated[0] || ''
    }));
  };

  const handleRemoveRecipient = (index) => {
    if (recipientsList.length <= 1) return;
    const updated = recipientsList.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      recipients: updated,
      recipient: updated[0] || ''
    }));
  };

  const handleToggleStamp = () => {
    setFormData(prev => ({
      ...prev,
      includeStamp: !prev.includeStamp
    }));
  };

  // Quotation handlers
  const handleQuotationChange = (key, value) => {
    setQuotationData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleItemChange = (itemId, key, value) => {
    setQuotationData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          return { ...item, [key]: value };
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddItem = () => {
    setQuotationData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, description: '', qty: 1, price: 0 }
      ]
    }));
  };

  const handleRemoveItem = (itemId) => {
    setQuotationData(prev => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      };
    });
  };

  const saveNewSuggestions = () => {
    try {
      let updated = [...suggestions];
      let changed = false;
      quotationData.items.forEach(item => {
        const desc = item.description.trim();
        if (desc && !updated.includes(desc)) {
          updated.push(desc);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('autocomplete_items', JSON.stringify(updated));
        setSuggestions(updated);
      }
    } catch (e) {
      console.error("Failed to save unique suggestions:", e);
    }
  };

  const handleExportClick = () => {
    if (mode === 'quotation') {
      saveNewSuggestions();
    }
    onExportPDF();
  };

  // Math Calculations
  const subtotal = quotationData?.items?.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0) || 0;
  const discount = parseFloat(quotationData?.discountValue) || 0;
  let grandTotal = subtotal;
  if (quotationData?.discountType === 'percent') {
    grandTotal = Math.max(0, subtotal - (subtotal * (discount / 100)));
  } else {
    grandTotal = Math.max(0, subtotal - discount);
  }

  const isExportDisabled = mode === 'letter' 
    ? (!(formData?.body || '').trim() || !(formData?.recipient || '').trim())
    : (!(quotationData?.clientName || '').trim() || quotationData?.items?.some(i => !(i?.description || '').trim()));

  const isPetro = company === 'Petro South';
  
  if (!formData || !quotationData) {
    return (
      <div className="letter-form-card glass-panel animate-fade-in w-full max-w-full overflow-hidden p-6 text-center text-sub">
        <span>جاري تحميل النموذج...</span>
      </div>
    );
  }

  const defaultHeaderX = isPetro ? 390 : 380;
  const defaultHeaderY = isPetro ? 750 : 800;
  const safeX = (formData?.headerX !== undefined && formData?.headerX !== null && !isNaN(Number(formData.headerX))) ? Number(formData.headerX) : defaultHeaderX;
  const safeY = (formData?.headerY !== undefined && formData?.headerY !== null && !isNaN(Number(formData.headerY))) ? Number(formData.headerY) : defaultHeaderY;

  const renderSharedControls = () => {
    return (
      <>
        <div className="checkbox-group" onClick={handleToggleStamp}>
          <div className="checkbox-icon">
            {formData.includeStamp ? (
              <CheckSquare className="checked" size={20} />
            ) : (
              <Square size={20} />
            )}
          </div>
          <div className="checkbox-label">
            <strong>إدراج الختم الرسمي للشركة</strong>
            <p>تفعيل هذا الخيار سيظهر ختم الشركة المعتمد أسفل الخطاب فوق التوقيع</p>
          </div>
        </div>

        <div className="signatory-subform animate-fade-in">
          <div className="header-title-sub">
            <FileSignature size={16} />
            <h4>بيانات الموقع المعتمد</h4>
          </div>
          <div className="form-row grid-2">
            <div className="input-group">
              <label htmlFor="signatory-name">اسم المسؤول الموقع</label>
              <input
                id="signatory-name"
                type="text"
                placeholder="مثال: أ. أحمد محمد"
                value={formData.signatoryName}
                onChange={(e) => handleChange('signatoryName', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="signatory-title">المسمى الوظيفي للموقع</label>
              <input
                id="signatory-title"
                type="text"
                placeholder="مثال: المدير العام"
                value={formData.signatoryTitle}
                onChange={(e) => handleChange('signatoryTitle', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Page Formatting & Spacing Controls */}
        <div className="signatory-subform spacing-settings-block animate-fade-in">
          <div className="header-title-sub">
            <Sliders size={16} />
            <h4>إعدادات تباعد هوامش الصفحة</h4>
          </div>
          
          <div className="form-row grid-2">
            <div className="input-group">
              <label>حجم خط المضمون ({formData.bodyFontSize || 15}px)</label>
              <input 
                type="range" 
                min="12" 
                max="20" 
                value={formData.bodyFontSize || 15} 
                onChange={(e) => handleChange('bodyFontSize', parseInt(e.target.value))}
              />
            </div>
            
            <div className="input-group">
              <label>تباعد الأسطر ({formData.lineHeight || 1.8})</label>
              <input 
                type="range" 
                min="1.4" 
                max="2.2" 
                step="0.1" 
                value={formData.lineHeight || 1.8} 
                onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="form-row grid-2">
            <div className="input-group">
              <label>تباعد الفقرات ({formData.paragraphSpacing || 16}px)</label>
              <input 
                type="range" 
                min="6" 
                max="26" 
                value={formData.paragraphSpacing || 16} 
                onChange={(e) => handleChange('paragraphSpacing', parseInt(e.target.value))}
              />
            </div>

            <div className="input-group">
              <label>تباعد التوقيع العلوي ({formData.signatureMarginTop || 40}px)</label>
              <input 
                type="range" 
                min="10" 
                max="120" 
                value={formData.signatureMarginTop || 40} 
                onChange={(e) => handleChange('signatureMarginTop', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Header Position Settings */}
        <div className="signatory-subform spacing-settings-block animate-fade-in">
          <div className="header-title-sub">
            <Move size={16} />
            <h4>ضبط موقع الترويسة</h4>
          </div>
          
          <div className="form-row grid-2">
            <div className="input-group">
              <label>الموقع الأفقي (المحور X)</label>
              <div className="position-control-buttons">
                <button 
                  type="button" 
                  className="position-btn decrease-btn"
                  onClick={() => handleChange('headerX', Math.max(200, safeX - 5))}
                  title="تحريك لليسار"
                >
                  <Minus size={14} />
                  <span>يسار (-)</span>
                </button>
                <div className="position-value-display">
                  {safeX} pt
                </div>
                <button 
                  type="button" 
                  className="position-btn increase-btn"
                  onClick={() => handleChange('headerX', Math.min(550, safeX + 5))}
                  title="تحريك لليمين"
                >
                  <Plus size={14} />
                  <span>يمين (+)</span>
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>الموقع العمودي (المحور Y)</label>
              <div className="position-control-buttons">
                <button 
                  type="button" 
                  className="position-btn decrease-btn"
                  onClick={() => handleChange('headerY', Math.max(600, safeY - 5))}
                  title="تحريك للأسفل"
                >
                  <Minus size={14} />
                  <span>أسفل (-)</span>
                </button>
                <div className="position-value-display">
                  {safeY} pt
                </div>
                <button 
                  type="button" 
                  className="position-btn increase-btn"
                  onClick={() => handleChange('headerY', Math.min(840, safeY + 5))}
                  title="تحريك للأعلى"
                >
                  <Plus size={14} />
                  <span>أعلى (+)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="export-actions-block">
          {/* Row 1: Preview + Finalize */}
          <div className="export-btn-row">
            <button
              onClick={onExportPDF}
              className="btn-export-preview"
              disabled={isFinalizing}
              title="معاينة محلية عبر نافذة الطباعة"
            >
              <Printer size={17} />
              <span>معاينة PDF</span>
            </button>

            <button
              onClick={onFinalizeAndSave}
              className="btn-export-finalize"
              disabled={isFinalizing || !onFinalizeAndSave}
              title="حفظ وأرشفة الوثيقة في Google Drive"
            >
              {isFinalizing ? (
                <><Loader size={17} className="spin-icon" /><span>جاري الأرشفة...</span></>
              ) : (
                <><Archive size={17} /><span>حفظ نهائي ← أرشفة</span></>
              )}
            </button>
          </div>

          {/* Status Banner */}
          {finalizeResult && (
            <div className={`finalize-status-banner finalize-${finalizeResult.status}`}>
              <div className="finalize-status-icon">
                {finalizeResult.status === 'success'  && <CheckCircle size={18} />}
                {finalizeResult.status === 'duplicate' && <AlertTriangle size={18} />}
                {finalizeResult.status === 'error'    && <XCircle size={18} />}
              </div>
              <div className="finalize-status-body">
                {finalizeResult.status === 'success' && (
                  <>
                    <p className="finalize-status-title">✅ تمت الأرشفة بنجاح!</p>
                    <p className="finalize-status-sub">{finalizeResult.message}</p>
                    {finalizeResult.driveLink && (
                      <a href={finalizeResult.driveLink} target="_blank" rel="noopener noreferrer" className="finalize-drive-link">
                        <ExternalLink size={13} /> فتح في Google Drive
                      </a>
                    )}
                  </>
                )}
                {finalizeResult.status === 'duplicate' && (
                  <>
                    <p className="finalize-status-title">⚠️ وثيقة موجودة مسبقاً</p>
                    <p className="finalize-status-sub">{finalizeResult.message}</p>
                  </>
                )}
                {finalizeResult.status === 'error' && (
                  <>
                    <p className="finalize-status-title">❌ خطأ في الأرشفة</p>
                    <p className="finalize-status-sub">{finalizeResult.message}</p>
                  </>
                )}
              </div>
              <button className="finalize-status-close" onClick={onClearFinalizeResult} title="إغلاق">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="letter-form-card glass-panel animate-fade-in w-full max-w-full">
      {/* Mode Switcher Tabs */}
      <div className="form-mode-switcher">
        <button 
          type="button" 
          className={`switcher-tab ${mode === 'letter' ? 'active' : ''}`}
          onClick={() => setMode('letter')}
        >
          <FileText size={16} />
          <span>خطاب رسمي</span>
        </button>
        <button 
          type="button" 
          className={`switcher-tab ${mode === 'quotation' ? 'active' : ''}`}
          onClick={() => setMode('quotation')}
        >
          <Briefcase size={16} />
          <span>عرض سعر (Quotation)</span>
        </button>
      </div>

      <div className="card-header">
        <div className="header-title">
          <Settings className="form-icon" size={20} />
          <h3>
            {mode === 'letter' 
              ? 'تفاصيل وبيانات الخطاب' 
              : (quotationData.docType === 'invoice' ? 'بيانات وتفاصيل الفاتورة' : 'بيانات وتفاصيل عرض السعر')}
          </h3>
        </div>
        <p className="card-subtitle">
          {mode === 'letter' 
            ? 'قم بمراجعة وتعديل بيانات الخطاب الرسمي قبل التصدير' 
            : (quotationData.docType === 'invoice' 
                ? 'أدخل تفاصيل العميل، شروط الدفع، قائمة أصناف الفاتورة والخصومات'
                : 'أدخل تفاصيل العميل، شروط الدفع، قائمة الأصناف والخصومات')}
        </p>
      </div>

      <div className="form-fields">
        {mode === 'letter' ? (
          /* LETTER FORM FIELDS */
          <>
            {/* Dynamic Multiple Recipients */}
            <div className="form-row">
              <div className="input-group w-full">
                <div className="flex justify-between items-center mb-1">
                  <label className="m-0 font-semibold text-sm">اسم المرسل إليه (الجهة المستلمة)</label>
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="btn-add-recipient inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>إضافة مرسل إليه</span>
                  </button>
                </div>
                <div className="recipients-list flex flex-col gap-2 mt-1">
                  {recipientsList.map((rec, idx) => (
                    <div key={idx} className="input-wrapper recipient-input-wrapper flex items-center gap-2">
                      <User className="input-icon-right" size={18} />
                      <input
                        type="text"
                        placeholder={idx === 0 ? "مثال: سعادة رئيس مجلس إدارة شركة المصافي المحترم" : `المرسل إليه الإضافي (${idx + 1})`}
                        value={rec}
                        onChange={(e) => handleRecipientChange(idx, e.target.value)}
                        className="w-full"
                      />
                      {recipientsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(idx)}
                          className="btn-remove-recipient p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                          title="حذف هذا المرسل إليه"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label htmlFor="subject">موضوع الخطاب (العنوان)</label>
                <div className="input-wrapper">
                  <FileText className="input-icon-right" size={18} />
                  <input
                    id="subject"
                    type="text"
                    placeholder="مثال: طلب توريد قطع غيار عاجل / خطاب شكر وتقدير"
                    value={formData.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row grid-2">
              <div className="input-group">
                <label htmlFor="ref-number">
                  الرقم المرجعي
                  {!isAdmin && (
                    <span style={{ fontSize: '10px', color: '#6b7280', marginRight: '6px', fontWeight: '400' }}>🔒 يُولَّد تلقائياً</span>
                  )}
                </label>
                <div className="input-wrapper">
                  <input
                    id="ref-number"
                    type="text"
                    dir="ltr"
                    placeholder="PS-2026-05-101"
                    value={formData.refNumber}
                    onChange={(e) => handleChange('refNumber', e.target.value)}
                    readOnly={!isAdmin}
                    style={!isAdmin ? {
                      opacity: 0.65,
                      cursor: 'not-allowed',
                      background: 'rgba(0,0,0,0.15)',
                      borderColor: 'rgba(255,255,255,0.04)'
                    } : {}}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="letter-date">تاريخ الخطاب</label>
                <div className="input-wrapper">
                  <Calendar className="input-icon-right" size={18} />
                  <input
                    id="letter-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="letter-body">مضمون الخطاب (نص الرسالة)</label>
              <textarea
                id="letter-body"
                rows={10}
                placeholder="اكتب مضمون الرسالة هنا أو استخدم مساعد الذكاء الاصطناعي لتوليد المسودة..."
                value={formData.body}
                onChange={(e) => handleChange('body', e.target.value)}
              />
            </div>

            {/* Optional Attachments & CC Fields */}
            <div className="form-row grid-2 mt-3">
              <div className="input-group">
                <label htmlFor="attachments-field">
                  <Paperclip size={15} style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle' }} />
                  المرفقات (Attachments) <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}>(اختياري)</span>
                </label>
                <textarea
                  id="attachments-field"
                  rows={2}
                  placeholder="مثال: 1. جدول الكميات&#10;2. الرسم الهندسي"
                  value={formData.attachments || ''}
                  onChange={(e) => handleChange('attachments', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="cc-field">
                  <Copy size={15} style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle' }} />
                  نسخة إلى (CC) <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}>(اختياري)</span>
                </label>
                <textarea
                  id="cc-field"
                  rows={2}
                  placeholder="مثال: 1. الإدارة المالية&#10;2. ملف المشروع"
                  value={formData.cc || ''}
                  onChange={(e) => handleChange('cc', e.target.value)}
                />
              </div>
            </div>

            {renderSharedControls()}
          </>
        ) : (
          /* QUOTATION / INVOICE FORM FIELDS */
          <>
            {/* Quotation vs Invoice Toggle */}
            <div className="doc-type-toggle-container mb-4 p-3 rounded-lg border border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold text-sm text-gray-200 flex items-center gap-2">
                <Briefcase size={16} className="text-indigo-400" />
                نوع الوثيقة:
              </span>
              <div className="toggle-segmented-control flex items-center p-1 rounded-md bg-black/30 border border-white/10">
                <button
                  type="button"
                  className={`segmented-btn px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${(!quotationData.docType || quotationData.docType === 'quotation') ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => handleQuotationChange('docType', 'quotation')}
                >
                  <Briefcase size={14} />
                  <span>عرض سعر (Quotation)</span>
                </button>
                <button
                  type="button"
                  className={`segmented-btn px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${quotationData.docType === 'invoice' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => handleQuotationChange('docType', 'invoice')}
                >
                  <FileCheck size={14} />
                  <span>فاتورة (Invoice)</span>
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label htmlFor="client-name">اسم العميل / الشركة</label>
                <div className="input-wrapper">
                  <User className="input-icon-right" size={18} />
                  <input
                    id="client-name"
                    type="text"
                    placeholder="مثال: شركة حضرموت للكهرباء / أ. صالح عمر"
                    value={quotationData.clientName}
                    onChange={(e) => handleQuotationChange('clientName', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label htmlFor="client-address">العنوان / العناية (Attention)</label>
                <div className="input-wrapper">
                  <FileText className="input-icon-right" size={18} />
                  <input
                    id="client-address"
                    type="text"
                    placeholder="مثال: سيئون - هاتف 777xxxxxx / عناية المهندس المسؤول"
                    value={quotationData.clientAddress}
                    onChange={(e) => handleQuotationChange('clientAddress', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row grid-3">
              <div className="input-group">
                <label htmlFor="rfq-number">رقم طلب التسعير RFQ (اختياري)</label>
                <input
                  id="rfq-number"
                  type="text"
                  dir="ltr"
                  placeholder="RFQ-2026-908"
                  value={quotationData.rfqNumber}
                  onChange={(e) => handleQuotationChange('rfqNumber', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="ref-number-shared">
                  {quotationData.docType === 'invoice' ? 'الرقم المرجعي للفاتورة' : 'الرقم المرجعي لعرض السعر'}
                  {!isAdmin && (
                    <span style={{ fontSize: '10px', color: '#6b7280', marginRight: '6px', fontWeight: '400' }}>🔒 يُولَّد تلقائياً</span>
                  )}
                </label>
                <input
                  id="ref-number-shared"
                  type="text"
                  dir="ltr"
                  value={formData.refNumber}
                  onChange={(e) => handleChange('refNumber', e.target.value)}
                  readOnly={!isAdmin}
                  style={!isAdmin ? {
                    opacity: 0.65,
                    cursor: 'not-allowed',
                    background: 'rgba(0,0,0,0.15)',
                    borderColor: 'rgba(255,255,255,0.04)'
                  } : {}}
                />
              </div>

              <div className="input-group">
                <label htmlFor="letter-date-shared">
                  {quotationData.docType === 'invoice' ? 'تاريخ الفاتورة' : 'تاريخ عرض السعر'}
                </label>
                <input
                  id="letter-date-shared"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row grid-3">
              <div className="input-group">
                <label htmlFor="currency-select">العملة</label>
                <select
                  id="currency-select"
                  className="custom-select"
                  value={quotationData.currency}
                  onChange={(e) => handleQuotationChange('currency', e.target.value)}
                >
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="YER">ريال يمني (YER)</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="discount-type">نوع الخصم</label>
                <select
                  id="discount-type"
                  className="custom-select"
                  value={quotationData.discountType}
                  onChange={(e) => handleQuotationChange('discountType', e.target.value)}
                >
                  <option value="fixed">مبلغ ثابت</option>
                  <option value="percent">نسبة مئوية (%)</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="discount-value">قيمة الخصم</label>
                <input
                  id="discount-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotationData.discountValue}
                  onChange={(e) => handleQuotationChange('discountValue', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="form-row grid-2">
              <div className="input-group">
                <label htmlFor="validity">مدة صلاحية العرض</label>
                <input
                  id="validity"
                  type="text"
                  placeholder="مثال: 30 يوماً من تاريخه"
                  value={quotationData.validity}
                  onChange={(e) => handleQuotationChange('validity', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="payment-terms">شروط الدفع</label>
                <input
                  id="payment-terms"
                  type="text"
                  placeholder="مثال: 50% مقدم، 50% عند التوصيل والتركيب"
                  value={quotationData.paymentTerms}
                  onChange={(e) => handleQuotationChange('paymentTerms', e.target.value)}
                />
              </div>
            </div>

            {/* Smart Items Input Table */}
            <div className="items-table-section w-full max-w-full">
              <div className="table-section-header">
                <label>أصناف وخدمات عرض السعر</label>
              </div>

              {/* Desktop version (hidden on mobile) */}
              <div className="items-desktop-container">
                <div className="w-full overflow-x-auto block items-table-wrapper">
                  <table className="items-form-table" style={{ minWidth: '700px' }}>
                    <thead>
                      <tr>
                        <th>الوصف (الصنف/الخدمة)</th>
                        <th style={{ width: '70px' }}>الكمية</th>
                        <th style={{ width: '110px' }}>السعر</th>
                        <th style={{ width: '100px' }}>الإجمالي</th>
                        <th style={{ width: '45px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotationData.items.map((item, idx) => (
                        <tr key={item.id} className="item-row">
                          <td>
                            <input
                              type="text"
                              list="item-suggestions"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              placeholder="اسم الصنف أو الخدمة..."
                              className="item-desc-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)}
                              className="item-qty-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="item-price-input"
                            />
                          </td>
                          <td className="item-total-display">
                            {((item.qty || 0) * (item.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-delete-row"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={quotationData.items.length <= 1}
                              title="حذف هذا البند"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile version (hidden on desktop, stacks vertically) */}
              <div className="items-mobile-container">
                {quotationData.items.map((item, idx) => (
                  <div key={item.id} className="mobile-item-card">
                    <div className="mobile-item-header">
                      <span className="mobile-item-number">البند #{idx + 1}</span>
                      <button
                        type="button"
                        className="btn-delete-row-mobile"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={quotationData.items.length <= 1}
                        title="حذف هذا البند"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mobile-input-group">
                      <label>الوصف (الصنف/الخدمة)</label>
                      <input
                        type="text"
                        list="item-suggestions"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="اسم الصنف أو الخدمة..."
                        className="item-desc-input"
                      />
                    </div>

                    <div className="mobile-inputs-row">
                      <div className="mobile-input-group">
                        <label>الكمية</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)}
                          className="item-qty-input"
                        />
                      </div>
                      <div className="mobile-input-group">
                        <label>السعر</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="item-price-input"
                        />
                      </div>
                    </div>

                    <div className="mobile-total-row">
                      <span>إجمالي البند:</span>
                      <strong className="mobile-item-total">
                        {((item.qty || 0) * (item.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} {quotationData.currency}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>


              <button
                type="button"
                className="btn-add-row"
                onClick={handleAddItem}
              >
                <PlusCircle size={15} />
                <span>إضافة صنف جديد</span>
              </button>

              <datalist id="item-suggestions">
                {suggestions.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            </div>

            {/* Calculations Summary Card */}
            <div className="calculations-summary glass-panel">
              <div className="calc-row">
                <span>المجموع الفرعي:</span>
                <strong>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {quotationData.currency}</strong>
              </div>
              <div className="calc-row">
                <span>الخصم:</span>
                <span className="discount-amount">
                  {quotationData.discountType === 'percent' 
                    ? `${discount}% (يساوي - ${(subtotal * (discount / 100)).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${quotationData.currency})`
                    : `- ${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${quotationData.currency}`}
                </span>
              </div>
              <div className="calc-row grand-total">
                <span>الإجمالي الكلي:</span>
                <strong>{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {quotationData.currency}</strong>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="notes">ملاحظات وشروط إضافية لعرض السعر</label>
              <textarea
                id="notes"
                rows={4}
                placeholder="اكتب أي ملاحظات أو شروط إضافية مثل مدة التوريد، التوصيل، الضمان..."
                value={quotationData.notes}
                onChange={(e) => handleQuotationChange('notes', e.target.value)}
              />
            </div>
            {renderSharedControls()}
          </>
        )}
      </div>

      <style>{`
        .position-control-buttons {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          overflow: hidden;
          margin-top: 8px;
        }
        .position-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: none;
          color: #fff;
          padding: 10px;
          cursor: pointer;
          font-size: 12px;
          transition: var(--transition-smooth);
        }
        .position-btn:hover {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }
        .position-btn:active {
          background: rgba(99, 102, 241, 0.25);
        }
        .position-value-display {
          width: 80px;
          text-align: center;
          font-family: monospace;
          font-weight: 700;
          color: #818cf8;
          font-size: 14px;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 0;
          user-select: none;
        }
        .letter-form-card {
          padding: 24px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          max-width: 100%;
          overflow: visible;
        }
        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-icon {
          color: #818cf8;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .input-icon-right {
          position: absolute;
          right: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .form-fields input, .form-fields textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          color: #fff;
          font-size: 14px;
          transition: var(--transition-smooth);
        }
        .form-fields input:focus, .form-fields textarea:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.04);
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.08);
        }
        .form-fields .input-wrapper input {
          padding-right: 42px; /* Extra padding for icons on the right */
        }
        .form-fields .input-wrapper input[dir="ltr"] {
          padding-right: 16px;
          padding-left: 16px;
          text-align: left;
        }
        .checkbox-group {
          display: flex;
          gap: 14px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          padding: 14px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .checkbox-group:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .checkbox-icon {
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }
        .checkbox-icon .checked {
          color: #6366f1;
        }
        .checkbox-label strong {
          display: block;
          font-size: 13px;
          color: #fff;
          margin-bottom: 2px;
        }
        .checkbox-label p {
          font-size: 11px;
          color: var(--text-muted);
        }
        .signatory-subform {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .header-title-sub {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-sub);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
          margin-bottom: 4px;
        }
        .header-title-sub h4 {
          font-size: 12px;
          font-weight: 600;
        }
        .export-btn {
          margin-top: 10px;
          width: 100%;
        }
        .spacing-settings-block input[type="range"] {
          width: 100%;
          accent-color: #6366f1;
          background: rgba(255, 255, 255, 0.08);
          height: 6px;
          border-radius: 3px;
          outline: none;
          padding: 0;
          cursor: pointer;
          margin-top: 8px;
          border: none;
        }
        .items-desktop-container {
          display: block;
          width: 100%;
          max-width: 100%;
        }
        .items-mobile-container {
          display: none;
        }

        @media (max-width: 768px) {
          .items-desktop-container {
            display: none;
          }
          .items-mobile-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
            max-width: 100%;
          }
          .mobile-item-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-sm);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          .mobile-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 8px;
            margin-bottom: 4px;
          }
          .mobile-item-number {
            font-size: 12px;
            font-weight: 700;
            color: #818cf8;
          }
          .btn-delete-row-mobile {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #ef4444;
            padding: 6px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition-smooth);
            width: auto;
            margin: 0;
          }
          .btn-delete-row-mobile:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.2);
          }
          .btn-delete-row-mobile:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
          .mobile-input-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .mobile-input-group label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-sub);
            text-align: right;
          }
          .mobile-inputs-row {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 12px;
          }
          .mobile-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            padding: 8px 12px;
            border-radius: var(--radius-sm);
            font-size: 13px;
          }
          .mobile-item-total {
            color: #818cf8;
            font-family: monospace;
            font-weight: 700;
          }
        }

        @media (max-width: 576px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
