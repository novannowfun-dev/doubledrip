import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AuthScreen from './components/AuthScreen';
import DailySalesForm from './components/DailySalesForm';
import AttendanceView from './components/AttendanceView';
import DashboardView from './components/DashboardView';
import HistoryView from './components/HistoryView';
import PayrollView from './components/PayrollView';
import SettingsView from './components/SettingsView';
import SalesDetailModal from './components/SalesDetailModal';
import PinModal from './components/PinModal';
import { getDailySalesRecords, deleteDailySalesRecord } from './lib/storage';
import { 
  getCurrentUser, 
  setCurrentUser, 
  logoutUser, 
  isSessionExpired, 
  recordUserActivity, 
  getSessionTimeoutMinutes, 
  ROLES 
} from './lib/auth';
import { 
  getRouteFromHash, 
  navigateRoute, 
  isOwnerTab, 
  getAccessibleTab 
} from './lib/router';

export default function App() {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  
  // Inisialisasi rute aktif langsung dari URL hash (misal: #/attendance, #/payroll, dsb)
  const [activeTab, setActiveTabState] = useState(() => {
    const route = getRouteFromHash();
    return getAccessibleTab(route.tab, getCurrentUser());
  });
  
  const [historySubTab, setHistorySubTab] = useState(() => {
    const route = getRouteFromHash();
    return route.subTab || 'sales';
  });

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState(null);
  const [timeoutNotice, setTimeoutNotice] = useState(null);

  // Security PIN State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetTab, setPinTargetTab] = useState('dashboard');

  // Handler pergantian tab dengan sinkronisasi URL hash
  const handleTabChange = useCallback((newTab, newSubTab = null) => {
    const isOwner = currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.MANAGER;
    if (isOwnerTab(newTab) && !isOwner) {
      setPinTargetTab(newTab);
      setIsPinModalOpen(true);
      return;
    }

    setActiveTabState(newTab);
    if (newSubTab) setHistorySubTab(newSubTab);
    navigateRoute(newTab, newSubTab);
  }, [currentUser]);

  // Listener event HashChange (saat tombol Back/Forward browser ditekan atau URL diubah)
  useEffect(() => {
    const handleHashChange = () => {
      const route = getRouteFromHash();
      const isOwner = currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.MANAGER;

      if (isOwnerTab(route.tab) && !isOwner) {
        setPinTargetTab(route.tab);
        setIsPinModalOpen(true);
        return;
      }

      setActiveTabState(route.tab);
      if (route.subTab) {
        setHistorySubTab(route.subTab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  // Sinkronkan URL hash saat aplikasi pertama kali dimuat
  useEffect(() => {
    if (currentUser) {
      const route = getRouteFromHash();
      const valid = getAccessibleTab(route.tab, currentUser);
      navigateRoute(valid, route.subTab);
    }
  }, [currentUser]);

  // Auto-Logout Watcher: Pantau inaktivitas pengguna
  useEffect(() => {
    if (!currentUser) return;

    recordUserActivity();
    let lastRecordTime = Date.now();

    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttle pembaruan waktu aktivitas (maksimal tiap 5 detik)
      if (now - lastRecordTime > 5000) {
        lastRecordTime = now;
        recordUserActivity();
      }
    };

    const verifySessionActivity = () => {
      if (isSessionExpired(currentUser)) {
        const isOwner = currentUser.role === ROLES.OWNER || currentUser.role === ROLES.MANAGER;
        const roleLabel = isOwner ? 'Owner / Manajer' : 'Akun';
        const minutes = getSessionTimeoutMinutes();

        logoutUser();
        setCurrentUserState(null);
        setTimeoutNotice(`Sesi login ${roleLabel} telah otomatis berakhir karena tidak ada aktivitas selama ${minutes} menit demi keamanan cafe.`);
      }
    };

    const interactionEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    interactionEvents.forEach(evt => window.addEventListener(evt, handleUserInteraction, { passive: true }));

    // Cek timeout berkala setiap 5 detik
    const timer = setInterval(verifySessionActivity, 5000);

    // Cek seketika saat tab kembali dibuka / difokuskan
    window.addEventListener('focus', verifySessionActivity);
    document.addEventListener('visibilitychange', verifySessionActivity);

    return () => {
      interactionEvents.forEach(evt => window.removeEventListener(evt, handleUserInteraction));
      clearInterval(timer);
      window.removeEventListener('focus', verifySessionActivity);
      document.removeEventListener('visibilitychange', verifySessionActivity);
    };
  }, [currentUser]);

  // Load records from Supabase / localStorage
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDailySalesRecords();
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadRecords();
    }
  }, [currentUser, loadRecords]);

  // Handler simpan sukses
  const handleSaveSuccess = (newRecord) => {
    setRecords(prev => [newRecord, ...prev.filter(r => r.id !== newRecord.id)]);
  };

  // Handler hapus
  const handleDeleteRecord = async (id) => {
    await deleteDailySalesRecord(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  // Handler saat Kru klik tab terkunci
  const handleRequirePin = (targetTab) => {
    setPinTargetTab(targetTab);
    setIsPinModalOpen(true);
  };

  // Handler saat PIN berhasil diverifikasi
  const handlePinSuccess = () => {
    const ownerUser = {
      id: 'usr-owner',
      name: 'Owner DoubleDrip',
      role: ROLES.OWNER,
      position: 'Owner'
    };
    setCurrentUser(ownerUser);
    setCurrentUserState(ownerUser);
    setIsPinModalOpen(false);
    handleTabChange(pinTargetTab);
  };

  // 1. JIKA BELUM LOGIN: TAMPILKAN LOGIN & REGISTRASI KRU MANDIRI
  if (!currentUser) {
    return (
      <AuthScreen 
        timeoutNotification={timeoutNotice}
        onClearTimeoutNotification={() => setTimeoutNotice(null)}
        onLoginSuccess={(user) => {
          setTimeoutNotice(null);
          setCurrentUserState(user);
          const currentHash = getRouteFromHash();
          const targetTab = getAccessibleTab(currentHash.tab, user);
          handleTabChange(targetTab, currentHash.subTab);
        }} 
      />
    );
  }

  // 2. JIKA SUDAH LOGIN: TAMPILKAN PORTAL UTAMA CAFE
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar dengan Role Switcher & Logout */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        onRequirePin={handleRequirePin}
        onLogout={() => {
          logoutUser();
          setCurrentUserState(null);
          setTimeoutNotice(null);
        }}
      />

      {/* Main Content Area */}
      <main className="app-main-content">
        
        {/* Tab 1: Input Omset */}
        {activeTab === 'input' && (
          <DailySalesForm 
            onSaveSuccess={handleSaveSuccess} 
            currentUser={currentUser}
            onSelectRecord={(rec) => setSelectedRecordForModal(rec)}
          />
        )}

        {/* Tab 2: Absensi Shift Kru */}
        {activeTab === 'attendance' && (
          <AttendanceView 
            currentUser={currentUser} 
          />
        )}

        {/* Tab 3: Dashboard Eksekutif (Owner) */}
        {activeTab === 'dashboard' && (
          <DashboardView 
            records={records}
            onNavigateToInput={() => handleTabChange('input')}
            onSelectRecord={(rec) => setSelectedRecordForModal(rec)}
            onNavigateToExpenses={() => {
              handleTabChange('history', 'petty_cash');
            }}
          />
        )}

        {/* Tab 4: Riwayat Omset & Buku Pengeluaran (Owner) */}
        {activeTab === 'history' && (
          <HistoryView 
            records={records}
            onDeleteRecord={handleDeleteRecord}
            onSelectRecord={(rec) => setSelectedRecordForModal(rec)}
            onRefreshData={loadRecords}
            activeSubTab={historySubTab}
            onSubTabChange={(sub) => handleTabChange('history', sub)}
          />
        )}

        {/* Tab 5: Payroll & Slip Gaji */}
        {activeTab === 'payroll' && (
          <PayrollView 
            currentUser={currentUser} 
          />
        )}

        {/* Tab 6: Pengaturan (Owner) */}
        {activeTab === 'settings' && (
          <SettingsView onReloadData={loadRecords} />
        )}
      </main>

      {/* Detail Modal */}
      {selectedRecordForModal && (
        <SalesDetailModal 
          record={selectedRecordForModal} 
          onClose={() => setSelectedRecordForModal(null)} 
        />
      )}

      {/* Security PIN Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        targetActionName={pinTargetTab === 'dashboard' ? 'Dashboard Bisnis' : pinTargetTab === 'history' ? 'Riwayat Penjualan' : 'Pengaturan Sistem'}
      />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '18px 20px',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        background: 'rgba(14, 12, 10, 0.6)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>DoubleDrip Bake & Brew</strong> • Daily Sales, Shift Attendance & Payroll Portal
          </div>
          <div>
            User: <strong style={{ color: currentUser?.role === ROLES.OWNER ? 'var(--gold-light)' : 'var(--info)' }}>{currentUser?.name}</strong> ({currentUser?.role === ROLES.OWNER ? '👑 Owner' : `☕ ${currentUser?.position || 'Kru'}`})
          </div>
        </div>
      </footer>

    </div>
  );
}
