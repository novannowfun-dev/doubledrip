import React, { useState } from 'react';
import { 
  Coffee, 
  PlusCircle, 
  LayoutDashboard, 
  History, 
  Settings, 
  Database, 
  FileSpreadsheet, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  User, 
  ChevronDown, 
  LogOut,
  Clock,
  DollarSign
} from 'lucide-react';
import { getSupabaseConfig } from '../lib/supabase';
import { getSheetsWebhookUrl } from '../lib/sheetsSync';
import { ROLES, setCurrentUser, logoutUser } from '../lib/auth';

export default function Navbar({ activeTab, setActiveTab, currentUser, onRequirePin, onUserChange, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const supabaseConfig = getSupabaseConfig();
  const sheetsUrl = getSheetsWebhookUrl();

  const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.key);
  const isSheetsConfigured = Boolean(sheetsUrl);

  const isOwner = currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.MANAGER;

  const handleTabClick = (tab) => {
    // Tab yang terbuka untuk semua (Kru & Owner):
    if (tab === 'input' || tab === 'attendance' || tab === 'payroll') {
      setActiveTab(tab);
      return;
    }

    // Tab yang terproteksi khusus Owner:
    if (!isOwner) {
      onRequirePin(tab);
      return;
    }

    setActiveTab(tab);
  };

  const handleSwitchToCashierMode = () => {
    const cashierUser = {
      id: 'usr-kru',
      name: 'Kru / Kasir Shift',
      role: ROLES.KRU,
      position: 'Kasir'
    };
    setCurrentUser(cashierUser);
    onUserChange(cashierUser);
    setActiveTab('input');
    setIsDropdownOpen(false);
  };

  const handleLogoutClick = () => {
    logoutUser();
    setIsDropdownOpen(false);
    onLogout();
  };

  return (
    <>
      <header className="navbar-container">
        <div className="navbar-inner">
          {/* Brand Logo & Name */}
          <div className="navbar-brand" onClick={() => handleTabClick('input')}>
            <div className="brand-logo-icon">
              <Coffee size={22} color="var(--gold-light)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                  DOUBLEDRIP
                </h1>
                <span className="brand-badge">
                  Bake & Brew
                </span>
              </div>
              <p className="brand-subtitle">
                Sales • Absensi • Payroll
              </p>
            </div>
          </div>

          {/* Navigation Tabs with Role Locks (Desktop Nav) */}
          <nav className="navbar-desktop-nav">
            
            {/* 1. Input Omset (Terbuka untuk semua) */}
            <button
              onClick={() => handleTabClick('input')}
              className={`btn ${activeTab === 'input' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 12px', fontSize: '0.84rem' }}
            >
              <PlusCircle size={15} />
              <span>Input Omset</span>
            </button>

          {/* 2. Absensi Shift (Terbuka untuk semua) */}
          <button
            onClick={() => handleTabClick('attendance')}
            className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.84rem' }}
          >
            <Clock size={15} />
            <span>Absensi Shift</span>
          </button>

          {/* 3. Dashboard (Owner only) */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.84rem', position: 'relative' }}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
            {!isOwner && <Lock size={11} style={{ opacity: 0.6, marginLeft: '2px' }} />}
          </button>

          {/* 4. Riwayat (Owner only) */}
          <button
            onClick={() => handleTabClick('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.84rem', position: 'relative' }}
          >
            <History size={15} />
            <span>Riwayat & Kas</span>
            {!isOwner && <Lock size={11} style={{ opacity: 0.6, marginLeft: '2px' }} />}
          </button>

          {/* 5. Payroll & Slip Gaji */}
          <button
            onClick={() => handleTabClick('payroll')}
            className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.84rem' }}
          >
            <DollarSign size={15} />
            <span>{isOwner ? 'Payroll' : 'Slip Gaji'}</span>
          </button>

          {/* 6. Pengaturan (Owner only) */}
          <button
            onClick={() => handleTabClick('settings')}
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.84rem', position: 'relative' }}
          >
            <Settings size={15} />
            <span>Pengaturan</span>
            {!isOwner && <Lock size={11} style={{ opacity: 0.6, marginLeft: '2px' }} />}
          </button>
        </nav>

        {/* User Profile & Logout Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="glass-card"
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: `1px solid ${isOwner ? 'var(--border-hover)' : 'var(--border-subtle)'}`,
                background: isOwner ? 'rgba(217, 155, 67, 0.1)' : 'var(--bg-card)'
              }}
            >
              {isOwner ? (
                <ShieldCheck size={15} color="var(--gold-light)" />
              ) : (
                <User size={15} color="var(--info)" />
              )}
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isOwner ? 'var(--gold-light)' : 'var(--text-primary)', display: 'block', lineHeight: 1.1 }}>
                  {currentUser?.name}
                </span>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                  {isOwner ? '👑 Owner' : `☕ ${currentUser?.position || 'Kru'}`}
                </span>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div 
                className="glass-card animate-fade-in"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '230px',
                  padding: '8px',
                  background: '#16120e',
                  border: '1px solid var(--border-hover)',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 200,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.6)'
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Akun Aktif:</div>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    {currentUser?.name}
                  </div>
                  <span className={`badge ${isOwner ? 'badge-gold' : 'badge-info'}`} style={{ marginTop: '4px', fontSize: '0.68rem' }}>
                    {isOwner ? 'Akses Penuh (Owner)' : 'Mode Kasir / Kru'}
                  </span>
                </div>

                {isOwner ? (
                  <button
                    onClick={handleSwitchToCashierMode}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--warning)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 162, 97, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Lock size={14} />
                    <span>Kunci Mode Kasir / Kru</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onRequirePin('dashboard');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--gold-light)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gold-glow)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <ShieldCheck size={14} />
                    <span>Beralih ke Owner (PIN)</span>
                  </button>
                )}

                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '6px', paddingTop: '6px' }}>
                  <button
                    onClick={handleLogoutClick}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(231, 111, 81, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={14} />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>

    {/* MOBILE BOTTOM NAVIGATION DOCK (VISIBLE ON MOBILE ONLY) */}
    <nav className="navbar-mobile-dock no-print">
      <button
        onClick={() => handleTabClick('input')}
        className={`mobile-dock-btn ${activeTab === 'input' ? 'active' : ''}`}
      >
        <PlusCircle size={20} />
        <span>Input</span>
      </button>

      <button
        onClick={() => handleTabClick('attendance')}
        className={`mobile-dock-btn ${activeTab === 'attendance' ? 'active' : ''}`}
      >
        <Clock size={20} />
        <span>Absen</span>
      </button>

      <button
        onClick={() => handleTabClick('dashboard')}
        className={`mobile-dock-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LayoutDashboard size={20} />
          {!isOwner && <Lock size={9} style={{ position: 'absolute', top: -2, right: -6, color: 'var(--gold-light)' }} />}
        </div>
        <span>Dashboard</span>
      </button>

      <button
        onClick={() => handleTabClick('history')}
        className={`mobile-dock-btn ${activeTab === 'history' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <History size={20} />
          {!isOwner && <Lock size={9} style={{ position: 'absolute', top: -2, right: -6, color: 'var(--gold-light)' }} />}
        </div>
        <span>Riwayat</span>
      </button>

      <button
        onClick={() => handleTabClick('payroll')}
        className={`mobile-dock-btn ${activeTab === 'payroll' ? 'active' : ''}`}
      >
        <DollarSign size={20} />
        <span>{isOwner ? 'Payroll' : 'Gaji'}</span>
      </button>

      <button
        onClick={() => handleTabClick('settings')}
        className={`mobile-dock-btn ${activeTab === 'settings' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={20} />
          {!isOwner && <Lock size={9} style={{ position: 'absolute', top: -2, right: -6, color: 'var(--gold-light)' }} />}
        </div>
        <span>Setelan</span>
      </button>
    </nav>
  </>
  );
}
