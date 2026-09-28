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
import { getCurrentUser, ROLES } from './lib/auth';

export default function App() {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState('input');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState(null);
  const [historySubTab, setHistorySubTab] = useState('sales');

  // Security PIN State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetTab, setPinTargetTab] = useState('dashboard');

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
    setCurrentUserState(ownerUser);
    setIsPinModalOpen(false);
    setActiveTab(pinTargetTab);
  };

  // 1. JIKA BELUM LOGIN: TAMPILKAN LOGIN & REGISTRASI KRU MANDIRI
  if (!currentUser) {
    return (
      <AuthScreen 
        onLoginSuccess={(user) => {
          setCurrentUserState(user);
          setActiveTab('input');
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
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onRequirePin={handleRequirePin}
        onUserChange={(user) => setCurrentUserState(user)}
        onLogout={() => setCurrentUserState(null)}
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
            onNavigateToInput={() => setActiveTab('input')}
            onSelectRecord={(rec) => setSelectedRecordForModal(rec)}
            onNavigateToExpenses={() => {
              setHistorySubTab('petty_cash');
              setActiveTab('history');
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
            onSubTabChange={setHistorySubTab}
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
