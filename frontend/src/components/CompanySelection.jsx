import React from 'react';
import { LogOut, ArrowRight, Building2, Flame, Cpu, Compass } from 'lucide-react';
import petroLogo from '../assets/petro_south_logo.jpg';
import mbtkronLogo from '../assets/mbtkron_logo.jpg';

export default function CompanySelection({ user, onSelectCompany, onLogout }) {
  const companies = [
    {
      id: 'Petro South',
      name: 'بيترو ساوث',
      englishName: 'Petro South',
      logo: petroLogo,
      description: 'الخدمات البترولية واللوجستية، النفط والغاز، والتوريدات وتجهيزات الحقول البترولية المتكاملة.',
      accentClass: 'petro-accent',
      icon: <Flame className="tech-icon" size={24} />,
      tagline: 'ريادة في قطاع الطاقة والخدمات اللوجستية'
    },
    {
      id: 'MBTKRON Arab',
      name: 'المبتكرون العرب',
      englishName: 'MBTKRON Arab',
      logo: mbtkronLogo,
      description: 'المقاولات العامة، الخدمات الهندسية المتكاملة، ومشاريع الطاقة البديلة والحلول الإنشائية المتطورة.',
      accentClass: 'mbtkron-accent',
      icon: <Cpu className="tech-icon" size={24} />,
      tagline: 'شريككم الموثوق في الإعمار وحلول الطاقة'
    }
  ];

  return (
    <div className="selection-container">
      {/* Background decoration */}
      <div className="bg-blur-circle bg-blur-1"></div>
      <div className="bg-blur-circle bg-blur-2"></div>

      <header className="selection-header animate-slide-down">
        <div className="header-brand">
          <div className="mini-logo">AI</div>
          <div>
            <h1>نظام الخطابات الرسمي</h1>
            <p className="subtitle">يرجى تحديد الشركة لبدء المعاملة</p>
          </div>
        </div>

        <div className="user-profile glass-panel">
          <div className="user-avatar">
            {user.email ? user.email[0].toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <span className="username">{user.displayName || user.email?.split('@')[0] || 'المستخدم'}</span>
            <span className="user-email">{user.email || 'متصل محلياً'}</span>
          </div>
          <button onClick={onLogout} className="btn-logout" title="تسجيل الخروج">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="selection-main">
        <h2 className="section-title animate-fade-in">اختر جهة الخطاب الرسمية</h2>
        
        <div className="company-cards">
          {companies.map((company, index) => (
            <div 
              key={company.id}
              className={`company-card glass-panel ${company.accentClass} animate-fade-in`}
              style={{ animationDelay: `${index * 0.15}s` }}
              onClick={() => onSelectCompany(company.id)}
            >
              <div className="card-badge">
                {company.icon}
                <span>{company.tagline}</span>
              </div>

              <div className="company-logo-container">
                <img 
                  src={company.logo} 
                  alt={company.name} 
                  className="company-logo" 
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = `<div class="logo-fallback-icon"><Building2 size={48} /></div>`;
                  }}
                />
              </div>

              <div className="company-info">
                <h3>{company.name}</h3>
                <span className="english-title">{company.englishName}</span>
                <p>{company.description}</p>
              </div>

              <div className="card-action">
                <span className="action-text">دخول لوحة التحكم</span>
                <div className="arrow-circle">
                  <ArrowRight size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="selection-footer animate-slide-up">
        <p>نظام صياغة الخطابات الرسمي بالذكاء الاصطناعي - الإصدار 1.0</p>
        <p className="secured-by">بوابة آمنة ومحمية للتواصل الداخلي والخارجي للشركات</p>
      </footer>
    </div>
  );
}
