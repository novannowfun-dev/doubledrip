import { getSupabaseClient } from './supabase';

const KASBON_STORAGE_KEY = 'doubledrip_kasbon_records';

/**
 * Mendapatkan seluruh catatan kasbon & pinjaman
 */
export async function getKasbonRecords() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('staff_kasbon')
        .select('*')
        .order('date', { ascending: false });
      if (!error && data) {
        localStorage.setItem(KASBON_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Gagal memuat kasbon dari Supabase:', e);
    }
  }

  try {
    const raw = localStorage.getItem(KASBON_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Tambah catatan kasbon, pinjaman berjangka, atau pelunasan/cicilan
 * @param {Object} record - { staff_name, type: 'kasbon'|'pinjaman'|'cicilan', amount, tenor_months, monthly_installment, notes, date }
 */
export async function addKasbonRecord(record) {
  const supabase = getSupabaseClient();
  const newRecord = {
    id: `kasbon-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    date: record.date || new Date().toISOString().split('T')[0],
    staff_name: record.staff_name,
    type: record.type || 'kasbon', // 'kasbon', 'pinjaman', 'cicilan'
    amount: Number(record.amount) || 0,
    tenor_months: Number(record.tenor_months) || 1,
    monthly_installment: Number(record.monthly_installment) || 0,
    notes: record.notes || '',
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('staff_kasbon')
        .insert([newRecord])
        .select()
        .single();
      if (!error && data) {
        const records = await getKasbonRecords();
        return { success: true, data };
      }
    } catch (e) {
      console.warn('Gagal menyimpan kasbon ke Supabase:', e);
    }
  }

  // Fallback LocalStorage
  const records = await getKasbonRecords();
  const updated = [newRecord, ...records];
  localStorage.setItem(KASBON_STORAGE_KEY, JSON.stringify(updated));
  return { success: true, data: newRecord };
}

/**
 * Menghitung rekap saldo kasbon & pinjaman berjalan per staf
 * Mengembalikan:
 * - totalLoan: total pokok pinjaman/kasbon yang pernah diambil
 * - totalPaid: total cicilan yang sudah dibayarkan
 * - currentBalance: sisa tagihan/kewajiban
 * - activeLoan: rincian pinjaman berjalan aktif (tenor, cicilan bulanan)
 * - paidInstallmentCount: jumlah kali cicilan rutin yang sudah dibayar
 */
export function computeStaffKasbonSummary(records, staffName) {
  const staffRecords = (records || []).filter(
    r => r.staff_name?.toLowerCase() === staffName?.toLowerCase()
  );

  let totalBorrowed = 0;
  let totalPaid = 0;
  let activeLoan = null;
  let paidInstallments = 0;

  // Urutkan dari terlama ke terbaru untuk melacak riwayat pinjaman & cicilan
  const sorted = [...staffRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

  sorted.forEach(rec => {
    const amt = Number(rec.amount) || 0;
    if (rec.type === 'kasbon') {
      totalBorrowed += amt;
    } else if (rec.type === 'pinjaman') {
      totalBorrowed += amt;
      activeLoan = {
        id: rec.id,
        date: rec.date,
        totalAmount: amt,
        tenor_months: Number(rec.tenor_months) || 12,
        monthly_installment: Number(rec.monthly_installment) || Math.round(amt / (Number(rec.tenor_months) || 12)),
        notes: rec.notes
      };
    } else if (rec.type === 'cicilan' || rec.type === 'bayar') {
      totalPaid += amt;
      paidInstallments += 1;
    }
  });

  const remainingBalance = Math.max(0, totalBorrowed - totalPaid);

  return {
    totalBorrowed,
    totalPaid,
    remainingBalance,
    activeLoan: remainingBalance > 0 ? activeLoan : null,
    paidInstallmentCount: paidInstallments,
    nextInstallmentNumber: paidInstallments + 1,
    records: staffRecords
  };
}
