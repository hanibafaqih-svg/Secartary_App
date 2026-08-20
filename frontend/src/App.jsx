import React, { useState, useEffect } from 'react';
import { auth, isConfigured, signOut, syncUserProfile, logLetterExport } from './firebase';
import Login from './components/Login';
import CompanySelection from './components/CompanySelection';
import AIDrafting from './components/AIDrafting';
import LetterForm from './components/LetterForm';
import LetterPreview from './components/LetterPreview';
import PDFExporter from './components/PDFExporter';
import AdminDashboard from './components/AdminDashboard';
import { Building2, LogOut, ArrowLeft, Shield } from 'lucide-react';


export default function App() {
  const [user, setUser] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState(null); // { status, message, driveLink }
  const [company, setCompany] = useState(null);
  const [authLoading, setAuthLoading] = useState(isConfigured);
  const [currentView, setCurrentView] = useState('workspace'); // 'workspace' or 'admin'
  const [mode, setMode] = useState('letter'); // 'letter' or 'quotation'
  const [quotationData, setQuotationData] = useState({
    docType: 'quotation', // 'quotation' or 'invoice'
    clientName: '',
    clientAddress: '',
    rfqNumber: '',
    validity: '30 يوم',
    paymentTerms: '50% مقدم، 50% عند التسليم',
    notes: '',
    currency: 'USD',
    discountValue: 0,
    discountType: 'fixed', // 'fixed' or 'percent'
    items: [
      { id: 'item-1', description: '', qty: 1, price: 0 }
    ]
  });
  const isUpdatingRef = React.useRef(false);

  // Global letter form state (retained across exports and views)
  const [formData, setFormData] = useState({
    recipients: [''],
    recipient: '',
    subject: '', // Added subject line field
    attachments: '', // Mofraqat
    cc: '', // Nuskha Ila
    refNumber: '',
    date: new Date().toISOString().split('T')[0],
    body: '',
    includeStamp: true,
    signatoryName: '',
    signatoryTitle: '',
    bodyFontSize: 15, // Default layout spacing configuration
    lineHeight: 1.8,
    paragraphSpacing: 16,
    signatureMarginTop: 40,
    headerX: 380,
    headerY: 800
  });

  // Sync header coordinates and signature margin to company and mode specific localStorage keys when they change
  useEffect(() => {
    if (isUpdatingRef.current) return;
    if (company && formData.headerX !== undefined && formData.headerY !== undefined && formData.signatureMarginTop !== undefined) {
      try {
        const isPetro = company === 'Petro South';
        const companyKey = isPetro ? 'PetroSouth' : 'MBTKRON';
        localStorage.setItem(`headerX_${companyKey}_${mode}`, formData.headerX);
        localStorage.setItem(`headerY_${companyKey}_${mode}`, formData.headerY);
        localStorage.setItem(`signatureMarginTop_${companyKey}_${mode}`, formData.signatureMarginTop);
      } catch (e) {
        console.error('Failed to sync header positions to localStorage', e);
      }
    }
  }, [formData.headerX, formData.headerY, formData.signatureMarginTop, company, mode]);

  // Firebase auth state listener
  useEffect(() => {
    const syncUser = async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const profile = await syncUserProfile(firebaseUser);
        setUser(profile);
        if (!isConfigured) {
          localStorage.setItem('mock_user_session', JSON.stringify(profile));
        }
      } catch (err) {
        console.error("Failed to sync user profile on login:", err);
        setUser(firebaseUser);
      } finally {
        setAuthLoading(false);
      }
    };

    if (!isConfigured) {
      const savedUser = localStorage.getItem('mock_user_session');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          syncUser(parsed);
        } catch (e) {
          localStorage.removeItem('mock_user_session');
          setAuthLoading(false);
        }
      } else {
        setAuthLoading(false);
      }
      return;
    }

    setAuthLoading(true);
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      syncUser(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  // Update signatories and generate reference number when company changes
  useEffect(() => {
    if (company) {
      const isPetro = company === 'Petro South';
      const companyCode = isPetro ? 'PS' : 'MA';
      const dateObj = new Date();
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const randomSeq = Math.floor(100 + Math.random() * 900); // 3-digit random sequence
      const generatedRef = `${companyCode}-${year}-${month}-${randomSeq}`;

      setFormData(prev => ({
        ...prev,
        refNumber: generatedRef,
        signatoryName: isPetro ? 'أحمد محمد الجابري' : 'المهندس هاني سعيد العولقي',
        signatoryTitle: isPetro ? 'المدير العام التنفيذي' : 'مدير المشاريع والعمليات الهندسية'
      }));
    }
  }, [company]);

  // Load company & mode specific coordinates and signature margin when company or mode changes
  useEffect(() => {
    if (company) {
      isUpdatingRef.current = true;
      const isPetro = company === 'Petro South';
      const companyKey = isPetro ? 'PetroSouth' : 'MBTKRON';
      
      const storedX = localStorage.getItem(`headerX_${companyKey}_${mode}`);
      const storedY = localStorage.getItem(`headerY_${companyKey}_${mode}`);
      const storedSig = localStorage.getItem(`signatureMarginTop_${companyKey}_${mode}`);

      const defaultX = isPetro ? 390 : 380;
      const defaultY = isPetro ? 750 : 800;
      const defaultSig = 40;

      const parsedX = storedX ? parseInt(storedX, 10) : NaN;
      const parsedY = storedY ? parseInt(storedY, 10) : NaN;
      const parsedSig = storedSig ? parseInt(storedSig, 10) : NaN;

      const headerX = !isNaN(parsedX) ? parsedX : defaultX;
      const headerY = !isNaN(parsedY) ? parsedY : defaultY;
      const signatureMarginTop = !isNaN(parsedSig) ? parsedSig : defaultSig;

      setFormData(prev => ({
        ...prev,
        headerX,
        headerY,
        signatureMarginTop
      }));

      // Reset the flag after state update settles in the event loop
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [company, mode]);

  const handleLoginSuccess = async (userData) => {
    try {
      setAuthLoading(true);
      const profile = await syncUserProfile(userData);
      setUser(profile);
      if (!isConfigured) {
        localStorage.setItem('mock_user_session', JSON.stringify(profile));
      }
    } catch (err) {
      console.error("Failed to sync user profile on login success:", err);
      setUser(userData);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isConfigured) {
      await signOut(auth);
    } else {
      localStorage.removeItem('mock_user_session');
    }
    setUser(null);
    setCompany(null);
    setCurrentView('workspace');
  };

  const handleBackToSelection = () => {
    setCompany(null);
    setCurrentView('workspace');
  };

  const handleDraftGenerated = (draftText) => {
    setFormData(prev => ({
      ...prev,
      body: draftText.trim()
    }));
  };

  const handleAIDataExtracted = ({ recipients, subject, content }) => {
    setFormData(prev => {
      let finalRecipients = prev.recipients;
      if (Array.isArray(recipients) && recipients.length > 0) {
        finalRecipients = recipients.filter(Boolean);
        if (finalRecipients.length === 0) finalRecipients = [''];
      }

      return {
        ...prev,
        recipients: finalRecipients,
        recipient: finalRecipients[0] || prev.recipient,
        subject: subject || prev.subject,
        body: content ? content.trim() : prev.body
      };
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const handleExportPDF = async () => {
    try {
      let documentSubject = '';
      if (mode === 'quotation') {
        const isInvoice = quotationData.docType === 'invoice';
        const typeLabel = isInvoice ? 'فاتورة' : 'عرض_سعر';
        documentSubject = `${typeLabel}_${quotationData.clientName || 'عميل'}`;
      } else {
        const firstRecipient = Array.isArray(formData.recipients) ? formData.recipients.filter(Boolean)[0] : formData.recipient;
        documentSubject = formData.subject || firstRecipient || 'خطاب';
      }

      const refNum = formData.refNumber || 'REF';
      const cleanRef = refNum.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim();
      const cleanSubj = documentSubject.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim();
      const exportTitle = `${cleanRef} - ${cleanSubj}`;

      const originalTitle = document.title;
      document.title = exportTitle;

      if (mode === 'quotation') {
        const subtotal = quotationData.items.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0);
        const discount = parseFloat(quotationData.discountValue) || 0;
        let grandTotal = subtotal;
        if (quotationData.discountType === 'percent') {
          grandTotal = Math.max(0, subtotal - (subtotal * (discount / 100)));
        } else {
          grandTotal = Math.max(0, subtotal - discount);
        }
        logLetterExport(
          user?.email || 'unknown@company.com', company,
          formData?.refNumber || 'N/A', quotationData?.clientName || 'زبون غير معروف',
          quotationData.docType === 'invoice' ? 'Invoice' : 'Quotation', grandTotal, quotationData.currency
        ).catch(console.error);
      } else {
        logLetterExport(
          user?.email || 'unknown@company.com', company,
          formData?.refNumber || 'N/A', formData?.subject || 'N/A',
          'letter', 0
        ).catch(console.error);
      }

      window.print();

      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    } catch (e) {
      console.error('Error triggering print dialog:', e);
    }
  };

  const handleFinalizeAndSave = async () => {
    setIsFinalizing(true);
    setFinalizeResult(null);
    try {
      // Wait for all fonts (Cairo, etc.) to be fully loaded
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Find the source content container (.letter-content or .quotation-content or .print-content)
      const sourceContent = document.querySelector('.letter-content') ||
                            document.querySelector('.quotation-content') ||
                            document.querySelector('.print-content');
      if (!sourceContent) {
        throw new Error('عنصر محتوى الوثيقة غير موجود. تأكد أن المعاينة ظاهرة على الشاشة.');
      }

      // ─── STEP 1: Dedicated Canonical Export Container (#pdf-export-body) ───
      // As specified in Option C of the architectural brief:
      // We isolate ONLY the fluid body content into a fixed 794px container offscreen.
      // This completely decouples body flow from letterhead artwork and Date/Ref metadata.
      const EXPORT_WIDTH_CSS_PX = 794;
      const exportContainer = document.createElement('div');
      exportContainer.id = 'pdf-export-body';
      exportContainer.style.position = 'fixed';
      exportContainer.style.left = '-100000px';
      exportContainer.style.top = '0';
      exportContainer.style.width = `${EXPORT_WIDTH_CSS_PX}px`;
      exportContainer.style.boxSizing = 'border-box';
      exportContainer.style.padding = mode === 'quotation' ? '0 50px' : '0 75px';
      exportContainer.style.background = 'transparent';
      exportContainer.style.direction = 'rtl';
      exportContainer.style.color = '#2b2b2b';
      exportContainer.style.fontFamily = "'Cairo', 'Segoe UI', Arial, sans-serif";

      // Clone content cleanly
      const contentClone = sourceContent.cloneNode(true);
      contentClone.style.padding = '0';
      contentClone.style.margin = '0';
      contentClone.style.background = 'transparent';
      exportContainer.appendChild(contentClone);
      document.body.appendChild(exportContainer);

      // Lazy-load heavy libraries only when needed
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      let bodyCanvas;
      try {
        // Wait 2 animation frames for layout rendering
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        bodyCanvas = await html2canvas(exportContainer, {
          width: EXPORT_WIDTH_CSS_PX,
          windowWidth: EXPORT_WIDTH_CSS_PX,
          scale: 2, // 300 DPI equivalent
          backgroundColor: null, // Transparent PNG
          useCORS: true,
          allowTaint: false,
          logging: false
        });
      } finally {
        // Clean up DOM clone
        if (document.body.contains(exportContainer)) {
          document.body.removeChild(exportContainer);
        }
      }

      // ─── STEP 2: Deterministic jsPDF Compositor (Option C) ───
      const PAGE_W_MM = 210;
      const PAGE_H_MM = 297;
      const isPetro = company === 'Petro South';

      // Physical millimeter layout margins for letterhead integration
      const FIRST_BODY_TOP_MM = isPetro ? 55 : 48;
      const LATER_BODY_TOP_MM = isPetro ? 42 : 38;
      const BODY_BOTTOM_MM    = isPetro ? 24 : 20;

      // Preload high-res letterhead background
      const letterheadSrc = isPetro
        ? (await import('./assets/petro_south_letterhead.jpg')).default
        : (await import('./assets/mbtkron_letterhead.jpg')).default;

      const letterheadBase64 = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const cvs = document.createElement('canvas');
          cvs.width = img.naturalWidth;
          cvs.height = img.naturalHeight;
          const ctx = cvs.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(cvs.toDataURL('image/jpeg', 0.95));
        };
        img.src = letterheadSrc;
      });

      // Prepare Date & Ref strings
      const dateStr = formData?.date
        ? (formatDate ? formatDate(formData.date) : new Date(formData.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }))
        : '';
      const refStr = formData?.refNumber || '';

      // High-res Date/Ref stamp generator (crisp Arabic & English rendering via 2D Canvas)
      const createMetadataStamp = () => {
        const cvs = document.createElement('canvas');
        cvs.width = 800;
        cvs.height = 320;
        const ctx = cvs.getContext('2d');
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.font = 'bold 36px "Cairo", "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#1A237E'; // Official navy blue ink
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        if (isPetro) {
          if (dateStr) ctx.fillText(dateStr, 10, 65);
          if (refStr)  ctx.fillText(refStr, 10, 190);
        } else {
          if (dateStr) ctx.fillText(dateStr, 10, 65);
          if (refStr)  ctx.fillText(refStr, 10, 185);
        }
        return cvs.toDataURL('image/png');
      };

      const metaStampDataUrl = createMetadataStamp();

      // Initialize A4 PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Map canvas pixels to physical mm
      const mmPerCanvasPixel = PAGE_W_MM / bodyCanvas.width;
      let sourceY = 0;
      let pageIndex = 0;

      // Slice fluid body into available page rectangles
      do {
        const bodyTopMm = pageIndex === 0 ? FIRST_BODY_TOP_MM : LATER_BODY_TOP_MM;
        const availableBodyHeightMm = PAGE_H_MM - bodyTopMm - BODY_BOTTOM_MM;
        const availableBodyHeightPx = Math.floor(availableBodyHeightMm / mmPerCanvasPixel);
        const remainingHeightPx = bodyCanvas.height - sourceY;
        const sliceHeightPx = Math.min(
          Math.max(1, availableBodyHeightPx),
          Math.max(1, remainingHeightPx)
        );

        if (pageIndex > 0) {
          doc.addPage('a4', 'portrait');
        }

        // Layer 1: Official letterhead background (on EVERY page)
        doc.addImage(letterheadBase64, 'JPEG', 0, 0, PAGE_W_MM, PAGE_H_MM);

        // Layer 2 (Petro South): Vector footer contact bar (on EVERY page)
        if (isPetro) {
          doc.setFillColor(27, 35, 72); // #1B2348
          doc.rect(0, PAGE_H_MM - 12, PAGE_W_MM, 12, 'F');
          doc.setFillColor(243, 92, 51); // #f35c33 accent
          doc.rect(0, PAGE_H_MM - 12.6, PAGE_W_MM, 0.6, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(255, 255, 255);
          doc.text('ops@petro-south.com', 15, PAGE_H_MM - 5);
          doc.text('www.petro-south.com', 85, PAGE_H_MM - 5);
          doc.text('+967 771071993 / +967 771231330', 145, PAGE_H_MM - 5);
        }

        // Layer 3: Date & Reference metadata — PAGE 1 ONLY
        if (pageIndex === 0) {
          if (isPetro) {
            // Petro South: Date line at Y≈34mm, Ref line at Y≈41mm, X starts at 158mm
            doc.addImage(metaStampDataUrl, 'PNG', 158, 29.5, 42, 16, undefined, 'FAST');
          } else {
            // MBTKRON Arab: Date line at Y≈16mm, Ref line at Y≈22mm, X starts at 148mm
            doc.addImage(metaStampDataUrl, 'PNG', 148, 11, 48, 16, undefined, 'FAST');
          }
        }

        // Layer 4: Transparent Fluid Body Slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = bodyCanvas.width;
        sliceCanvas.height = Math.max(1, Math.floor(sliceHeightPx));
        const sCtx = sliceCanvas.getContext('2d');
        sCtx.drawImage(
          bodyCanvas,
          0,
          sourceY,
          bodyCanvas.width,
          sliceCanvas.height,
          0,
          0,
          bodyCanvas.width,
          sliceCanvas.height
        );

        const sliceHeightMm = sliceCanvas.height * mmPerCanvasPixel;
        doc.addImage(
          sliceCanvas.toDataURL('image/png'),
          'PNG',
          0,
          bodyTopMm,
          PAGE_W_MM,
          sliceHeightMm,
          undefined,
          'FAST'
        );

        sourceY += sliceHeightPx;
        pageIndex += 1;
      } while (sourceY < bodyCanvas.height);

      const pdfBlob = doc.output('blob');

      // Determine the client / subject label for the filename: [Reference Number] - [Subject].pdf
      let documentSubject = '';
      let docTypeCategory = 'Letter';
      if (mode === 'quotation') {
        const isInvoice = quotationData.docType === 'invoice';
        docTypeCategory = isInvoice ? 'Invoice' : 'Quotation';
        const typeLabel = isInvoice ? 'فاتورة' : 'عرض_سعر';
        documentSubject = `${typeLabel}_${quotationData.clientName || 'عميل'}`;
      } else {
        const firstRecipient = Array.isArray(formData.recipients) ? formData.recipients.filter(Boolean)[0] : formData.recipient;
        documentSubject = formData.subject || firstRecipient || 'خطاب';
      }

      const refNum = formData.refNumber || 'REF-UNKNOWN';
      const cleanRef = refNum.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim();
      const cleanSubj = documentSubject.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim();
      const pdfFilename = `${cleanRef} - ${cleanSubj}.pdf`;

      const uploadData = new FormData();
      uploadData.append('pdf', pdfBlob, pdfFilename);
      uploadData.append('company', company);
      uploadData.append('refNumber', refNum);
      uploadData.append('clientOrSubject', documentSubject);
      uploadData.append('documentType', docTypeCategory);
      uploadData.append('userEmail', user?.email || 'unknown');

      // In development use localhost:5000; in production use same-origin /api
      const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000'
        : '';

      const response = await fetch(`${apiBase}/api/finalize`, { method: 'POST', body: uploadData });
      const result = await response.json();

      if (response.status === 409) {
        setFinalizeResult({ status: 'duplicate', message: result.error });
      } else if (!response.ok) {
        throw new Error(result.error || result.details || 'فشل رفع الملف إلى Google Drive');
      } else {
        setFinalizeResult({ status: 'success', message: result.fileName, driveLink: result.driveLink, path: result.path });
        // Also log to Firebase audit trail
        logLetterExport(user?.email || 'unknown', company, formData?.refNumber || 'N/A', clientOrSubject,
          mode === 'letter' ? 'Letter (Finalized)' : 'Quotation (Finalized)', 0).catch(console.error);
      }
    } catch (err) {
      console.error('Finalize & Save error:', err);
      setFinalizeResult({ status: 'error', message: err.message || 'حدث خطأ غير متوقع' });
    } finally {
      setIsFinalizing(false);
    }
  };


  // Auth Loading Overlay
  if (authLoading) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel flex flex-col items-center justify-center py-20">
          <span className="spinner mb-4" style={{ width: '36px', height: '36px' }}></span>
          <p style={{ marginTop: '12px' }}>جاري تحميل النظام الأمني...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (!company) {
    return (
      <CompanySelection 
        user={user} 
        onSelectCompany={setCompany} 
        onLogout={handleLogout} 
      />
    );
  }

  const isPetro = company === 'Petro South';
  const companyName = isPetro ? 'بيترو ساوث' : 'المبتكرون العرب';
  const companyThemeClass = isPetro ? 'petro-theme' : 'mbtkron-theme';

  return (
    <div className={`workspace-shell ${companyThemeClass}`}>
      {/* Background decoration circles */}
      <div className="bg-blur-circle bg-blur-1"></div>
      <div className="bg-blur-circle bg-blur-2"></div>

      <header className="workspace-header glass-panel animate-slide-down">
        <div className="header-left">
          <button onClick={handleBackToSelection} className="btn-back">
            <ArrowLeft size={16} />
            <span>تغيير الشركة</span>
          </button>
        </div>

        <div className="header-center">
          <div className="workspace-company-logo">
            <Building2 size={18} className="icon" />
            <span className="workspace-company-name">{companyName}</span>
          </div>
        </div>

        <div className="header-right">
          <div className="user-indicator">
            {user && user.role === 'admin' && (
              <button 
                onClick={() => setCurrentView(currentView === 'admin' ? 'workspace' : 'admin')} 
                className="btn-admin-dashboard-toggle"
                title={currentView === 'admin' ? 'العودة لإنشاء الخطابات' : 'لوحة تحكم المدير'}
              >
                <Shield size={14} />
                <span>{currentView === 'admin' ? 'صياغة الخطابات' : 'لوحة الإدارة'}</span>
              </button>
            )}
            <span className="user-email">{user.email}</span>
            <button onClick={handleLogout} className="btn-icon-logout" title="تسجيل الخروج">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {currentView === 'admin' ? (
        <AdminDashboard user={user} />
      ) : (
        <main className="workspace-main-grid">
          {/* Right side: Forms and Controls (flows from right for Arabic user) */}
          <div className="workspace-controls-column">
            {mode === 'letter' && (
              <AIDrafting 
                company={company}
                formData={formData}
                onDraftGenerated={handleDraftGenerated} 
                onDataExtracted={handleAIDataExtracted}
              />
            )}
            
            <LetterForm 
              company={company}
              formData={formData}
              setFormData={setFormData}
              onExportPDF={handleExportPDF}
              onFinalizeAndSave={handleFinalizeAndSave}
              isFinalizing={isFinalizing}
              finalizeResult={finalizeResult}
              onClearFinalizeResult={() => setFinalizeResult(null)}
              mode={mode}
              setMode={setMode}
              quotationData={quotationData}
              setQuotationData={setQuotationData}
              user={user}
            />
            
            <PDFExporter 
              onExport={handleExportPDF}
            />
          </div>

          {/* Left side: Live Document Preview */}
          <div className="workspace-preview-column">
            <LetterPreview 
              company={company}
              formData={formData}
              mode={mode}
              quotationData={quotationData}
            />
          </div>
        </main>
      )}

      <footer className="workspace-footer">
        <p>© 2026 جميع الحقوق محفوظة لشركة {companyName}</p>
      </footer>

      {/* Embedded CSS specific to the workspace responsive layout */}
      <style>{`
        .workspace-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          padding: 20px 4%;
          overflow-x: hidden;
        }
        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 24px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
          z-index: 10;
        }
        .btn-back {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-sub);
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          transition: var(--transition-smooth);
        }
        .btn-back:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transform: translateX(4px);
        }
        .workspace-company-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 15px;
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 6px 18px;
          border-radius: 30px;
        }
        .petro-theme .workspace-company-logo {
          border-color: rgba(255, 87, 34, 0.3);
          color: var(--petro-accent);
        }
        .mbtkron-theme .workspace-company-logo {
          border-color: rgba(197, 168, 128, 0.3);
          color: var(--mbtkron-accent);
        }
        .user-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-indicator .user-email {
          font-size: 12px;
          color: var(--text-sub);
        }
        .btn-icon-logout {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: var(--transition-smooth);
        }
        .btn-icon-logout:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: scale(1.05);
        }
        
        .btn-admin-dashboard-toggle {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: #818cf8;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: var(--transition-smooth);
        }
        
        .btn-admin-dashboard-toggle:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
          color: #fff;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
          transform: translateY(-1px);
        }
        
        /* Two-Column Responsive Workspace Grid */
        .workspace-main-grid {
          display: grid;
          grid-template-columns: minmax(400px, 1fr) minmax(400px, 1.1fr);
          gap: 30px;
          flex-grow: 1;
          z-index: 10;
          margin-bottom: 24px;
        }
        .workspace-controls-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-width: 0;
          max-width: 100%;
        }
        .workspace-preview-column {
          display: flex;
          flex-direction: column;
          height: fit-content;
          min-width: 0;
          max-width: 100%;
        }
        .workspace-footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 10;
        }
        .workspace-footer p {
          font-size: 11px;
          color: var(--text-muted);
        }

        @media (max-width: 1024px) {
          .workspace-main-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .workspace-preview-column {
            order: -1; /* Place A4 preview on top on tablet/mobile */
          }
        }
        @media (max-width: 768px) {
          .workspace-shell {
            padding: 10px 12px !important;
          }
          .workspace-header {
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px;
            align-items: stretch;
            text-align: center;
          }
          .workspace-header .header-left,
          .workspace-header .header-center,
          .workspace-header .header-right {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .btn-back {
            width: 100%;
            justify-content: center;
            transform: none !important;
          }
          .user-indicator {
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
