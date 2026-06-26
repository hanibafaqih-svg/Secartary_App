import React, { useState, useEffect } from 'react';
import { 
  fetchLetterLogs, 
  fetchUsers, 
  updateUserRole 
} from '../firebase';
import { 
  Shield, 
  FileText, 
  Users, 
  RefreshCw, 
  Search, 
  Calendar, 
  Building, 
  Mail, 
  UserCheck, 
  ToggleLeft, 
  ToggleRight,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'users'
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const [fetchedLogs, fetchedUsers] = await Promise.all([
        fetchLetterLogs(),
        fetchUsers()
      ]);
      setLogs(fetchedLogs);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to load admin dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    
    // Prevent self-demotion
    if (targetUser.uid === user?.uid) {
      showActionMessage('لا يمكنك تغيير دورك الخاص من لوحة التحكم.', 'error');
      return;
    }

    // Force Super Admin constraint (never allow changing Super Admin role)
    if (targetUser.email?.toLowerCase() === 'hanibafaqih@gmail.com') {
      showActionMessage('لا يمكن تعديل دور المدير العام الرئيسي (Super Admin).', 'error');
      return;
    }

    try {
      const success = await updateUserRole(targetUser.uid, newRole);
      if (success) {
        showActionMessage(`تم تعديل دور المستخدم ${targetUser.email} إلى ${newRole === 'admin' ? 'مدير' : 'موظف'} بنجاح.`, 'success');
        // Update local state
        setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: newRole } : u));
      } else {
        showActionMessage('فشل تعديل دور المستخدم. الرجاء المحاولة مرة أخرى.', 'error');
      }
    } catch (error) {
      console.error("Error toggling user role:", error);
      showActionMessage('حدث خطأ أثناء الاتصال بالنظام.', 'error');
    }
  };

  const showActionMessage = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const searchLower = logsSearch.toLowerCase();
    const docTypeLabel = log.type === 'Quotation' ? 'عرض سعر' : 'خطاب رسمي';
    return (
      (log.email || '').toLowerCase().includes(searchLower) ||
      (log.company || '').toLowerCase().includes(searchLower) ||
      (log.ref_number || '').toLowerCase().includes(searchLower) ||
      (log.subject || '').toLowerCase().includes(searchLower) ||
      (log.type || '').toLowerCase().includes(searchLower) ||
      docTypeLabel.includes(searchLower) ||
      (log.amount ? String(log.amount) : '').includes(searchLower)
    );
  });

  // Filter users
  const filteredUsers = users.filter(u => {
    const searchLower = usersSearch.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.displayName || '').toLowerCase().includes(searchLower) ||
      (u.role || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="admin-dashboard-container animate-fade-in">
      <div className="dashboard-header glass-panel">
        <div className="dashboard-title-area">
          <Shield className="dashboard-icon" size={28} />
          <div>
            <h2>لوحة إدارة النظام والرقابة (RBAC & Audit Logs)</h2>
            <p>مرحباً بك في المنطقة الأمنية للتحكم بالصلاحيات وتتبع تصدير الخطابات الرسمية</p>
          </div>
        </div>

        <button 
          onClick={() => loadData(true)} 
          className="btn-refresh" 
          disabled={refreshing || loading}
          title="تحديث البيانات"
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {actionMessage && (
        <div className={`action-alert glass-panel animate-slide-down ${actionMessage.type}`}>
          <AlertCircle size={18} />
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <FileText size={18} />
          <span>سجلات تصدير الخطابات ({logs.length})</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} />
          <span>إدارة المستخدمين والصلاحيات ({users.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-content glass-panel">
        {loading ? (
          <div className="dashboard-loading">
            <span className="spinner"></span>
            <p>جاري تحميل البيانات من الخادم الآمن...</p>
          </div>
        ) : activeTab === 'logs' ? (
          /* Tab 1: Letter Logs */
          <div className="tab-pane">
            <div className="pane-header">
              <h3>سجل عمليات التصدير والطباعة</h3>
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="ابحث عن مستخدم، شركة، عنوان أو رقم مرجعي..." 
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} className="empty-icon" />
                <p>{logsSearch ? 'لا توجد سجلات تطابق بحثك حالياً.' : 'لا توجد سجلات تصدير في النظام بعد.'}</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>المستخدم</th>
                      <th>الشركة</th>
                      <th>الرقم المرجعي</th>
                      <th>نوع المستند</th>
                      <th>الموضوع / العميل</th>
                      <th>القيمة</th>
                      <th>التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="animate-fade-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                        <td>
                          <div className="user-info-cell">
                            <Mail size={14} className="cell-icon text-sub" />
                            <span>{log.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`company-badge ${log.company === 'Petro South' ? 'petro' : 'mbtkron'}`}>
                            {log.company === 'Petro South' ? 'بيترو ساوث' : 'المبتكرون العرب'}
                          </span>
                        </td>
                        <td>
                          <span className="ref-badge">{log.ref_number}</span>
                        </td>
                        <td>
                          <span className={`type-badge ${log.type === 'Quotation' ? 'quotation' : 'letter'}`}>
                            {log.type === 'Quotation' ? 'عرض سعر' : 'خطاب رسمي'}
                          </span>
                        </td>
                        <td className="subject-cell">{log.subject}</td>
                        <td>
                          <span className="amount-cell">
                            {log.type === 'Quotation' && log.amount > 0
                              ? `${log.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${log.currency || 'USD'}`
                              : '-'
                            }
                          </span>
                        </td>
                        <td>
                          <div className="time-cell text-muted">
                            <Calendar size={14} className="cell-icon" />
                            <span>{formatDate(log.timestamp)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Users RBAC */
          <div className="tab-pane">
            <div className="pane-header">
              <h3>المستخدمين المسجلين في النظام</h3>
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="ابحث عن بريد إلكتروني أو اسم أو دور..." 
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="empty-state">
                <Users size={48} className="empty-icon" />
                <p>{usersSearch ? 'لا يوجد مستخدمون يطابقون بحثك حالياً.' : 'لا يوجد مستخدمون مسجلون في النظام.'}</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>الاسم والبريد الإلكتروني</th>
                      <th>تاريخ آخر دخول</th>
                      <th>الدور الحالي</th>
                      <th style={{ textAlign: 'center' }}>تعديل الصلاحية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, idx) => {
                      const isSuperAdmin = u.email?.toLowerCase() === 'hanibafaqih@gmail.com';
                      const isCurrentUser = u.uid === user?.uid;
                      
                      return (
                        <tr key={u.id || u.uid} className="animate-fade-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                          <td>
                            <div className="user-profile-cell">
                              <div className="profile-avatar">
                                {u.email ? u.email[0].toUpperCase() : 'U'}
                              </div>
                              <div className="profile-text">
                                <strong>{u.displayName || 'مستخدم'}</strong>
                                <span>{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="text-muted">{formatDate(u.lastLogin)}</span>
                          </td>
                          <td>
                            <span className={`role-badge ${u.role}`}>
                              {u.role === 'admin' ? 'مدير (Admin)' : 'موظف (User)'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isSuperAdmin || isCurrentUser}
                              className={`btn-toggle-role ${u.role === 'admin' ? 'is-admin' : ''} ${(isSuperAdmin || isCurrentUser) ? 'disabled' : ''}`}
                              title={
                                isSuperAdmin 
                                  ? 'لا يمكن تعديل صلاحيات المدير العام الرئيسي' 
                                  : isCurrentUser 
                                    ? 'لا يمكنك تعديل صلاحياتك بنفسك' 
                                    : `تغيير إلى دور ${u.role === 'admin' ? 'موظف' : 'مدير'}`
                              }
                            >
                              {u.role === 'admin' ? (
                                <>
                                  <ToggleRight size={24} className="toggle-icon text-accent" />
                                  <span>ترقية لمدير</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft size={24} className="toggle-icon" />
                                  <span>تخفيض لموظف</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .admin-dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
          z-index: 10;
          position: relative;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-radius: var(--radius-md);
        }
        
        .dashboard-title-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .dashboard-icon {
          color: #818cf8;
          background: rgba(99, 102, 241, 0.1);
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
          width: 44px;
          height: 44px;
        }
        
        .dashboard-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        
        .dashboard-header p {
          font-size: 12px;
          color: var(--text-sub);
        }
        
        .btn-refresh {
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
        
        .btn-refresh:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.3);
          color: #fff;
        }
        
        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        .action-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: var(--radius-sm);
          font-size: 14px;
        }
        
        .action-alert.success {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.25);
          color: #34d399;
        }
        
        .action-alert.error {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.25);
          color: #f87171;
        }
        
        .dashboard-tabs {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 4px;
        }
        
        .tab-btn {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-sub);
          padding: 10px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: var(--transition-smooth);
        }
        
        .tab-btn:hover {
          color: #fff;
        }
        
        .tab-btn.active {
          color: #818cf8;
          border-bottom-color: #6366f1;
          font-weight: 700;
        }
        
        .dashboard-content {
          border-radius: var(--radius-md);
          padding: 24px;
          min-height: 400px;
        }
        
        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 0;
          gap: 16px;
          color: var(--text-sub);
        }
        
        .pane-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .pane-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
        }
        
        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 320px;
        }
        
        .search-icon {
          position: absolute;
          right: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }
        
        .search-box input {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 10px 42px 10px 16px;
          color: #fff;
          font-size: 13px;
          transition: var(--transition-smooth);
        }
        
        .search-box input:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.08);
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          color: var(--text-muted);
          gap: 12px;
        }
        
        .empty-icon {
          opacity: 0.2;
        }
        
        .table-responsive {
          overflow-x: auto;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
        }
        
        .admin-table th {
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-main);
          font-weight: 600;
          font-size: 13px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .admin-table td {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 13px;
          color: var(--text-sub);
          vertical-align: middle;
        }
        
        .admin-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.01);
        }
        
        .user-info-cell, .time-cell, .user-profile-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .cell-icon {
          flex-shrink: 0;
        }
        
        .profile-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #fff;
          font-size: 14px;
        }
        
        .profile-text {
          display: flex;
          flex-direction: column;
        }
        
        .profile-text strong {
          color: #fff;
          font-size: 13px;
        }
        
        .profile-text span {
          font-size: 11px;
          color: var(--text-muted);
        }
        
        .company-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .company-badge.petro {
          background: rgba(255, 87, 34, 0.1);
          color: var(--petro-accent);
          border: 1px solid rgba(255, 87, 34, 0.2);
        }
        
        .company-badge.mbtkron {
          background: rgba(197, 168, 128, 0.1);
          color: var(--mbtkron-accent);
          border: 1px solid rgba(197, 168, 128, 0.2);
        }
        
        .type-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .type-badge.quotation {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .type-badge.letter {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .amount-cell {
          font-family: monospace;
          color: #10b981;
          font-weight: 700;
          font-size: 13px;
        }
        
        .ref-badge {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px 8px;
          border-radius: 4px;
          color: #818cf8;
          font-weight: 700;
          font-size: 12px;
        }
        
        .subject-cell {
          font-weight: 500;
          color: #fff;
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .role-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
        }
        
        .role-badge.admin {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        
        .role-badge.user {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-sub);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .btn-toggle-role {
          background: transparent;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 12px;
          transition: var(--transition-smooth);
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid transparent;
        }
        
        .btn-toggle-role:hover:not(.disabled) {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        
        .btn-toggle-role.is-admin {
          color: #818cf8;
        }
        
        .btn-toggle-role.disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        
        .text-accent {
          color: #818cf8;
        }
        
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
            text-align: center;
          }
          .dashboard-title-area {
            flex-direction: column;
          }
          .btn-refresh {
            justify-content: center;
          }
          .pane-header {
            flex-direction: column;
            align-items: stretch;
          }
          .search-box {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
