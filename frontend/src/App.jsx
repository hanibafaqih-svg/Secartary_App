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
      // Wait for fonts to be ready
      await document.fonts.ready;

      const pageEl = document.querySelector('.a4-page');
      if (!pageEl) throw new Error('عنصر صفحة الوثيقة غير موجود. تأكد أن المعاينة ظاهرة على الشاشة.');

      // ─── PHASE 1: Capture ONLY body text ───
      // Hide the letterhead bg, the meta-overlay Date/Ref, and the footer overlay.
      // Date/Ref will be drawn by jsPDF doc.text() at exact physical mm coords.
      // This is the ONLY reliable approach — html2canvas absolute positioning
      // does not guarantee pixel-perfect placement in the output canvas.
      const letterheadImg = pageEl.querySelector('.letterhead-bg-image');
      const metaOverlay = pageEl.querySelector('.meta-overlay');
      const footerOverlay = pageEl.querySelector('.petro-footer-contact-overlay');

      if (letterheadImg) letterheadImg.style.display = 'none';
      if (metaOverlay) metaOverlay.style.display = 'none';
      if (footerOverlay) footerOverlay.style.display = 'none';
      pageEl.style.setProperty('transform', 'scale(1)', 'important');
      pageEl.style.setProperty('transform-origin', 'top left', 'important');

      // Wait 2 frames to ensure browser re-renders before capture
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      // Lazy-load heavy libraries
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      let contentCanvas;
      try {
        contentCanvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: pageEl.scrollHeight || 1123
        });
      } finally {
        if (letterheadImg) letterheadImg.style.display = '';
        if (metaOverlay) metaOverlay.style.display = '';
        if (footerOverlay) footerOverlay.style.display = '';
        pageEl.style.removeProperty('transform');
        pageEl.style.removeProperty('transform-origin');
      }

      // ─── PHASE 2: Build paginated PDF ───
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const A4_W = 210;
      const A4_H = 297;

      const isPetro = company === 'Petro South';
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
          resolve(cvs.toDataURL('image/jpeg', 0.92));
        };
        img.src = letterheadSrc;
      });

      // Format date as English (Arabic text cannot render in jsPDF's built-in fonts)
      const dateStr = formData?.date
        ? new Date(formData.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      const refStr = formData?.refNumber || '';

      // Slice content into A4-height pages
      const pxPerMm = contentCanvas.width / A4_W;
      const pageHeightPx = A4_H * pxPerMm;
      const totalPages = Math.ceil(contentCanvas.height / pageHeightPx);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();

        // Layer 1: Letterhead full-bleed background (every page)
        pdf.addImage(letterheadBase64, 'JPEG', 0, 0, A4_W, A4_H);

        // Layer 2: Body content slice on top
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = contentCanvas.width;
        sliceCanvas.height = Math.min(pageHeightPx, contentCanvas.height - i * pageHeightPx);
        const ctx = sliceCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(contentCanvas, 0, -i * pageHeightPx);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(sliceData, 'JPEG', 0, 0, A4_W, A4_H);

        // Layer 3: Date & Ref — PAGE 1 ONLY — drawn INSIDE loop (no setPage needed)
        // Coordinates derived by pixel-perfect measurement of the letterhead images:
        // Petro South (1190x1683px image): Date line at x≈68%, y≈8% → 143mm, 24mm
        // MBTKRON (791x1024px image):      Date line at x≈70%, y≈4% → 147mm, 12mm
        if (i === 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(30, 30, 30); // Near-black ink

          if (isPetro) {
            if (dateStr) pdf.text(dateStr, 143, 24);
            if (refStr) pdf.text(refStr, 143, 31);
          } else {
            if (dateStr) pdf.text(dateStr, 147, 12);
            if (refStr) pdf.text(refStr, 147, 18);
          }
        }
      }

      const pdfBlob = pdf.output('blob');

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
