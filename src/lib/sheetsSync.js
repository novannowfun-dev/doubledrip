const STORAGE_KEY_WEBHOOK = 'doubledrip_sheets_webhook';

export function getSheetsWebhookUrl() {
  return localStorage.getItem(STORAGE_KEY_WEBHOOK) || import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL || '';
}

export function saveSheetsWebhookUrl(url) {
  if (url) localStorage.setItem(STORAGE_KEY_WEBHOOK, url.trim());
  else localStorage.removeItem(STORAGE_KEY_WEBHOOK);
}

/**
 * Validasi apakah URL yang dimasukkan pengguna adalah URL Google Web App yang valid
 */
export function validateWebhookUrl(url) {
  if (!url) return { valid: false, error: 'URL Webhook belum diisi.' };
  
  if (!url.includes('script.google.com/macros/s/')) {
    return { 
      valid: false, 
      error: 'Format URL tidak valid. Pastikan diawali dengan https://script.google.com/macros/s/...' 
    };
  }

  if (url.endsWith('/dev')) {
    return {
      valid: false,
      error: 'URL Anda berakhiran "/dev". Mohon gunakan URL Deployment Production yang berakhiran "/exec".'
    };
  }

  return { valid: true };
}

/**
 * Kirim data penjualan ke Google Sheets Webhook via Google Apps Script
 */
export async function syncToGoogleSheets(salesData) {
  const webhookUrl = getSheetsWebhookUrl();
  if (!webhookUrl) {
    return { synced: false, message: 'Google Sheets Webhook URL belum diisi di Pengaturan.' };
  }

  const validation = validateWebhookUrl(webhookUrl);
  if (!validation.valid) {
    return { synced: false, message: validation.error };
  }

  // Siapkan payload data yang bersih
  const payload = {
    entry_date: salesData.entry_date,
    shift: salesData.shift,
    cashier_name: salesData.cashier_name,
    gross_sales: Number(salesData.gross_sales) || 0,
    discounts: Number(salesData.discounts) || 0,
    net_sales: Number(salesData.net_sales) || 0,
    payment_cash: Number(salesData.payment_cash) || 0,
    payment_qris: Number(salesData.payment_qris) || 0,
    payment_edc: Number(salesData.payment_edc) || 0,
    payment_delivery: Number(salesData.payment_delivery) || 0,
    payment_transfer: Number(salesData.payment_transfer) || 0,
    opening_cash: Number(salesData.opening_cash) || 0,
    petty_cash_out: Number(salesData.petty_cash_out) || 0,
    actual_cash: Number(salesData.actual_cash) || 0,
    cash_difference: Number(salesData.cash_difference) || 0,
    notes: salesData.notes || ''
  };

  try {
    // PENTING: Gunakan 'text/plain;charset=utf-8' dengan mode 'no-cors'
    // Ini memastikan browser tidak membatalkan request atau memicu preflight CORS error di Google Apps Script
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    return { synced: true, message: 'Data berhasil dikirim ke antrean Google Sheets!' };
  } catch (err) {
    console.error('Gagal sync ke Google Sheets:', err);
    return { synced: false, message: `Gagal kirim ke Google Sheets: ${err.message}` };
  }
}

/**
 * Test ping ke webhook Google Sheets dengan data uji coba
 */
export async function testGoogleSheetsWebhook(customUrl) {
  const url = customUrl || getSheetsWebhookUrl();
  const validation = validateWebhookUrl(url);
  if (!validation.valid) {
    return { success: false, message: validation.error };
  }

  const testPayload = {
    entry_date: new Date().toISOString().split('T')[0],
    shift: 'Test Connection',
    cashier_name: 'Uji Coba Sistem',
    gross_sales: 150000,
    discounts: 0,
    net_sales: 150000,
    payment_cash: 150000,
    payment_qris: 0,
    payment_edc: 0,
    payment_delivery: 0,
    payment_transfer: 0,
    opening_cash: 500000,
    petty_cash_out: 0,
    actual_cash: 650000,
    cash_difference: 0,
    notes: 'Tes koneksi webhook DoubleDrip Bake & Brew'
  };

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(testPayload)
    });

    return { 
      success: true, 
      message: 'Sinyal Webhook terkirim! Silakan buka Google Sheet Anda dan periksa apakah baris baru dengan nama kasir "Uji Coba Sistem" sudah bertambah.' 
    };
  } catch (err) {
    return { success: false, message: `Gagal mengirim sinyal: ${err.message}` };
  }
}
