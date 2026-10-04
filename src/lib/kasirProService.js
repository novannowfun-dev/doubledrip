/**
 * KasirPro POS API Service
 * Integrasi resmi untuk memantau omset, ringkasan laporan harian,
 * dan transaksi pesanan dari KasirPro (https://api.kasirpro.com).
 */

import { getSupabaseClient } from './supabase';

const STORAGE_KEY_API_KEY = 'doubledrip_kasirpro_api_key';
const STORAGE_KEY_AUTO_SYNC = 'doubledrip_kasirpro_auto_sync';

/**
 * Helper untuk menentukan Base URL API KasirPro
 * Mendukung proxy lokal Vite (/api-kasirpro) untuk mencegah blokir CORS di browser.
 */
function getApiEndpoint(endpointPath) {
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  
  // Gunakan proxy path /api-kasirpro baik di localhost (Vite proxy)
  // maupun di production Vercel (vercel.json rewrite proxy) untuk menghindari blokir CORS
  return `/api-kasirpro${cleanPath}`;
}

/**
 * Ambil API Key KasirPro yang tersimpan di localStorage (sinkron/instan)
 */
export function getKasirProApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
  } catch (e) {
    console.error('Error reading KasirPro API key:', e);
    return '';
  }
}

/**
 * Tarik API Key KasirPro dari Supabase cloud (agar device baru / HP langsung terkoneksi)
 */
export async function syncKasirProApiKeyFromCloud() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cafe_integrations')
        .select('key_value')
        .eq('key_name', 'kasirpro_api_key')
        .maybeSingle();

      if (!error && data && data.key_value) {
        localStorage.setItem(STORAGE_KEY_API_KEY, data.key_value.trim());
        return data.key_value.trim();
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi API Key KasirPro dari Supabase:', err);
    }
  }
  return getKasirProApiKey();
}

/**
 * Simpan API Key KasirPro ke localStorage dan Supabase cloud
 * @param {string} key 
 */
export async function saveKasirProApiKey(key) {
  const trimmed = (key || '').trim();
  try {
    if (!trimmed) {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
    }
  } catch (e) {
    console.error('Error saving KasirPro API key to localStorage:', e);
  }

  // Simpan ke Supabase cloud agar otomatis tersinkron ke semua perangkat (HP, laptop kasir, tablet)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('cafe_integrations')
        .upsert({
          key_name: 'kasirpro_api_key',
          key_value: trimmed,
          description: 'API Token KasirPro DoubleDrip untuk sinkronisasi omset antar device',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key_name' });
    } catch (err) {
      console.warn('Gagal menyimpan API Key KasirPro ke Supabase:', err);
    }
  }

  return true;
}

/**
 * Format headers untuk autentikasi KasirPro
 */
function getHeaders(customKey = null) {
  const token = customKey || getKasirProApiKey();
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  };
}

/**
 * Helper error parser untuk respon API KasirPro
 */
async function handleResponse(res) {
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error(`Respon tidak valid (${res.status} ${res.statusText})`);
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('API Key tidak valid atau belum terdaftar.');
    }
    if (res.status === 403) {
      if (json?.code === 'license_tier') {
        throw new Error('Lisensi KasirPro akun Anda belum MAX/Unlimited. API KasirPro memerlukan lisensi MAX/Unlimited.');
      }
      if (json?.code === 'scope_required') {
        throw new Error(`Kunci tidak memiliki scope yang cukup (${json?.message || 'scope_required'}). Periksa izin kunci di backoffice.`);
      }
      throw new Error(json?.message || 'Akses ditolak (403).');
    }
    if (res.status === 429) {
      throw new Error('Batas panggilan tercapai (Rate Limit 120 req/menit). Silakan tunggu sebentar.');
    }
    throw new Error(json?.message || `Gagal menghubungi server KasirPro (${res.status})`);
  }

  return json;
}

/**
 * Tes koneksi dan validasi API Key
 * Endpoint: GET /v1/me
 */
export async function testKasirProConnection(testKey = null) {
  const token = (testKey !== null ? testKey : getKasirProApiKey()).trim();
  if (!token) {
    return { success: false, error: 'API Key belum diisi.' };
  }

  try {
    const res = await fetch(getApiEndpoint('/v1/me'), {
      method: 'GET',
      headers: getHeaders(token)
    });

    const data = await handleResponse(res);
    return {
      success: true,
      data: {
        nama: data.nama,
        lisensi: data.lisensi,
        toko: data.toko, // { id, nama }
        mode: data.mode,
        scopes: data.scopes || []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Gagal terhubung ke KasirPro.'
    };
  }
}

/**
 * Ambil Ringkasan Laporan Penjualan & Omset
 * Endpoint: GET /v1/laporan/ringkasan?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @param {string} from YYYY-MM-DD
 * @param {string} to YYYY-MM-DD
 */
export async function fetchKasirProSalesSummary(from, to) {
  const token = getKasirProApiKey();
  if (!token) {
    throw new Error('API Key KasirPro belum dikonfigurasi.');
  }

  const queryParams = new URLSearchParams();
  if (from) queryParams.append('from', from);
  if (to) queryParams.append('to', to);

  const res = await fetch(getApiEndpoint(`/v1/laporan/ringkasan?${queryParams.toString()}`), {
    method: 'GET',
    headers: getHeaders()
  });

  return await handleResponse(res);
}

/**
 * Ambil Daftar Transaksi / Nota
 * Endpoint: GET /v1/transaksi?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&per=100
 * @param {string} from YYYY-MM-DD
 * @param {string} to YYYY-MM-DD
 * @param {number} page 
 * @param {number} per 
 */
export async function fetchKasirProTransactions(from, to, page = 1, per = 100) {
  const token = getKasirProApiKey();
  if (!token) {
    throw new Error('API Key KasirPro belum dikonfigurasi.');
  }

  const queryParams = new URLSearchParams({
    from: from || '',
    to: to || '',
    page: String(page),
    per: String(per)
  });

  const res = await fetch(getApiEndpoint(`/v1/transaksi?${queryParams.toString()}`), {
    method: 'GET',
    headers: getHeaders()
  });

  return await handleResponse(res);
}

/**
 * Ambil Rincian Transaksi Tertentu
 * Endpoint: GET /v1/transaksi/detail?id=<transaksi_id>
 * @param {string|number} id
 */
export async function fetchKasirProTransactionDetail(id) {
  const token = getKasirProApiKey();
  if (!token) {
    throw new Error('API Key KasirPro belum dikonfigurasi.');
  }

  const res = await fetch(getApiEndpoint(`/v1/transaksi/detail?id=${encodeURIComponent(id)}`), {
    method: 'GET',
    headers: getHeaders()
  });

  return await handleResponse(res);
}

/**
 * Ambil Laporan Penjualan Per Produk
 * Endpoint: GET /v1/laporan/produk?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @param {string} from YYYY-MM-DD
 * @param {string} to YYYY-MM-DD
 */
export async function fetchKasirProProductSales(from, to) {
  const token = getKasirProApiKey();
  if (!token) {
    throw new Error('API Key KasirPro belum dikonfigurasi.');
  }

  const queryParams = new URLSearchParams();
  if (from) queryParams.append('from', from);
  if (to) queryParams.append('to', to);

  const res = await fetch(getApiEndpoint(`/v1/laporan/produk?${queryParams.toString()}`), {
    method: 'GET',
    headers: getHeaders()
  });

  return await handleResponse(res);
}

/**
 * Ambil Katalog Master Produk (Termasuk Kategori, Satuan, Varian)
 * Endpoint: GET /v1/produk?page=1&per=100
 */
export async function fetchKasirProCatalog(page = 1, per = 100) {
  const token = getKasirProApiKey();
  if (!token) {
    throw new Error('API Key KasirPro belum dikonfigurasi.');
  }

  const queryParams = new URLSearchParams({
    page: String(page),
    per: String(per)
  });

  const res = await fetch(getApiEndpoint(`/v1/produk?${queryParams.toString()}`), {
    method: 'GET',
    headers: getHeaders()
  });

  return await handleResponse(res);
}
