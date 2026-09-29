import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  QrCode, 
  Smartphone, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Save, 
  Clock, 
  Calendar, 
  User, 
  Receipt, 
  Wallet,
  Sparkles,
  ArrowRight,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatIDR, getShiftBadge } from '../lib/formatters';
import { saveDailySalesRecord } from '../lib/storage';

const SHIFT_OPTIONS = [
  { id: 'Shift Pagi', label: 'Shift Pagi', time: '07:00 - 15:00', icon: '☀️' },
  { id: 'Shift Malam', label: 'Shift Malam', time: '15:00 - 23:00', icon: '🌙' }
];

import { getStaffList } from '../lib/auth';

const EXPENSE_CATEGORIES = [
  'Es Batu / Air',
  'Bahan Baku Darurat',
  'Operasional Kasir',
  'Gas / Listrik',
  'Lain-lain'
];

export default function DailySalesForm({ onSaveSuccess, currentUser, onSelectRecord }) {
  const [cashierSuggestions, setCashierSuggestions] = useState([]);
  
  // Form State
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('Shift Pagi');
  const [cashierName, setCashierName] = useState(() => {
    return (currentUser && currentUser.role !== 'owner') ? currentUser.name : '';
  });

  React.useEffect(() => {
    getStaffList().then(list => {
      if (list && list.length > 0) {
        setCashierSuggestions(list.filter(u => u.is_active !== false).map(u => u.name));
      }
    });
  }, []);
  
  // Penjualan
  const [grossSales, setGrossSales] = useState('');
  const [discounts, setDiscounts] = useState('');

  // Kanal Pembayaran
  const [paymentCash, setPaymentCash] = useState('');
  const [paymentQris, setPaymentQris] = useState('');
  const [paymentEdc, setPaymentEdc] = useState('');
  const [paymentDelivery, setPaymentDelivery] = useState('');
  const [paymentTransfer, setPaymentTransfer] = useState('');

  // Rekonsiliasi Kas Laci
  const [openingCash, setOpeningCash] = useState('500000'); // Default modal kas 500rb
  const [actualCash, setActualCash] = useState('');
  
  // Kas Kecil / Petty Cash Items
  const [pettyCashItems, setPettyCashItems] = useState([
    { id: '1', item_name: '', category: 'Es Batu / Air', amount: '' }
  ]);

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Helper konversi nilai input numerik
  const numGross = Number(grossSales) || 0;
  const numDiscount = Number(discounts) || 0;
  const netSales = Math.max(0, numGross - numDiscount);

  const numCash = Number(paymentCash) || 0;
  const numQris = Number(paymentQris) || 0;
  const numEdc = Number(paymentEdc) || 0;
  const numDelivery = Number(paymentDelivery) || 0;
  const numTransfer = Number(paymentTransfer) || 0;
  const totalPayment = numCash + numQris + numEdc + numDelivery + numTransfer;

  const paymentDifference = totalPayment - netSales;
  const isPaymentBalanced = netSales > 0 && Math.abs(paymentDifference) === 0;

  // Total Kas Kecil
  const totalPettyCash = useMemo(() => {
    return pettyCashItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [pettyCashItems]);

  // Kalkulasi Kas Fisik Laci
  const numOpening = Number(openingCash) || 0;
  const expectedCashInDrawer = numOpening + numCash - totalPettyCash;
  const numActualCash = Number(actualCash) || 0;
  const drawerDifference = numActualCash - expectedCashInDrawer;

  // Handler item kas kecil
  const handleAddPettyCashItem = () => {
    setPettyCashItems(prev => [
      ...prev,
      { id: Date.now().toString(), item_name: '', category: 'Bahan Baku Darurat', amount: '' }
    ]);
  };

  const handleUpdatePettyCashItem = (id, field, value) => {
    setPettyCashItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemovePettyCashItem = (id) => {
    setPettyCashItems(prev => prev.filter(item => item.id !== id));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cashierName.trim()) {
      alert('Silakan pilih atau isi nama kasir / penanggung jawab shift.');
      return;
    }

    if (numGross <= 0) {
      alert('Silakan masukkan total penjualan kotor (Gross Sales).');
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    const validPettyCash = pettyCashItems
      .filter(item => item.item_name.trim() && Number(item.amount) > 0)
      .map(item => ({
        ...item,
        amount: Number(item.amount)
      }));

    const recordPayload = {
      entry_date: entryDate,
      shift,
      cashier_name: cashierName.trim(),
      gross_sales: numGross,
      discounts: numDiscount,
      net_sales: netSales,
      payment_cash: numCash,
      payment_qris: numQris,
      payment_edc: numEdc,
      payment_delivery: numDelivery,
      payment_transfer: numTransfer,
      opening_cash: numOpening,
      petty_cash_out: totalPettyCash,
      expected_cash: expectedCashInDrawer,
      actual_cash: numActualCash,
      cash_difference: drawerDifference,
      notes: notes.trim(),
      petty_cash_items: validPettyCash
    };

    try {
      const res = await saveDailySalesRecord(recordPayload);
      
      // Letuskan confetti jika seimbang
      if (isPaymentBalanced && drawerDifference === 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      setSubmitResult({
        success: true,
        source: res.source,
        sheetsStatus: res.sheetsStatus,
        record: res.record,
        message: 'Omset harian DoubleDrip berhasil disimpan!'
      });

      if (onSaveSuccess) onSaveSuccess(res.record);

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setSubmitResult({
        success: false,
        message: `Terjadi kendala penyimpanan: ${err.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setGrossSales('');
    setDiscounts('');
    setPaymentCash('');
    setPaymentQris('');
    setPaymentEdc('');
    setPaymentDelivery('');
    setPaymentTransfer('');
    setActualCash('');
    setPettyCashItems([{ id: '1', item_name: '', category: 'Es Batu / Air', amount: '' }]);
    setNotes('');
    setSubmitResult(null);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Input Omset Harian
            </h2>
            <span className="badge badge-primary">
              DoubleDrip Cafe
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Formulir pencatatan penjualan per shift, multi-payment reconciliation, dan audit kas laci fisik.
          </p>
        </div>

        {/* Live Date Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <Clock size={15} color="var(--burgundy-primary)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
          </span>
        </div>
      </div>

      {/* Success / Error Notification */}
      {submitResult && (
        <div className="glass-card animate-fade-in" style={{
          padding: '18px 22px',
          marginBottom: '24px',
          borderColor: submitResult.success ? 'var(--success)' : 'var(--danger)',
          background: submitResult.success ? 'rgba(46, 196, 182, 0.08)' : 'rgba(231, 111, 81, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {submitResult.success ? (
                <CheckCircle size={24} color="var(--success)" />
              ) : (
                <AlertTriangle size={24} color="var(--danger)" />
              )}
              <div>
                <h4 style={{ margin: 0, color: submitResult.success ? 'var(--success)' : 'var(--danger)', fontSize: '1.05rem' }}>
                  {submitResult.message}
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Status Penyimpanan: <strong>{submitResult.source === 'supabase' ? 'Tersimpan ke Cloud' : 'Tersimpan di Perangkat (Offline)'}</strong>
                  {submitResult.sheetsStatus?.synced && ' • Tersinkronisasi Otomatis'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {submitResult.record && onSelectRecord && (
                <button 
                  type="button" 
                  onClick={() => onSelectRecord(submitResult.record)} 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={14} />
                  <span>Lihat & Cetak Struk Shift</span>
                </button>
              )}
              <button onClick={handleResetForm} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                Input Shift Lainnya
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Section 1: Shift & Identitas */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} />
            <span>1. Waktu Operasional & Shift Kasir</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Tanggal */}
            <div className="form-group">
              <label className="form-label">
                <span>Tanggal Penjualan</span>
              </label>
              <input 
                type="date" 
                value={entryDate} 
                onChange={(e) => setEntryDate(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Nama Kasir */}
            <div className="form-group">
              <label className="form-label">
                <span>Nama Kasir / PIC Shift</span>
              </label>
              <input 
                type="text" 
                list="cashier-list"
                placeholder="Pilih atau ketik nama kasir..."
                value={cashierName} 
                onChange={(e) => setCashierName(e.target.value)}
                className="form-input"
                required
              />
              <datalist id="cashier-list">
                {cashierSuggestions.map((name, i) => (
                  <option key={i} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Pilihan Shift: Shift Pagi & Shift Malam */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '8px' }}>
              <span>Pilih Shift Cafe (Shift Pagi / Shift Malam):</span>
            </label>
            <div className="shift-selection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {SHIFT_OPTIONS.map((opt) => {
                const isSelected = shift === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setShift(opt.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--burgundy-subtle)' : 'var(--bg-input)',
                      border: `1.5px solid ${isSelected ? 'var(--burgundy-primary)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                      {isSelected && (
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                          ✓ Dipilih
                        </span>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? 'var(--burgundy-primary)' : 'var(--text-primary)' }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {opt.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Penjualan & Diskon */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} />
            <span>2. Omset Penjualan (Struk POS Kasir)</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            {/* Gross Sales */}
            <div className="form-group">
              <label className="form-label">
                <span>Gross Sales (Total Penjualan Kotor)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sebelum promo</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  value={grossSales}
                  onChange={(e) => setGrossSales(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--gold-light)' }}>
                {formatIDR(numGross)}
              </span>
            </div>

            {/* Discounts */}
            <div className="form-group">
              <label className="form-label">
                <span>Diskon / Potongan Promo / Voucher</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opsional</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  value={discounts}
                  onChange={(e) => setDiscounts(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatIDR(numDiscount)}
              </span>
            </div>
          </div>

          {/* Net Sales Box */}
          <div style={{
            marginTop: '18px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(139, 55, 62, 0.08) 0%, rgba(139, 55, 62, 0.03) 100%)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gold-light)', fontWeight: 700 }}>
                Net Sales (Omset Bersih):
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Gross Sales dikurangi Diskon & Promo
              </p>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-light)', fontFamily: 'var(--font-mono)' }}>
              {formatIDR(netSales)}
            </div>
          </div>
        </div>

        {/* Section 3: Kanal Pembayaran (Payment Breakdown) */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--burgundy-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} />
              <span>3. Rincian Kanal Pembayaran</span>
            </h3>
            
            {/* Status Keseimbangan Realtime */}
            {netSales > 0 && (
              <div>
                {isPaymentBalanced ? (
                  <span className="badge badge-success">
                    <CheckCircle size={13} />
                    <span>✓ Seimbang</span>
                  </span>
                ) : (
                  <span className="badge badge-danger">
                    <AlertTriangle size={13} />
                    <span>Selisih: {paymentDifference > 0 ? `+${formatIDR(paymentDifference)}` : formatIDR(paymentDifference)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Cash */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Wallet size={15} color="var(--success)" /> Uang Tunai (Cash)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  value={paymentCash}
                  onChange={(e) => setPaymentCash(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatIDR(numCash)}</span>
            </div>

            {/* QRIS */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><QrCode size={15} color="var(--gold-light)" /> QRIS (BCA, GoPay, Shopee)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  value={paymentQris}
                  onChange={(e) => setPaymentQris(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatIDR(numQris)}</span>
            </div>

            {/* EDC */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={15} color="var(--info)" /> Mesin EDC (Debit / Kredit)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  value={paymentEdc}
                  onChange={(e) => setPaymentEdc(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatIDR(numEdc)}</span>
            </div>

            {/* Delivery */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Truck size={15} color="var(--warning)" /> Delivery (Grab, GoFood, Shopee)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  value={paymentDelivery}
                  onChange={(e) => setPaymentDelivery(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatIDR(numDelivery)}</span>
            </div>

            {/* Transfer Bank */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Smartphone size={15} color="#b392f0" /> Transfer Bank Manual</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  value={paymentTransfer}
                  onChange={(e) => setPaymentTransfer(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatIDR(numTransfer)}</span>
            </div>
          </div>

          {/* Validation Summary Bar */}
          <div style={{
            marginTop: '20px',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: `1px solid ${isPaymentBalanced ? 'rgba(46, 196, 182, 0.3)' : 'rgba(231, 111, 81, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Total Seluruh Pembayaran:</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {formatIDR(totalPayment)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Target Net Sales:</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold-light)', fontFamily: 'var(--font-mono)' }}>
                {formatIDR(netSales)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Rekonsiliasi Kas Laci (Drawer & Petty Cash) */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} />
            <span>4. Rekonsiliasi Uang Kas Fisik di Laci & Pengeluaran Darurat</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Modal Kas Awal */}
            <div className="form-group">
              <label className="form-label">
                <span>Modal Kas Awal (Opening Float)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uang pecahan</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Rp</span>
                <input 
                  type="number"
                  placeholder="500000"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatIDR(numOpening)}</span>
            </div>

            {/* Kas Masuk Tunai */}
            <div className="form-group">
              <label className="form-label">
                <span>Penerimaan Tunai Shift Ini</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Otomatis dari Kas</span>
              </label>
              <div style={{ padding: '11px 14px', background: 'rgba(46, 196, 182, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(46, 196, 182, 0.2)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                +{formatIDR(numCash)}
              </div>
            </div>

            {/* Uang Fisik Aktual di Laci */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>Uang Fisik Aktual Dihitung Kasir</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>Rp</span>
                <input 
                  type="number"
                  placeholder="0"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="form-input number-field"
                  style={{ paddingLeft: '40px', borderColor: 'var(--gold-primary)' }}
                  required
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--gold-light)' }}>{formatIDR(numActualCash)}</span>
            </div>
          </div>

          {/* Rincian Kas Kecil (Petty Cash Expenses) */}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Pengeluaran Kas Kecil Shift Ini (Petty Cash Out)
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Contoh: Beli es batu darurat, gas, galon air, atau bensin operasional
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleAddPettyCashItem}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                <Plus size={14} />
                <span>Tambah Nota</span>
              </button>
            </div>

            {pettyCashItems.map((item, index) => (
              <div key={item.id} className="petty-cash-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                <input 
                  type="text"
                  placeholder="Nama barang (mis: Es Batu 2 Bal)..."
                  value={item.item_name}
                  onChange={(e) => handleUpdatePettyCashItem(item.id, 'item_name', e.target.value)}
                  className="form-input"
                  style={{ flex: '2', minWidth: '180px' }}
                />
                
                <select
                  value={item.category}
                  onChange={(e) => handleUpdatePettyCashItem(item.id, 'category', e.target.value)}
                  className="form-select"
                  style={{ flex: '1.2', minWidth: '150px' }}
                >
                  {EXPENSE_CATEGORIES.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>

                <div style={{ position: 'relative', flex: '1.2', minWidth: '130px' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rp</span>
                  <input 
                    type="number"
                    placeholder="Nominal"
                    value={item.amount}
                    onChange={(e) => handleUpdatePettyCashItem(item.id, 'amount', e.target.value)}
                    className="form-input number-field"
                    style={{ paddingLeft: '32px' }}
                  />
                </div>

                {pettyCashItems.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => handleRemovePettyCashItem(item.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '6px' }}
                    title="Hapus baris"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Total Kas Keluar: <strong style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>-{formatIDR(totalPettyCash)}</strong>
            </div>
          </div>

          {/* Result Rekonsiliasi Kas Laci */}
          <div style={{
            marginTop: '20px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: `1px solid ${drawerDifference === 0 ? 'rgba(46, 196, 182, 0.3)' : drawerDifference > 0 ? 'rgba(244, 162, 97, 0.3)' : 'rgba(231, 111, 81, 0.4)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Uang Kas Seharusnya (Expected):</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {formatIDR(expectedCashInDrawer)}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                (Modal Rp {formatIDR(numOpening)} + Cash Rp {formatIDR(numCash)} - Kas Kecil Rp {formatIDR(totalPettyCash)})
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status Selisih Kas Laci:</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {drawerDifference === 0 ? (
                  <span style={{ color: 'var(--success)' }}>✓ Klop (Pas Rp 0)</span>
                ) : drawerDifference > 0 ? (
                  <span style={{ color: 'var(--warning)' }}>+ Lebih {formatIDR(drawerDifference)}</span>
                ) : (
                  <span style={{ color: 'var(--danger)' }}>- Kurang {formatIDR(Math.abs(drawerDifference))}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Catatan Tambahan */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '12px' }}>
            5. Catatan Shift & Kejadian Khusus (Opsional)
          </h3>
          <textarea
            rows="3"
            placeholder="Contoh: Mesin grinder sempat dikalibrasi jam 11:00, promo pastry box laku keras, stok biji kopi House Blend sisa 2kg..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-textarea"
          />
        </div>

        {/* Submit Actions */}
        <div className="form-actions-mobile" style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={handleResetForm}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Reset Form
          </button>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ padding: '12px 28px', fontSize: '1rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Menyimpan Data Penjualan...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Simpan Omset Shift ({shift})</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
