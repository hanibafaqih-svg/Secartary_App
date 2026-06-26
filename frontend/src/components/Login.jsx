import React, { useState } from 'react';
import { auth, isConfigured, mockAuth, signInWithEmailAndPassword } from '../firebase';
import { Mail, Lock, Eye, EyeOff, ShieldAlert, LogIn, AlertCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let userCredential;
      if (isConfigured) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await mockAuth.signIn(email, password);
      }
      onLoginSuccess(userCredential.user);
    } catch (err) {
      console.error('Login error:', err);
      // Translate typical Firebase error codes to user-friendly Arabic
      let errorMsg = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من الحساب.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'صيغة البريد الإلكتروني غير صحيحة.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'تم حظر محاولات الدخول مؤقتاً بسبب محاولات خاطئة متكررة. يرجى المحاولة لاحقاً.';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Visual background elements */}
      <div className="bg-blur-circle bg-blur-1"></div>
      <div className="bg-blur-circle bg-blur-2"></div>

      <div className="login-card glass-panel animate-fade-in">
        <div className="login-header">
          <div className="logo-badge">
            <span className="logo-text">AI</span>
          </div>
          <h1>نظام صياغة الرسائل الرسمية</h1>
          <p className="subtitle">تسجيل الدخول للموظفين المعتمدين</p>
        </div>

        {/* Warning if running in mock offline mode */}
        {!isConfigured && (
          <div className="mock-banner animate-pulse-subtle">
            <AlertCircle className="icon" size={18} />
            <div className="banner-content">
              <strong>وضع التجربة المحلي نشط</strong>
              <p>قاعدة البيانات غير متصلة حالياً. يمكنك استخدام أي بريد إلكتروني وكلمة مرور (6 أحرف على الأقل) للاختبار.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-alert animate-shake">
              <ShieldAlert className="icon-error" size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">البريد الإلكتروني</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                dir="ltr"
                placeholder="employee@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">كلمة المرور</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner-wrapper">
                <span className="spinner"></span>
                جاري التحقق...
              </span>
            ) : (
              <span className="btn-content">
                <LogIn size={18} />
                دخول النظام
              </span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>للحصول على حساب، يرجى مراجعة إدارة تقنية المعلومات بالشركة.</p>
          <p className="copyright">© 2026 جميع الحقوق محفوظة لشركتي بيترو ساوث والمبتكرون العرب</p>
        </div>
      </div>
    </div>
  );
}
