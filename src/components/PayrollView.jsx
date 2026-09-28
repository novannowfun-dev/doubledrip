import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  DollarSign, 
  Printer, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Award, 
  Download,
  Plus,
  Coffee,
  Trash2,
  Gift,
  Sparkles,
  Target
} from 'lucide-react';
import { formatIDR, terbilangIDR, formatDateID } from '../lib/formatters';
import { ROLES, getStaffList } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';
import { getDailySalesRecords } from '../lib/storage';
import { getTargetConfig, calculateMonthlyTargetProgress } from '../lib/targetService';

export default function PayrollView({ currentUser }) {
  const isOwner = currentUser?.role === ROLES.OWNER || currentUser?.role === ROLES.MANAGER;
  const [payrollList, setPayrollList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetConfig, setTargetConfig] = useState(null);
  const [salesRecords, setSalesRecords] = useState([]);

  // New Payroll Form State
  const [formStaffName, setFormStaffName] = useState('');
  const [formBasic, setFormBasic] = useState('');
  const [formAllowance, setFormAllowance] = useState('');
  const [formOvertime, setFormOvertime] = useState('');
  const [formBonus, setFormBonus] = useState('');
  const [formKasbon, setFormKasbon] = useState('');
  const [formAbsence, setFormAbsence] = useState('');
  const [formPeriod, setFormPeriod] = useState('September 2026');

  const supabase = getSupabaseClient();

  useEffect(() => {
    getStaffList().then(list => {
      setStaffList(list || []);
      if (list && list.length > 0) {
        setFormStaffName(list[0].name);
      }
    });

    async function loadPayroll() {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('payroll_records')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            setPayrollList(data);
            return;
          }
        } catch (e) {
          console.warn('Gagal fetch payroll dari Supabase:', e);
        }
      }

      const saved = localStorage.getItem('doubledrip_real_payroll');
      if (saved) {
        try { setPayrollList(JSON.parse(saved)); } catch(e) {}
      }
    }

    loadPayroll();
    getTargetConfig().then(cfg => setTargetConfig(cfg));
    getDailySalesRecords().then(res => setSalesRecords(res.data || []));
  }, [supabase]);

  const monthlyProgress = React.useMemo(() => {
    return calculateMonthlyTargetProgress(salesRecords, targetConfig || undefined);
  }, [salesRecords, targetConfig]);

  const estimatedBonusPerStaff = React.useMemo(() => {
    // Jika target bulanan tembus (misal Rp 45jt), setiap kru berhak atas 1% omset
    return monthlyProgress.isTargetPassed ? monthlyProgress.bonusPerStaff : 0;
  }, [monthlyProgress]);

  const calculateNet = (item) => {
    const basic = Number(item.basic_salary ?? item.basic ?? 0);
    const allow = Number(item.allowances ?? item.allowance ?? 0);
    const ot = Number(item.overtime_pay ?? item.overtime ?? 0);
    const bon = Number(item.bonus ?? 0);
    const kas = Number(item.kasbon_deduction ?? item.kasbon ?? 0);
    const abs = Number(item.absence_deduction ?? item.absenceDeduction ?? 0);
    return Math.max(0, basic + allow + ot + bon - (kas + abs));
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    const matchedStaff = staffList.find(s => s.name === formStaffName);
    const staffPos = matchedStaff?.position || 'Kru Cafe';

    const numBasic = Number(formBasic) || 0;
    const numAllow = Number(formAllowance) || 0;
    const numOt = Number(formOvertime) || 0;
    const numBon = Number(formBonus) || 0;
    const numKas = Number(formKasbon) || 0;
    const numAbs = Number(formAbsence) || 0;
    const net = Math.max(0, numBasic + numAllow + numOt + numBon - (numKas + numAbs));

    const newRecord = {
      period_month: formPeriod,
      staff_name: formStaffName,
      position: staffPos,
      basic_salary: numBasic,
      allowances: numAllow,
      overtime_pay: numOt,
      bonus: numBon,
      kasbon_deduction: numKas,
      absence_deduction: numAbs,
      net_salary: net,
      status: 'Paid'
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('payroll_records').insert([newRecord]).select().single();
        if (!error && data) {
          setPayrollList([data, ...payrollList]);
          setShowAddModal(false);
          alert(`Slip gaji untuk ${formStaffName} berhasil disimpan ke Supabase!`);
          return;
        }
      } catch (err) {
        console.warn(err);
      }
    }

    const localRec = { ...newRecord, id: `pay-${Date.now()}` };
    const updated = [localRec, ...payrollList];
    setPayrollList(updated);
    localStorage.setItem('doubledrip_real_payroll', JSON.stringify(updated));
    setShowAddModal(false);
    alert(`Slip gaji untuk ${formStaffName} berhasil disimpan!`);
  };

  const handleDeletePayroll = async (id, staffName) => {
    if (!confirm(`Hapus catatan slip gaji ${staffName}?`)) return;
    if (supabase && id && !String(id).startsWith('pay-')) {
      try {
        await supabase.from('payroll_records').delete().eq('id', id);
      } catch (e) {
        console.warn('Gagal hapus payroll di Supabase:', e);
      }
    }
    const updated = payrollList.filter(p => p.id !== id);
    setPayrollList(updated);
    localStorage.setItem('doubledrip_real_payroll', JSON.stringify(updated));
  };

  // Filter tampilan sesuai hak akses
  const visibleData = isOwner 
    ? payrollList 
    : payrollList.filter(p => (p.staff_name || p.name || '').toLowerCase() === currentUser?.name?.toLowerCase());

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{isOwner ? 'Manajemen Payroll & Gaji Staf' : 'Slip Gaji Pribadi (My Payslip)'}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gold-light)', background: 'var(--gold-glow)', padding: '2px 8px', borderRadius: '10px' }}>
              Real-time Database
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            {isOwner 
              ? 'Kelola remunerasi bulanan, tunjangan, dan cetak slip gaji resmi karyawan DoubleDrip.'
              : `Rincian hak dan slip remunerasi resmi untuk ${currentUser?.name}.`}
          </p>
        </div>

        {isOwner && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            <Plus size={15} />
            <span>Buat Slip Gaji Staf</span>
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(20, 16, 12, 0.6)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Nama & Posisi</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Periode</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Gaji Pokok</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Tunjangan + Lembur</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Potongan (Kasbon)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Gaji Bersih (Net)</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Slip Gaji</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Belum ada data slip gaji yang tercatat di database.
                    {isOwner && (
                      <div style={{ marginTop: '10px' }}>
                        <button onClick={() => setShowAddModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                          + Input Slip Gaji Karyawan Pertama
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                visibleData.map(item => {
                  const net = calculateNet(item);
                  const name = item.staff_name || item.name;
                  const pos = item.position || item.role;
                  const basic = item.basic_salary ?? item.basic;
                  const allow = (item.allowances ?? item.allowance ?? 0) + (item.overtime_pay ?? item.overtime ?? 0) + (item.bonus ?? 0);
                  const cuts = (item.kasbon_deduction ?? item.kasbon ?? 0) + (item.absence_deduction ?? item.absenceDeduction ?? 0);

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{pos}</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        {item.period_month || item.period}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatIDR(basic)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                        +{formatIDR(allow)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                        -{formatIDR(cuts)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--gold-light)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                        {formatIDR(net)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedPayslip(item)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          >
                            <FileText size={14} />
                            <span>Lihat Slip</span>
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => handleDeletePayroll(item.id, name)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '0.78rem', color: 'var(--danger)' }}
                              title="Hapus Slip Gaji"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Gaji Baru (Owner Only) */}
      {showAddModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050, padding: '16px',
          overflowY: 'auto', boxSizing: 'border-box'
        }}>
          <div className="glass-card animate-fade-in" style={{
            maxWidth: '500px', width: '100%',
            margin: 'auto',
            maxHeight: 'min(90vh, calc(100vh - 32px))',
            overflowY: 'auto',
            boxSizing: 'border-box',
            background: '#16120e', padding: '26px',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hover)',
            boxShadow: '0 25px 70px rgba(0,0,0,0.75)',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Input Slip Gaji Karyawan
            </h3>

            <form onSubmit={handleSavePayroll} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(217, 155, 67, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(217, 155, 67, 0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--gold-light)" />
                <span>Rekomendasi: Cek total jam lembur & rekap absensi kru di menu <strong>Presensi & Shift &gt; Rapor Penilaian Kinerja Kru</strong>.</span>
              </div>

              <div className="form-group">
                <label className="form-label"><span>Pilih Staf:</span></label>
                <select 
                  value={formStaffName} 
                  onChange={(e) => setFormStaffName(e.target.value)}
                  className="form-select"
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.position || 'Kru'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label"><span>Periode Bulan:</span></label>
                <input 
                  type="text" 
                  value={formPeriod} 
                  onChange={(e) => setFormPeriod(e.target.value)}
                  className="form-input" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label"><span>Gaji Pokok:</span></label>
                  <input type="number" placeholder="0" value={formBasic} onChange={(e) => setFormBasic(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label"><span>Tunjangan:</span></label>
                  <input type="number" placeholder="0" value={formAllowance} onChange={(e) => setFormAllowance(e.target.value)} className="form-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label"><span>Uang Lembur:</span></label>
                  <input type="number" placeholder="0" value={formOvertime} onChange={(e) => setFormOvertime(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0 }}><span>Bonus Omset (1%):</span></label>
                    {estimatedBonusPerStaff > 0 ? (
                      <button 
                        type="button" 
                        onClick={() => setFormBonus(estimatedBonusPerStaff)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--success)', fontSize: '0.72rem', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontWeight: 600 }}
                        title="Target bulanan tercapai! Klik untuk menerapkan bonus 1% omset"
                      >
                        🎉 Terapkan 1% Omset ({formatIDR(estimatedBonusPerStaff)})
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Target {monthlyProgress.percentAchieved}% (Terkunci)
                      </span>
                    )}
                  </div>
                  <input type="number" placeholder="0" value={formBonus} onChange={(e) => setFormBonus(e.target.value)} className="form-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label"><span>Potongan Kasbon:</span></label>
                  <input type="number" placeholder="0" value={formKasbon} onChange={(e) => setFormKasbon(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label"><span>Potongan Absen:</span></label>
                  <input type="number" placeholder="0" value={formAbsence} onChange={(e) => setFormAbsence(e.target.value)} className="form-input" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Payslip Print Modal */}
      {selectedPayslip && (() => {
        const basic = Number(selectedPayslip.basic_salary ?? selectedPayslip.basic ?? 0);
        const allow = Number(selectedPayslip.allowances ?? selectedPayslip.allowance ?? 0);
        const ot = Number(selectedPayslip.overtime_pay ?? selectedPayslip.overtime ?? 0);
        const bon = Number(selectedPayslip.bonus ?? 0);
        const grossEarnings = basic + allow + ot + bon;

        const kas = Number(selectedPayslip.kasbon_deduction ?? selectedPayslip.kasbon ?? 0);
        const abs = Number(selectedPayslip.absence_deduction ?? selectedPayslip.absenceDeduction ?? 0);
        const totalDeductions = kas + abs;

        const net = Math.max(0, grossEarnings - totalDeductions);
        const slipNo = `SLIP/${selectedPayslip.period_month ? selectedPayslip.period_month.replace(/\s+/g, '-').toUpperCase() : '2026'}/${(selectedPayslip.id || '001').slice(0, 6).toUpperCase()}`;
        const staffName = selectedPayslip.staff_name || selectedPayslip.name || 'Karyawan';
        const position = selectedPayslip.position || selectedPayslip.role || 'Kru Cafe';

        return createPortal(
          <div className="print-modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1050, padding: '16px',
            overflowY: 'auto', boxSizing: 'border-box'
          }}>
            <div className="printable-document animate-fade-in" style={{
              maxWidth: '640px', width: '100%',
              margin: 'auto',
              maxHeight: 'min(92vh, calc(100vh - 32px))',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff', color: '#1a1a1a',
              padding: '36px 40px', borderRadius: '14px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
              fontFamily: 'var(--font-sans)',
              position: 'relative'
            }}>
              
              {/* Slip Header (DoubleDrip Official) */}
              <div style={{ textAlign: 'center', borderBottom: '3px double #1f1b16', paddingBottom: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Coffee size={24} color="#8c5314" />
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#1a1510', fontFamily: 'var(--font-display)' }}>
                    DOUBLEDRIP BAKE & BREW
                  </h2>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#666', fontWeight: 500, letterSpacing: '0.04em' }}>
                  ARTISAN BAKERY • SPECIALTY COFFEE • ROASTERY
                </p>
                <div style={{ marginTop: '8px', display: 'inline-block', background: '#f5efe6', padding: '4px 14px', borderRadius: '20px', border: '1px solid #d9c4aa' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6d4313', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    SLIP GAJI RESMI KARYAWAN
                  </span>
                </div>
              </div>

              {/* Employee & Slip Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', marginBottom: '20px', background: '#f9f8f6', border: '1px solid #eee5db', padding: '12px 16px', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#777', display: 'block' }}>Nama Karyawan:</span>
                  <strong style={{ fontSize: '0.98rem', color: '#1a1a1a' }}>{staffName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#777', display: 'block' }}>Nomor Ref Slip:</span>
                  <strong style={{ fontSize: '0.88rem', color: '#8c5314', fontFamily: 'var(--font-mono)' }}>{slipNo}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#777', display: 'block' }}>Posisi / Divisi:</span>
                  <strong style={{ color: '#333' }}>{position}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#777', display: 'block' }}>Periode Gaji:</span>
                  <strong style={{ color: '#333' }}>{selectedPayslip.period_month || selectedPayslip.period || 'September 2026'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#777', display: 'block' }}>Tanggal Cetak:</span>
                  <span style={{ color: '#555', fontSize: '0.82rem' }}>{formatDateID(new Date().toISOString().split('T')[0])}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#777', display: 'block' }}>Status Pembayaran:</span>
                  <span style={{ display: 'inline-block', background: '#e6f7f2', color: '#0d7a5f', fontWeight: 700, fontSize: '0.74rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid #b5e7d8' }}>
                    ✓ LUNAS / VERIFIED
                  </span>
                </div>
              </div>

              {/* Section A: Earnings (Itemized) */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1a1a1a', borderBottom: '2px solid #2b2621', paddingBottom: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>A. RINCIAN PENGHASILAN (EARNINGS)</span>
                  <span style={{ fontSize: '0.78rem', color: '#666', fontWeight: 500 }}>JUMLAH (RP)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.86rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#333' }}>1. Gaji Pokok (Basic Salary):</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatIDR(basic)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#333' }}>2. Tunjangan Shift & Operasional:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatIDR(allow)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#333' }}>3. Upah Lembur (Overtime Pay):</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: ot > 0 ? '#b5179e' : '#333' }}>{formatIDR(ot)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <div>
                      <span style={{ color: '#333' }}>4. Bonus Target Omset Bulanan (1%):</span>
                      {bon > 0 && <span style={{ fontSize: '0.72rem', color: '#b26a00', marginLeft: '6px', fontWeight: 600 }}>★ Target Tercapai</span>}
                    </div>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: bon > 0 ? '#b26a00' : '#333' }}>{formatIDR(bon)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #ccc', paddingTop: '6px', marginTop: '2px', fontWeight: 700 }}>
                    <span style={{ color: '#1a1a1a' }}>Subtotal Penghasilan Kotor:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: '#1a1a1a' }}>{formatIDR(grossEarnings)}</strong>
                  </div>
                </div>
              </div>

              {/* Section B: Deductions (Itemized) */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#c53030', borderBottom: '2px solid #c53030', paddingBottom: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>B. RINCIAN POTONGAN (DEDUCTIONS)</span>
                  <span style={{ fontSize: '0.78rem', color: '#c53030', fontWeight: 500 }}>JUMLAH (RP)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.86rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#555' }}>1. Potongan Kasbon / Pinjaman Kru:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: kas > 0 ? '#c53030' : '#777' }}>
                      {kas > 0 ? `-${formatIDR(kas)}` : 'Rp 0'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ color: '#555' }}>2. Potongan Keterlambatan / Absensi:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: abs > 0 ? '#c53030' : '#777' }}>
                      {abs > 0 ? `-${formatIDR(abs)}` : 'Rp 0'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #f0b8b8', paddingTop: '6px', marginTop: '2px', fontWeight: 700, color: '#c53030' }}>
                    <span>Subtotal Potongan:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>-{formatIDR(totalDeductions)}</strong>
                  </div>
                </div>
              </div>

              {/* Section C: Take Home Pay Banner & Terbilang */}
              <div style={{ background: '#fdf8f0', border: '2px solid #d99b43', borderRadius: '10px', padding: '16px 20px', marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8c5314', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      TOTAL GAJI BERSIH (TAKE HOME PAY)
                    </span>
                    <div style={{ fontSize: '0.78rem', color: '#6d4313', fontStyle: 'italic', marginTop: '3px' }}>
                      Terbilang: <strong>{terbilangIDR(net)}</strong>
                    </div>
                  </div>
                  <strong style={{ fontSize: '1.45rem', fontWeight: 900, color: '#8c5314', fontFamily: 'var(--font-mono)' }}>
                    {formatIDR(net)}
                  </strong>
                </div>
              </div>

              {/* Slip Footer Note */}
              <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.74rem', color: '#666', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                * Dokumen slip gaji ini sah dan diterbitkan secara digital oleh Sistem Manajemen Terpadu DoubleDrip Bake & Brew tanpa memerlukan tanda tangan basah.
              </div>

              {/* Modal Buttons (Hidden when printed) */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '26px', borderTop: '1px solid #e0d8ce', paddingTop: '16px' }}>
                <button 
                  onClick={() => window.print()} 
                  className="btn btn-secondary" 
                  style={{ color: '#1a1a1a', background: '#f5efe6', border: '1px solid #d9c4aa', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '7px' }}
                >
                  <Printer size={16} color="#8c5314" />
                  <span>Cetak Slip Gaji (Print / PDF)</span>
                </button>
                <button 
                  onClick={() => setSelectedPayslip(null)} 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.86rem', padding: '8px 20px' }}
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>,
          document.body
        );
      })()}

    </div>
  );
}
