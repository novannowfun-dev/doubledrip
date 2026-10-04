import React, { useState, useEffect, useRef } from 'react';
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
  DollarSign,
  Receipt
} from 'lucide-react';
import { getSupabaseConfig } from '../lib/supabase';
import { getSheetsWebhookUrl } from '../lib/sheetsSync';
import { ROLES, setCurrentUser, logoutUser } from '../lib/auth';

export default function Navbar({ activeTab, setActiveTab, currentUser, onRequirePin, onUserChange, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const supabaseConfig = getSupabaseConfig();
  const sheetsUrl = getSheetsWebhookUrl();

  const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.key);
  const isSheetsConfigured = Boolean(sheetsUrl);

  const isOwner = currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.MANAGER;
  const userInitial = (currentUser?.name || 'U').trim().charAt(0).toUpperCase();

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleTabClick = (tab) => {
    // Tab yang terproteksi khusus Owner (Pengaturan):
    if (tab === 'settings' && !isOwner) {
      onRequirePin(tab);
      return;
    }

    setActiveTab(tab);
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
            <div className="brand-logo-wrapper">
              <img 
                src="/logo.svg" 
                alt="DoubleDrip Bake & Brew Logo" 
                className="brand-logo-img"
              />
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

          {/* 3. Dashboard (Terbuka untuk Kru & Owner) */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.84rem' }}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </button>

          {/* 4. KasirPro Live POS (Terbuka untuk Kru & Owner) */}
          <button
            onClick={() => handleTabClick('kasirpro')}
            className={`btn ${activeTab === 'kasirpro' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.84rem' }}
          >
            <Receipt size={15} color={activeTab === 'kasirpro' ? '#ffffff' : '#cf3a4a'} />
            <span>KasirPro POS</span>
          </button>

          {/* 5. Riwayat (Terbuka untuk Kru & Owner) */}
          <button
            onClick={() => handleTabClick('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.84rem' }}
          >
            <History size={15} />
            <span>Riwayat & Kas</span>
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

        {/* Circular Profile Avatar & Minimalist Popover */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-label="Menu Profil Akun"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: `2px solid ${isDropdownOpen ? 'var(--burgundy-primary)' : 'var(--border-hover)'}`,
                background: isOwner 
                  ? 'linear-gradient(135deg, #8B373E 0%, #682329 100%)' 
                  : 'linear-gradient(135deg, #8B373E 0%, #A24850 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.98rem',
                cursor: 'pointer',
                boxShadow: isDropdownOpen ? '0 0 0 3px rgba(139, 55, 62, 0.22)' : '0 2px 8px rgba(139, 55, 62, 0.16)',
                transition: 'all 0.2s ease',
                padding: 0
              }}
              title={`Akun: ${currentUser?.name || 'Kru'} (${isOwner ? 'Owner' : currentUser?.position || 'Kru'})`}
            >
              {/* Inisial Nama Pengguna */}
              <span>{userInitial}</span>

              {/* Status Online Indicator Dot */}
              <span style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid var(--bg-card)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.05)'
              }} />
            </button>

            {/* Popover Minimalis Profil & Logout */}
            {isDropdownOpen && (
              <div 
                className="glass-card animate-fade-in"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 10px)',
                  width: '260px',
                  padding: '18px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-hover)',
                  borderRadius: '16px',
                  zIndex: 200,
                  boxShadow: '0 16px 45px rgba(139, 55, 62, 0.18)'
                }}
              >
                {/* Header Info Akun */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: isOwner 
                      ? 'linear-gradient(135deg, #8B373E 0%, #682329 100%)' 
                      : 'linear-gradient(135deg, #8B373E 0%, #A24850 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(139, 55, 62, 0.25)'
                  }}>
                    {userInitial}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.98rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {currentUser?.name || 'Kru Cafe'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: isOwner ? 'var(--burgundy-primary)' : 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                      {isOwner ? '👑 Owner / Manajemen' : `☕ ${currentUser?.position || 'Kru Shift'}`}
                    </div>
                  </div>
                </div>

                {/* Sesi Status Banner */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  color: '#059669',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '14px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  <span>Sesi Login Aktif • DoubleDrip</span>
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: '12px' }} />

                {/* Tombol Logout Bersih */}
                <button
                  onClick={handleLogoutClick}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(225, 29, 72, 0.08)',
                    border: '1px solid rgba(225, 29, 72, 0.2)',
                    color: 'var(--danger)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(225, 29, 72, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(225, 29, 72, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(225, 29, 72, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(225, 29, 72, 0.2)';
                  }}
                >
                  <LogOut size={16} />
                  <span>Keluar (Logout)</span>
                </button>
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
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </button>

      <button
        onClick={() => handleTabClick('kasirpro')}
        className={`mobile-dock-btn ${activeTab === 'kasirpro' ? 'active' : ''}`}
      >
        <Receipt size={20} color={activeTab === 'kasirpro' ? '#cf3a4a' : 'inherit'} />
        <span>KasirPro</span>
      </button>

      <button
        onClick={() => handleTabClick('history')}
        className={`mobile-dock-btn ${activeTab === 'history' ? 'active' : ''}`}
      >
        <History size={20} />
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
