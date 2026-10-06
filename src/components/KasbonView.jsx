import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Calendar, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Coins, 
  History,
  Info,
  DollarSign
} from 'lucide-react';
import { formatIDR, formatDateID } from '../lib/formatters';
import { ROLES, getStaffList } from '../lib/auth';
import { 
  getKasbonRecords, 
  addKasbonRecord, 
  computeStaffKasbonSummary 
} from '../lib/kasbonService';

export default function KasbonView({ currentUser }) {
  const isOwner = currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.MANAGER;
  const [staffList, setStaffList] = useState([]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formStaffName, setFormStaffName] = useState('');
  const [formType, setFormType] = useState('pinjaman'); // 'pinjaman', 'kasbon', 'cicilan'
  const [formAmount, setFormAmount] = useState('');
  const [formTenor, setFormTenor] = useState('12'); // default 12 bulan (1 tahun)
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [staffs, kasbonData] = await Promise.all([
      getStaffList(),
      getKasbonRecords()
    ]);
    setStaffList(staffs || []);
    setRecords(kasbonData || []);
    if (staffs && staffs.length > 0 && !formStaffName) {
      setFormStaffName(staffs[0].name);
    }
    setIsLoading(false);
  };

  // Hitung angsuran bulanan otomatis jika pinjaman berjangka
  const computedMonthlyInstallment = React.useMemo(() => {
    const amt = Number(formAmount) || 0;
    const tenor = Number(formTenor) || 1;
    if (formType === 'pinjaman' && tenor > 0 && amt > 0) {
      return Math.round(amt / tenor);
    }
    return 0;
  }, [formAmount, formTenor, formType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formStaffName) {
      alert('Silakan pilih nama kru.');
      return;
    }
    const amt = Number(formAmount);
    if (!amt || amt <= 0) {
      alert('Silakan masukkan nominal yang valid.');
      return;
    }

    const payload = {
      staff_name: formStaffName,
      type: formType,
      amount: amt,
      tenor_months: formType === 'pinjaman' ? Number(formTenor) : 1,
      monthly_installment: computedMonthlyInstallment,
      notes: formNotes,
      date: formDate
    };

    const res = await addKasbonRecord(payload);
    if (res.success) {
      setShowAddModal(false);
      setFormAmount('');
      setFormNotes('');
      await loadData();
      alert(`Catatan ${formType === 'pinjaman' ? 'Pinjaman Berjangka' : formType === 'kasbon' ? 'Kasbon' : 'Pelunasan/Cicilan'} berhasil disimpan!`);
    } else {
      alert('Gagal menyimpan transaksi.');
    }
  };

  // Filter daftar staf yang ditampilkan
  const visibleStaffs = isOwner 
    ? staffList 
    : staffList.filter(s => s.name.toLowerCase() === currentUser?.name?.toLowerCase());

  // Rincian staf yang login (untuk kru)
  const mySummary = !isOwner ? computeStaffKasbonSummary(records, currentUser?.name) : null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {isOwner ? 'Manajemen Kasbon & Pinjaman Staf' : 'Pantauan Pinjaman & Kasbon Saya'}
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(217, 119, 6, 0.1)',
              color: '#d97706',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              <Coins size={12} /> Tenor & Cicilan
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            {isOwner 
              ? 'Kelola fasilitas kasbon jangka pendek dan pinjaman berjangka (cicilan rutin otomatis di slip gaji).' 
              : 'Pantau sisa saldo hutang, tenor cicilan, dan sudah bayar cicilan ke berapa secara transparan.'}
          </p>
        </div>

        {isOwner && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            <Plus size={15} />
            <span>+ Catat Pinjaman / Kasbon Baru</span>
          </button>
        )}
      </div>

      {/* Banner Khusus Kru: Status Cicilan Aktif */}
      {!isOwner && mySummary && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(250, 247, 242, 0.95) 100%)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status Kewajiban Staf
              </div>
              <h3 style={{ margin: '4px 0 6px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {currentUser?.name}
              </h3>
              {mySummary.activeLoan ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  <span>Pinjaman Tenor: <strong>{mySummary.activeLoan.tenor_months} Bulan</strong></span>
                  <span>•</span>
                  <span>Cicilan Terbayar: <strong style={{ color: '#16a34a' }}>Ke-{mySummary.paidInstallmentCount} dari {mySummary.activeLoan.tenor_months}</strong></span>
                  <span>•</span>
                  <span>Per Bulan: <strong>{formatIDR(mySummary.activeLoan.monthly_installment)}</strong></span>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  {mySummary.remainingBalance === 0 ? '🎉 Anda tidak memiliki tanggungan pinjaman/kasbon berjalan.' : 'Tanggungan kasbon non-tenor.'}
                </p>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sisa Saldo Belum Lunas</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: mySummary.remainingBalance > 0 ? '#dc2626' : '#16a34a', fontFamily: 'var(--font-mono)' }}>
                {formatIDR(mySummary.remainingBalance)}
              </div>
            </div>
          </div>

          {/* Progress Bar Cicilan jika ada activeLoan */}
          {mySummary.activeLoan && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                <span>Progres Pelunasan Cicilan</span>
                <span>{mySummary.paidInstallmentCount} / {mySummary.activeLoan.tenor_months} Bulan ({Math.min(100, Math.round((mySummary.paidInstallmentCount / mySummary.activeLoan.tenor_months) * 100))}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(100, Math.round((mySummary.paidInstallmentCount / mySummary.activeLoan.tenor_months) * 100))}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #4f46e5 0%, #10b981 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ringkasan per Kru (Untuk Owner) */}
      {isOwner && (
        <div className="glass-card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Rekap Kasbon & Pinjaman Berjalan per Kru
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total Kru: {visibleStaffs.length}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nama Kru</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status Pinjaman Berjangka</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Pinjam</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Sudah Dicicil</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Sisa Saldo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Progres Cicilan</th>
                </tr>
              </thead>
              <tbody>
                {visibleStaffs.map(staff => {
                  const summary = computeStaffKasbonSummary(records, staff.name);
                  const isClean = summary.remainingBalance === 0;
                  return (
                    <tr key={staff.id || staff.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{staff.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{staff.position || 'Kru'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {summary.activeLoan ? (
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4f46e5' }}>
                              Pinjaman {formatIDR(summary.activeLoan.totalAmount)}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Tenor {summary.activeLoan.tenor_months} bln • @ {formatIDR(summary.activeLoan.monthly_installment)}/bln
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {summary.remainingBalance > 0 ? 'Kasbon Reguler' : 'Tidak ada pinjaman'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatIDR(summary.totalBorrowed)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#16a34a', fontFamily: 'var(--font-mono)' }}>
                        {formatIDR(summary.totalPaid)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: isClean ? '#16a34a' : '#dc2626', fontFamily: 'var(--font-mono)' }}>
                        {isClean ? 'Lunas (Rp 0)' : formatIDR(summary.remainingBalance)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {summary.activeLoan ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: summary.paidInstallmentCount >= summary.activeLoan.tenor_months ? 'rgba(22, 163, 74, 0.1)' : 'rgba(79, 70, 229, 0.1)',
                            color: summary.paidInstallmentCount >= summary.activeLoan.tenor_months ? '#16a34a' : '#4f46e5',
                            fontSize: '0.74rem',
                            fontWeight: 700
                          }}>
                            Cicilan ke-{summary.paidInstallmentCount} / {summary.activeLoan.tenor_months} bln
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabel Riwayat Transaksi */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Riwayat Pencairan & Pelunasan Cicilan
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total Catatan: {records.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tanggal</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nama Kru</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tipe Transaksi</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Keterangan / Tenor</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Belum ada riwayat transaksi kasbon atau pinjaman.
                  </td>
                </tr>
              ) : (
                records
                  .filter(r => isOwner || r.staff_name.toLowerCase() === currentUser?.name?.toLowerCase())
                  .map(rec => {
                    const isPlus = rec.type === 'kasbon' || rec.type === 'pinjaman';
                    return (
                      <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {formatDateID(rec.date)}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {rec.staff_name}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: rec.type === 'pinjaman' 
                              ? 'rgba(79, 70, 229, 0.1)' 
                              : rec.type === 'kasbon' 
                              ? 'rgba(217, 119, 6, 0.1)' 
                              : 'rgba(22, 163, 74, 0.1)',
                            color: rec.type === 'pinjaman' 
                              ? '#4f46e5' 
                              : rec.type === 'kasbon' 
                              ? '#d97706' 
                              : '#16a34a'
                          }}>
                            {rec.type === 'pinjaman' ? 'Pinjaman Berjangka' : rec.type === 'kasbon' ? 'Kasbon Singkat' : 'Potongan Payroll / Cicilan'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {rec.notes || '-'}
                          {rec.tenor_months > 1 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              (Tenor {rec.tenor_months} bln • @ {formatIDR(rec.monthly_installment)}/bln)
                            </span>
                          )}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          fontFamily: 'var(--font-mono)', 
                          fontWeight: 700,
                          color: isPlus ? '#dc2626' : '#16a34a'
                        }}>
                          {isPlus ? `+${formatIDR(rec.amount)}` : `-${formatIDR(rec.amount)}`}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Pinjaman / Kasbon Baru */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Catat Pinjaman & Kasbon Staf
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Pilih Kru Cafe:</label>
                <select 
                  value={formStaffName} 
                  onChange={e => setFormStaffName(e.target.value)}
                  className="form-input"
                  required
                >
                  {staffList.map(s => (
                    <option key={s.name} value={s.name}>{s.name} ({s.position || 'Kru'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Jenis Transaksi:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'pinjaman', label: 'Pinjaman Berjangka' },
                    { id: 'kasbon', label: 'Kasbon Rutin' },
                    { id: 'cicilan', label: 'Bayar Cicilan' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormType(t.id)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: `1px solid ${formType === t.id ? '#4f46e5' : 'var(--border-subtle)'}`,
                        background: formType === t.id ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-surface)',
                        color: formType === t.id ? '#4f46e5' : 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: formType === t.id ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Nominal (Rp):</label>
                  <input 
                    type="number" 
                    placeholder="Contoh: 5000000" 
                    value={formAmount} 
                    onChange={e => setFormAmount(e.target.value)} 
                    className="form-input" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Transaksi:</label>
                  <input 
                    type="date" 
                    value={formDate} 
                    onChange={e => setFormDate(e.target.value)} 
                    className="form-input" 
                    required 
                  />
                </div>
              </div>

              {/* Opsi Tenor khusus Pinjaman Berjangka */}
              {formType === 'pinjaman' && (
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Tenor Pinjaman (Jangka Waktu):</label>
                    <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700 }}>
                      Cicilan: {formatIDR(computedMonthlyInstallment)}/bln
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[
                      { val: '3', label: '3 Bulan' },
                      { val: '6', label: '6 Bulan' },
                      { val: '10', label: '10 Bulan' },
                      { val: '12', label: '12 Bulan (1 Thn)' }
                    ].map(ten => (
                      <button
                        key={ten.val}
                        type="button"
                        onClick={() => setFormTenor(ten.val)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: `1px solid ${formTenor === ten.val ? '#4f46e5' : 'var(--border-subtle)'}`,
                          background: formTenor === ten.val ? '#4f46e5' : 'var(--bg-surface)',
                          color: formTenor === ten.val ? '#fff' : 'var(--text-secondary)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {ten.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    💡 Nilai cicilan ini akan otomatis disarankan sebagai potongan di form input slip gaji kru setiap bulannya.
                  </p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Keterangan / Alasan:</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Pinjaman dana darurat renovasi / cicilan ke-1" 
                  value={formNotes} 
                  onChange={e => setFormNotes(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
