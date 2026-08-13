import React from 'react';
import { Eye } from 'lucide-react';
import petroLetterhead from '../assets/petro_south_letterhead.jpg';
import mbtkronLetterhead from '../assets/mbtkron_letterhead.jpg';
import petroStamp from '../assets/petro_south_stamp.png';
import mbtkronStamp from '../assets/mbtkron_stamp.png';
import { tafqeet } from '../utils/tafqeet';

export default function LetterPreview({ company, formData, mode = 'letter', quotationData = {} }) {
  const isPetro = company === 'Petro South';
  const letterhead = isPetro ? petroLetterhead : mbtkronLetterhead;
  const stampImg = isPetro ? petroStamp : mbtkronStamp;

  // Set custom property on document body for print background
  React.useEffect(() => {
    document.body.style.setProperty('--print-bg-image', `url("${letterhead}")`);
    return () => {
      document.body.style.removeProperty('--print-bg-image');
    };
  }, [letterhead]);

  // Format date to local Arabic format or standard display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // Calculations for quotation totals
  const subtotal = quotationData?.items?.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0) || 0;
  const discount = parseFloat(quotationData?.discountValue) || 0;
  let grandTotal = subtotal;
  if (quotationData?.discountType === 'percent') {
    grandTotal = Math.max(0, subtotal - (subtotal * (discount / 100)));
  } else {
    grandTotal = Math.max(0, subtotal - discount);
  }

  // Sanitized Layout coordinates and spacing configurations
  const headerX = (formData?.headerX !== undefined && formData?.headerX !== null && !isNaN(Number(formData.headerX))) ? Number(formData.headerX) : 380;
  const headerY = (formData?.headerY !== undefined && formData?.headerY !== null && !isNaN(Number(formData.headerY))) ? Number(formData.headerY) : (isPetro ? 755 : 800);
  const signatureMarginTop = (formData?.signatureMarginTop !== undefined && formData?.signatureMarginTop !== null && !isNaN(Number(formData.signatureMarginTop))) ? Number(formData.signatureMarginTop) : 40;
  const bodyFontSize = (formData?.bodyFontSize !== undefined && formData?.bodyFontSize !== null && !isNaN(Number(formData.bodyFontSize))) ? Number(formData.bodyFontSize) : 15;
  const lineHeight = (formData?.lineHeight !== undefined && formData?.lineHeight !== null && !isNaN(Number(formData.lineHeight))) ? Number(formData.lineHeight) : 1.8;
  const paragraphSpacing = (formData?.paragraphSpacing !== undefined && formData?.paragraphSpacing !== null && !isNaN(Number(formData.paragraphSpacing))) ? Number(formData.paragraphSpacing) : 16;

  if (!formData || !quotationData) {
    return (
      <div className="preview-container glass-panel animate-fade-in flex items-center justify-center py-20 text-sub">
        <span>جاري تحميل المعاينة...</span>
      </div>
    );
  }

  if (mode === 'letter') {
    return (
      <div className="preview-container glass-panel animate-fade-in mode-letter">
        <div className="card-header">
          <div className="header-title">
            <Eye className="preview-icon" size={20} />
            <h3>المعاينة الفورية للخطاب</h3>
          </div>
          <p className="card-subtitle">
            شاهد كيف سيظهر الخطاب المطبوع على الأوراق الرسمية للشركة
          </p>
        </div>

        <div className="document-viewport">
          <div className="a4-page-wrapper">
            <div className={`a4-page ${isPetro ? 'petro-theme' : 'mbtkron-theme'} mode-letter`}>
              <img 
                src={letterhead} 
                alt="Letterhead Background" 
                className="letterhead-bg-image"
                onError={(e) => { e.target.style.display = 'none'; }}
              />

              {isPetro && (
                <div className="petro-footer-contact-overlay">
                  <div className="petro-contact-item">
                    <span className="icon">✉</span>
                    <span>ops@petro-south.com</span>
                  </div>
                  <div className="petro-contact-item">
                    <span className="icon">🌐</span>
                    <span>www.petro-south.com</span>
                  </div>
                  <div className="petro-contact-item">
                    <span className="icon">📞</span>
                    <span dir="ltr">+967 771071993 / +967 771231330</span>
                  </div>
                </div>
              )}

              <div 
                className={`meta-overlay ${isPetro ? 'petro-meta' : 'mbtkron-meta'}`}
                style={{
                  '--header-left': `${headerX * 25.4 / 72}mm`,
                  '--header-bottom': `${(headerY - 25) * 25.4 / 72}mm`,
                  top: `${(842 - headerY) * 1.3333}px`,
                  left: `${headerX * 1.3333}px`
                }}
              >
                <div className="meta-val date-val">
                  {formatDate(formData?.date) || '....................'}
                </div>
                <div className="meta-val ref-val">
                  {formData?.refNumber || '....................'}
                </div>
              </div>

              <table className="print-table">
                <thead>
                  <tr>
                    <td>
                      <div className="print-header-space"></div>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="print-content">
                        <div className="letter-content">
                          <div className="recipient-block">
                            {(() => {
                              const list = (Array.isArray(formData?.recipients) && formData.recipients.filter(Boolean).length > 0)
                                ? formData.recipients.filter(Boolean)
                                : (formData?.recipient ? [formData.recipient] : []);
                              
                              if (list.length > 0) {
                                return list.map((rec, rIdx) => (
                                  <div key={rIdx} className="recipient-name-line" style={{ marginBottom: rIdx < list.length - 1 ? '4px' : '0' }}>
                                    <span className="recipient-name">{rec}</span>
                                  </div>
                                ));
                              }
                              return <span className="recipient-name">....................................................................................</span>;
                            })()}
                          </div>

                          <div className="greeting-block">
                            تحية طيبة وبعد،،،
                          </div>

                          {formData?.subject && (
                            <div className="subject-block">
                              <span className="subject-prefix">الموضوع: </span>
                              <span className="subject-value">{formData?.subject}</span>
                            </div>
                          )}

                          <div className="body-block">
                            {formData?.body ? (
                              formData.body.split('\n').map((paragraph, idx) => (
                                <p 
                                  key={idx} 
                                  className="body-paragraph"
                                  style={{
                                    fontSize: `${bodyFontSize}px`,
                                    lineHeight: lineHeight,
                                    marginBottom: `${paragraphSpacing}px`
                                  }}
                                >
                                  {paragraph}
                                </p>
                              ))
                            ) : (
                              <div className="body-placeholder">
                                [ بانتظار كتابة مضمون الخطاب أو صياغته بالذكاء الاصطناعي... ]
                              </div>
                            )}
                          </div>

                          <div className="closing-block">
                            وتقبلوا منا فائق الاحترام والتقدير،،
                          </div>

                          <div 
                            className="signature-stamp-block"
                            style={{ marginTop: `${signatureMarginTop}px` }}
                          >
                            <div className="signatory-details">
                              <span className="sign-title">{formData?.signatoryTitle || 'المدير العام'}</span>
                              <span className="sign-name">{formData?.signatoryName || 'إدارة الشركة'}</span>
                              
                              {formData?.includeStamp && (
                                <div className="stamp-overlay">
                                  <img 
                                    src={stampImg} 
                                    alt="Corporate Stamp" 
                                    className="corporate-stamp"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Attachments & CC rendered at very bottom of document content (Attachments first, CC second) */}
                          {(formData?.attachments || formData?.cc) && (
                            <div className="letter-footer-attachments-cc">
                              {formData?.attachments && (
                                <div className="footer-meta-block attachments-meta">
                                  <strong className="meta-heading">المرفقات:</strong>
                                  <div className="meta-text-content">{formData.attachments}</div>
                                </div>
                              )}
                              {formData?.cc && (
                                <div className="footer-meta-block cc-meta">
                                  <strong className="meta-heading">نسخة إلى:</strong>
                                  <div className="meta-text-content">{formData.cc}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>
                      <div className="print-footer-space"></div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        <style>{previewStyles}</style>
      </div>
    );
  }

  // Default to quotation mode preview
  const isInvoice = quotationData?.docType === 'invoice';
  const quotationDocTitle = isInvoice ? 'فـاتـورة' : 'عـرض سـعـر';
  const quotationGreeting = isInvoice 
    ? 'تحية طيبة وبعد،،، فيما يلي تفاصيل الفاتورة والخدمات والأصناف الموضحة أدناه:' 
    : 'تحية طيبة وبعد،،، بناءً على طلبكم الكريم، يسرنا أن نقدم لكم عرض السعر والخدمات للأصناف الموضحة أدناه:';

  return (
    <div className="preview-container glass-panel animate-fade-in mode-quotation">
      <div className="card-header">
        <div className="header-title">
          <Eye className="preview-icon" size={20} />
          <h3>{isInvoice ? 'المعاينة الفورية للفاتورة' : 'المعاينة الفورية لعرض السعر'}</h3>
        </div>
        <p className="card-subtitle">
          {isInvoice ? 'شاهد كيف ستظهر الفاتورة والبنود على أوراق الشركة الرسمية' : 'شاهد كيف سيظهر جدول التسعير والبنود على أوراق الشركة الرسمية'}
        </p>
      </div>

      <div className="document-viewport">
        <div className="a4-page-wrapper">
          <div className={`a4-page ${isPetro ? 'petro-theme' : 'mbtkron-theme'} mode-quotation`}>
            <img 
              src={letterhead} 
              alt="Letterhead Background" 
              className="letterhead-bg-image"
              onError={(e) => { e.target.style.display = 'none'; }}
            />

            {isPetro && (
              <div className="petro-footer-contact-overlay">
                <div className="petro-contact-item">
                  <span className="icon">✉</span>
                  <span>ops@petro-south.com</span>
                </div>
                <div className="petro-contact-item">
                  <span className="icon">🌐</span>
                  <span>www.petro-south.com</span>
                </div>
                <div className="petro-contact-item">
                  <span className="icon">📞</span>
                  <span dir="ltr">+967 771071993 / +967 771231330</span>
                </div>
              </div>
            )}

            <div 
              className={`meta-overlay ${isPetro ? 'petro-meta' : 'mbtkron-meta'}`}
              style={{
                '--header-left': `${headerX * 25.4 / 72}mm`,
                '--header-bottom': `${(headerY - 25) * 25.4 / 72}mm`,
                top: `${(842 - headerY) * 1.3333}px`,
                left: `${headerX * 1.3333}px`
              }}
            >
              <div className="meta-val date-val">
                {formatDate(formData?.date) || '....................'}
              </div>
              <div className="meta-val ref-val">
                {formData?.refNumber || '....................'}
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <td>
                    <div className="print-header-space"></div>
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="print-content">
                      <div className="letter-content">
                        <div className="quotation-title-block">
                          {quotationDocTitle}
                        </div>

                        <div className="quotation-client-block">
                          <div className="client-detail-row">
                            <span className="detail-label">اسم العميل / الشركة:</span>
                            <strong className="detail-value">{quotationData?.clientName || '....................................................................................'}</strong>
                          </div>
                          <div className="client-detail-row">
                            <span className="detail-label">العنوان / العناية:</span>
                            <span className="detail-value">{quotationData?.clientAddress || '....................................................................................'}</span>
                          </div>
                          {quotationData?.rfqNumber && (
                            <div className="client-detail-row">
                              <span className="detail-label">طلب تسعير رقم (RFQ):</span>
                              <span className="detail-value" dir="ltr">{quotationData.rfqNumber}</span>
                            </div>
                          )}
                        </div>

                        <div className="greeting-block">
                          {quotationGreeting}
                        </div>

                        <table className="preview-items-table">
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}>م</th>
                              <th>الوصف والصنف (Description)</th>
                              <th style={{ width: '60px' }}>الكمية</th>
                              <th style={{ width: '110px' }}>سعر الوحدة</th>
                              <th style={{ width: '120px' }}>الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(quotationData?.items || []).map((item, idx) => (
                              <tr key={item?.id || idx}>
                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                <td className="desc-col-cell">{item?.description || '....................................'}</td>
                                <td className="num-col-cell">{item?.qty}</td>
                                <td className="amount-col-cell">{(item?.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="amount-col-cell">{((item?.qty || 0) * (item?.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                            
                            <tr>
                              <td colSpan={3} style={{ border: 'none' }}></td>
                              <td className="summary-label-cell">المجموع الفرعي:</td>
                              <td className="summary-value-cell">{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {quotationData?.currency}</td>
                            </tr>
                            {discount > 0 && (
                              <tr>
                                <td colSpan={3} style={{ border: 'none' }}></td>
                                <td className="summary-label-cell">الخصم المطبق:</td>
                                <td className="summary-value-cell">
                                  {quotationData?.discountType === 'percent' 
                                    ? `${discount}% (-${(subtotal * (discount / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                                    : `-${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  } {quotationData?.currency}
                                </td>
                              </tr>
                            )}
                            <tr style={{ borderBottom: '2px solid #333' }}>
                              <td colSpan={3} style={{ border: 'none' }}></td>
                              <td className="summary-label-cell" style={{ fontWeight: '800', background: '#e0e0e0' }}>الإجمالي الكلي:</td>
                              <td className="summary-value-cell" style={{ fontWeight: '800', background: '#e0e0e0' }}>{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {quotationData?.currency}</td>
                            </tr>
                            
                            <tr>
                              <td colSpan={5} className="tafqeet-cell">
                                {tafqeet(grandTotal, quotationData?.currency || 'USD')}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="quotation-terms-block">
                          <div className="term-item">
                            <strong>صلاحية العرض:</strong> <span>{quotationData?.validity || '................................'}</span>
                          </div>
                          <div className="term-item">
                            <strong>شروط الدفع:</strong> <span>{quotationData?.paymentTerms || '................................'}</span>
                          </div>
                          {quotationData?.notes && (
                            <div className="term-notes">
                              <strong>شروط وملاحظات إضافية:</strong>
                              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{quotationData.notes}</div>
                            </div>
                          )}
                        </div>

                        <div className="closing-block">
                          شاكرين لكم حسن تعاونكم واهتمامكم،،
                        </div>

                        <div 
                          className="signature-stamp-block"
                          style={{ marginTop: `${mode === 'quotation' ? Math.min(signatureMarginTop, 15) : signatureMarginTop}px` }}
                        >
                          <div className="signatory-details">
                            <span className="sign-title">{formData?.signatoryTitle || 'المدير العام'}</span>
                            <span className="sign-name">{formData?.signatoryName || 'إدارة الشركة'}</span>
                            
                            {formData?.includeStamp && (
                              <div className="stamp-overlay">
                                <img 
                                  src={stampImg} 
                                  alt="Corporate Stamp" 
                                  className="corporate-stamp"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>
                    <div className="print-footer-space"></div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      <style>{previewStyles}</style>
    </div>
  );
}

const previewStyles = `
  .preview-container {
    padding: 24px;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .preview-icon {
    color: #818cf8;
  }
  
  /* Simulated A4 document viewport */
  .document-viewport {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow: visible;
    min-height: 600px;
  }

  /* Bounding box wrapper to hold visual transform scaling in document layout flow */
  .a4-page-wrapper {
    --zoom-factor: 1;
    width: calc(794px * var(--zoom-factor));
    height: calc(1123px * var(--zoom-factor));
    display: flex;
    justify-content: center;
    align-items: flex-start;
    position: relative;
    flex-shrink: 0;
    transition: var(--transition-smooth);
  }
  
  /* Exact A4 dimensions in pixels at 96 DPI (scaled dynamically in CSS via transform wrapper) */
  .a4-page {
    width: 794px;
    min-height: 1123px;
    height: auto;
    background-color: #ffffff;
    color: #2b2b2b;
    padding: 0; /* Handled by header/footer spacers */
    position: absolute;
    top: 0;
    left: 0;
    transform: scale(var(--zoom-factor));
    transform-origin: top left;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    user-select: text; /* Allow highlighting preview text */
  }

  /* High-res background image layout - locked to Page 1 A4 dimensions */
  .letterhead-bg-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 794px;
    height: 1123px;
    object-fit: fill;
    z-index: 1;
    pointer-events: none;
  }
  
  /* Table Layout for page breaks */
  .print-table {
    width: 100%;
    border-collapse: collapse;
    position: relative;
    z-index: 5;
  }
  .print-header-space {
    height: 170px; /* Aligns content under header logo — Letter mode */
  }
  .print-footer-space {
    height: 165px; /* Aligns content above footer info — Letter mode */
  }
  /* Quotation mode: tighter header/footer to reclaim vertical space for table rows */
  .mode-quotation .print-header-space {
    height: 140px;
  }
  .mode-quotation .print-footer-space {
    height: 130px;
  }
  .print-content {
    padding: 0 75px;
    display: flex;
    flex-direction: column;
  }

  /* Positioning metadata values directly over letterhead header lines */
  .meta-overlay {
    position: absolute;
    display: flex;
    flex-direction: column;
    font-family: 'Cairo', sans-serif;
    z-index: 10;
    width: 220px;
  }
  
  .petro-meta {
    top: 133px;
    left: 66px; /* Explicit top-left coordinates */
    gap: 15px;
    direction: rtl;
    text-align: right;
  }
  
  .mbtkron-meta {
    top: 133px;
    left: 66px; /* Explicit top-left coordinates matching Petro South */
    gap: 15px;
    direction: rtl;
    text-align: right;
  }

  .meta-label {
    font-weight: 700;
    color: #555555;
    font-size: 13px;
  }
  
  .meta-val {
    font-weight: 700;
    letter-spacing: 0.5px;
    font-size: 13px;
    color: #1A237E; /* Clean dark blue for printed ink feel */
    height: 18px;
    line-height: 1.4;
  }
  
  .subject-block {
    text-align: center;
    font-weight: 800;
    font-size: 17px;
    margin: 20px auto 30px auto;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    display: block;
    width: 100%;
  }
  .subject-prefix {
    color: #000;
  }
  .subject-value {
    color: #000;
  }
  
  /* Core letter layout */
  .letter-content {
    margin-top: 15px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    direction: rtl; /* Force right-to-left flow inside A4 page */
    text-align: justify;
    position: relative;
    z-index: 5;
  }
  
  .recipient-block {
    font-size: 16px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 20px;
    font-family: 'Al Mateen', 'Al-Mateen', 'Cairo', sans-serif;
  }
  
  .greeting-block {
    font-size: 15px;
    margin-bottom: 25px;
    font-weight: 500;
  }
  
  .body-block {
    font-size: 14px;
    line-height: 1.8;
    color: #2c2c2c;
    flex-grow: 1;
  }
  
  .body-paragraph {
    margin-bottom: 16px;
    text-indent: 20px; /* Traditional formal layout indent */
    font-family: 'Times New Roman', Times, serif;
  }
  
  .body-placeholder {
    color: #999999;
    font-style: italic;
    text-align: center;
    margin-top: 100px;
  }
  
  /* Signature block on bottom left (visually left in RTL is flex-end) */
  .signature-stamp-block {
    margin-top: 50px;
    align-self: flex-end; /* Aligns to left side in RTL container */
    width: 260px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    text-align: center;
    page-break-inside: avoid;
    margin-left: 20px; /* Indent slightly from left margin */
  }
  
  .closing-block {
    text-align: center;
    font-size: 15px;
    margin-top: 30px;
    margin-bottom: 20px;
    font-weight: 600;
    color: #2b2b2b;
    width: 100%;
    page-break-inside: avoid;
    font-family: 'Times New Roman', Times, serif;
  }
  
  .signatory-details {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 5;
    width: 100%;
  }
  
  .sign-title {
    font-weight: 700;
    font-size: 15px;
    color: #111;
    margin-bottom: 4px;
    font-family: 'Al Mateen', 'Al-Mateen', 'Cairo', sans-serif;
  }
  
  .sign-name {
    font-size: 14px;
    color: #2b2b2b;
    font-weight: 600;
    font-family: 'Al Mateen', 'Al-Mateen', 'Cairo', sans-serif;
  }
  
  /* Stamp overlapping signature text directly over title/name area */
  .stamp-overlay {
    position: absolute;
    top: -25px; /* Centers the stamp over the title and name */
    left: -20px; /* Positioned slightly to the left side of the name */
    width: 120px;
    height: 120px;
    pointer-events: none;
    z-index: 10;
    opacity: 0.88;
    mix-blend-mode: multiply;
  }
  
  /* Attachments and CC Footer Metadata */
  .letter-footer-attachments-cc {
    margin-top: 25px;
    padding-top: 10px;
    border-top: 1px dashed #ccc;
    font-size: 13px;
    color: #2b2b2b;
    display: flex;
    flex-direction: column;
    gap: 6px;
    page-break-inside: avoid;
  }
  .footer-meta-block {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .meta-heading {
    font-weight: 700;
    color: #111;
    min-width: 70px;
  }
  .meta-text-content {
    white-space: pre-wrap;
    line-height: 1.5;
  }
  
  /* Petro South Footer Contact Overlay - locked to bottom of Page 1 */
  .petro-footer-contact-overlay {
    position: absolute;
    top: 1075px;
    left: 0;
    width: 794px;
    height: 48px;
    background: #1B2348;
    border-top: 3px solid #f35c33;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 35px;
    font-size: 13px;
    font-weight: 700;
    direction: ltr;
    z-index: 15;
    letter-spacing: 0.3px;
  }
  .petro-contact-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
    font-family: 'Segoe UI', Arial, sans-serif;
  }
  .petro-contact-item .icon {
    font-size: 13px;
    opacity: 0.9;
  }
  
  .corporate-stamp {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transform: rotate(-8deg); /* Slight natural rotation */
  }
  
  /* Quotation specific — compact vertical spacing to fit 5–8 items on one A4 page */
  .mode-quotation .quotation-title-block {
    font-size: 17px;
    margin-bottom: 10px;
  }
  .mode-quotation .quotation-client-block {
    padding: 7px 12px;
    margin-bottom: 8px;
    gap: 3px;
  }
  .mode-quotation .client-detail-row {
    font-size: 11.5px;
    border-bottom-width: 0;
    padding-bottom: 2px;
    margin-bottom: 0;
  }
  .mode-quotation .greeting-block {
    font-size: 11.5px;
    margin-bottom: 8px;
    margin-top: 0;
  }
  .mode-quotation .preview-items-table {
    font-size: 10.5px;
    margin-top: 6px;
    margin-bottom: 8px;
  }
  .mode-quotation .preview-items-table th,
  .mode-quotation .preview-items-table td {
    padding: 4px 6px;
    font-size: 10.5px;
  }
  .mode-quotation .tafqeet-cell {
    font-size: 10.5px;
    padding: 5px 8px !important;
  }
  .mode-quotation .quotation-terms-block {
    margin-top: 8px;
    padding-top: 6px;
    gap: 2px;
  }
  .mode-quotation .term-item {
    font-size: 10.5px;
    margin-bottom: 2px;
  }
  .mode-quotation .term-notes {
    font-size: 10px;
    padding: 5px 8px;
    margin-top: 4px;
  }
  .mode-quotation .closing-block {
    font-size: 12px;
    margin-top: 10px;
    margin-bottom: 6px;
  }
  .mode-quotation .letter-content {
    margin-top: 6px;
  }
  .mode-quotation .print-content {
    padding: 0 55px;
  }

  /* Quotation specific styles */
  .quotation-title-block {
    text-align: center;
    font-weight: 800;
    font-size: 20px;
    margin-bottom: 20px;
    border-bottom: 2px double rgba(0, 0, 0, 0.15);
    padding-bottom: 6px;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
    font-family: 'Cairo', sans-serif;
  }
  .petro-theme .quotation-title-block {
    color: var(--petro-accent, #ff5722);
    border-bottom-color: var(--petro-accent, #ff5722);
  }
  .mbtkron-theme .quotation-title-block {
    color: var(--mbtkron-accent, #c5a880);
    border-bottom-color: var(--mbtkron-accent, #c5a880);
  }
  
  .quotation-client-block {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: var(--radius-sm);
    padding: 12px 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .client-detail-row {
    display: flex;
    justify-content: flex-start;
    gap: 12px;
    font-size: 13px;
    border-bottom: 1px dashed rgba(0, 0, 0, 0.06);
    padding-bottom: 4px;
  }
  .client-detail-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  .detail-label {
    color: #555;
    font-weight: 700;
    min-width: 130px;
    white-space: nowrap;
  }
  
  .detail-value {
    color: #111;
    text-align: right;
  }
  
  .preview-items-table {
    width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse;
    margin-top: 12px;
    margin-bottom: 16px;
    font-size: 11px;
  }
  
  .preview-items-table th, .preview-items-table td {
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    white-space: normal !important;
  }
  
  .preview-items-table th {
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.15);
    padding: 6px 8px;
    font-weight: 700;
    color: #000;
    text-align: center;
  }
  .preview-items-table th:nth-child(2) {
    text-align: right;
  }
  
  .preview-items-table td {
    border: 1px solid rgba(0, 0, 0, 0.15);
    padding: 6px 8px;
    color: #222;
    vertical-align: middle;
  }
  
  .desc-col-cell {
    text-align: right;
    font-weight: 500;
  }
  
  .num-col-cell {
    text-align: center;
  }
  
  .amount-col-cell {
    text-align: left;
    font-family: monospace;
    font-size: 12px;
  }
  
  .summary-label-cell {
    font-weight: 700;
    text-align: left;
    background: rgba(0, 0, 0, 0.02);
  }
  
  .summary-value-cell {
    font-weight: 700;
    text-align: left;
    font-family: monospace;
    font-size: 12px;
    background: rgba(0, 0, 0, 0.02);
  }
  
  .tafqeet-cell {
    text-align: right;
    font-weight: 700;
    padding: 8px 12px !important;
    font-size: 12px;
  }
  .petro-theme .tafqeet-cell {
    color: #e65100;
    background: rgba(255, 87, 34, 0.04);
    border-top: 1.5px solid #ff5722 !important;
  }
  .mbtkron-theme .tafqeet-cell {
    color: #8c6d3f;
    background: rgba(197, 168, 128, 0.04);
    border-top: 1.5px solid #c5a880 !important;
  }
  
  .quotation-terms-block {
    margin-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .term-item {
    font-size: 12px;
    display: flex;
    gap: 8px;
  }
  .term-item strong {
    color: #444;
    min-width: 90px;
  }
  
  .term-notes {
    margin-top: 8px;
    background: rgba(0, 0, 0, 0.01);
    border: 1px solid rgba(0, 0, 0, 0.05);
    padding: 10px;
    border-radius: var(--radius-sm);
    font-size: 11px;
  }
  .term-notes strong {
    display: block;
    margin-bottom: 4px;
    color: #444;
  }

  /* Scale down the simulated A4 page for desktop viewports to fit split layout */
  @media screen and (min-width: 881px) {
    .document-viewport {
      padding: 20px;
      display: flex;
      justify-content: center;
      overflow: hidden;
      width: 100%;
    }
    .mode-letter .a4-page-wrapper { --zoom-factor: 0.85; }
    .mode-quotation .a4-page-wrapper { --zoom-factor: 0.82; }
  }
  
  /* Scale down the simulated A4 page for smaller viewports */
  @media screen and (max-width: 880px) {
    .preview-iframe-container {
      display: none !important;
    }
    .document-viewport {
      padding: 10px;
      display: flex;
      justify-content: center;
      overflow: hidden;
      width: 100%;
    }
    .mode-letter .a4-page-wrapper { --zoom-factor: 0.8; }
    .mode-quotation .a4-page-wrapper { --zoom-factor: 0.76; }
  }
  @media screen and (max-width: 680px) {
    .document-viewport {
      padding: 8px;
    }
    .mode-letter .a4-page-wrapper { --zoom-factor: 0.6; }
    .mode-quotation .a4-page-wrapper { --zoom-factor: 0.55; }
  }
  @media screen and (max-width: 480px) {
    .preview-container {
      padding: 12px 8px;
    }
    .document-viewport {
      padding: 8px;
    }
    .mode-letter .a4-page-wrapper { --zoom-factor: 0.42; }
    .mode-quotation .a4-page-wrapper { --zoom-factor: 0.38; }
  }
  @media screen and (max-width: 412px) {
    .mode-letter .a4-page-wrapper { --zoom-factor: 0.40; }
    .mode-quotation .a4-page-wrapper { --zoom-factor: 0.36; }
  }
  @media screen and (max-width: 390px) {
    .mode-letter .a4-page-wrapper { --zoom-factor: 0.38; }
    .mode-quotation .a4-page-wrapper { --zoom-factor: 0.34; }
  }
  @media screen and (max-width: 360px) {
    .mode-letter .a4-page-wrapper { --zoom-factor: 0.35; }
    .mode-quotation .a4-page-wrapper { --zoom-factor: 0.31; }
  }
  @media screen and (max-width: 320px) {
    .mode-letter .a4-page-wrapper { --zoom-factor: 0.31; }
    .mode-quotation .a4-page-wrapper { --zoom-factor: 0.28; }
  }

  @media print {
    .a4-page-wrapper {
      width: auto !important;
      height: auto !important;
      display: block !important;
      --zoom-factor: 1 !important;
    }
    .a4-page {
      position: relative !important;
      transform: none !important;
      left: auto !important;
      top: auto !important;
      box-shadow: none !important;
      width: 100% !important;
    }
    thead {
      display: table-header-group !important;
    }
    tfoot {
      display: table-footer-group !important;
    }
    tbody tr {
      page-break-inside: auto;
    }
  }
`;
