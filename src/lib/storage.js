import { getSupabaseClient, getSupabaseConfig } from './supabase';
import { syncToGoogleSheets, getSheetsWebhookUrl } from './sheetsSync';

const LOCAL_STORAGE_KEY = 'doubledrip_daily_sales_records';

/**
 * Cek apakah aplikasi sudah terkoneksi dengan Supabase atau Google Sheets Webhook
 */
export function isConnectedToRemote() {
  const sb = getSupabaseConfig();
  const sheets = getSheetsWebhookUrl();
  return Boolean((sb.url && sb.key) || sheets);
}

/**
 * Hapus seluruh data cache lokal / sisa data demo
 */
export function purgeDemoRecords() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Hapus semua id yang memiliki awalan demo-
      const cleaned = parsed.filter(item => !String(item.id).startsWith('demo-'));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
  } catch (err) {
    console.error('Error saat membersihkan demo data:', err);
  }
  return [];
}

/**
 * Ambil data penjualan harian murni real-time dari Supabase (tanpa mock data)
 */
export async function getDailySalesRecords() {
  const supabase = getSupabaseClient();

  // 1. Jika terhubung ke Supabase, ambil langsung dari tabel PostgreSQL
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_sales')
        .select(`
          *,
          petty_cash_items (*)
        `)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Simpan salinan ke localStorage untuk cache offline
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return { source: 'supabase', data, isLive: true };
      }
      if (error) {
        console.warn('Supabase daily_sales query error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  // 2. Jika offline / belum terkoneksi, baca dari cache lokal (hanya data asli yang pernah diinput)
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const cleaned = parsed.filter(item => !String(item.id).startsWith('demo-'));
      return { source: 'local', data: cleaned, isLive: isConnectedToRemote() };
    } catch (e) {
      console.error(e);
    }
  }

  // Jika belum ada transaksi sama sekali, kembalikan array kosong (100% Bersih!)
  return { source: 'empty', data: [], isLive: isConnectedToRemote() };
}

/**
 * Simpan transaksi omset harian ke Supabase & Google Sheets
 */
export async function saveDailySalesRecord(recordData) {
  const supabase = getSupabaseClient();
  let savedId = recordData.id || `rec-${Date.now()}`;
  let source = 'local';

  // 1. Simpan ke Supabase PostgreSQL
  if (supabase) {
    try {
      const { petty_cash_items, ...mainRecord } = recordData;
      
      const { data, error } = await supabase
        .from('daily_sales')
        .insert([{
          entry_date: mainRecord.entry_date,
          shift: mainRecord.shift,
          cashier_name: mainRecord.cashier_name,
          gross_sales: mainRecord.gross_sales,
          discounts: mainRecord.discounts,
          net_sales: mainRecord.net_sales,
          payment_cash: mainRecord.payment_cash,
          payment_qris: mainRecord.payment_qris,
          payment_edc: mainRecord.payment_edc,
          payment_delivery: mainRecord.payment_delivery,
          payment_transfer: mainRecord.payment_transfer,
          opening_cash: mainRecord.opening_cash,
          petty_cash_out: mainRecord.petty_cash_out,
          expected_cash: mainRecord.expected_cash,
          actual_cash: mainRecord.actual_cash,
          cash_difference: mainRecord.cash_difference,
          notes: mainRecord.notes
        }])
        .select()
        .single();

      if (error) throw error;

      if (data && data.id) {
        savedId = data.id;
        source = 'supabase';

        // Simpan rincian nota kas kecil jika ada
        if (petty_cash_items && petty_cash_items.length > 0) {
          const itemsToInsert = petty_cash_items.map(item => ({
            sales_id: savedId,
            item_name: item.item_name,
            category: item.category,
            amount: item.amount
          }));
          await supabase.from('petty_cash_items').insert(itemsToInsert);
        }
      }
    } catch (err) {
      console.warn('Gagal simpan ke Supabase, menyimpan ke LocalStorage:', err);
    }
  }

  // 2. Simpan ke cache lokal
  const localList = purgeDemoRecords();
  const completeRecord = {
    ...recordData,
    id: savedId,
    created_at: new Date().toISOString()
  };
  localList.unshift(completeRecord);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));

  // 3. Sinkronisasi otomatis ke Google Sheets Webhook
  let sheetsStatus = null;
  try {
    sheetsStatus = await syncToGoogleSheets(recordData);
  } catch (err) {
    console.warn('Google Sheets sync error:', err);
  }

  return {
    success: true,
    id: savedId,
    source,
    sheetsStatus,
    record: completeRecord
  };
}

/**
 * Hapus transaksi dari Supabase & local storage
 */
export async function deleteDailySalesRecord(id) {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('daily_sales').delete().eq('id', id);
    } catch (err) {
      console.warn('Gagal hapus dari Supabase:', err);
    }
  }

  const localList = purgeDemoRecords();
  const filtered = localList.filter(item => item.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Bersihkan seluruh data transaksi lokal
 */
export function clearAllLocalRecords() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  return [];
}
