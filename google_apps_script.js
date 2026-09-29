/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT WEBHOOK — DOUBLEDRIP BAKE & BREW (V2 RESILIENT)
 * ==============================================================================
 * Petunjuk Penggunaan:
 * 1. Buka Google Sheet Anda: "Doubledrip Bake & Brew - Omset Harian"
 * 2. Menu atas: Extensions -> Apps Script
 * 3. Hapus semua kode lama, paste seluruh kode ini, lalu klik ikon Simpan (Ctrl+S).
 * 4. PENTING (Deploy Ulang):
 *    - Klik tombol "Deploy" di kanan atas -> "Manage deployments"
 *    - Klik ikon Pensil (Edit) pada deployment yang ada
 *    - Pada baris "Version", pilih "New version" (Wajib setiap ada perubahan kode!)
 *    - Pastikan "Execute as" = "Me (email anda)"
 *    - Pastikan "Who has access" = "Anyone"
 *    - Klik tombol "Deploy"
 *    - Salin URL Web App yang berakhiran "/exec" (JANGAN gunakan yang berakhiran "/dev")
 * 5. Buka Web App URL tersebut di tab baru browser. Jika muncul pesan "DOUBLEDRIP WEBHOOK AKTIF", berarti siap digunakan!
 */

// Menangani permintaan POST dari webapp
function doPost(e) {
  return handleRequest(e);
}

// Menangani permintaan GET (untuk testing langsung di browser atau fallback)
function doGet(e) {
  // Jika dibuka di browser biasa tanpa data transaksi
  if (!e || !e.parameter || Object.keys(e.parameter).length === 0) {
    return ContentService.createTextOutput(
      "✅ DOUBLEDRIP WEBHOOK AKTIF & SIAP MENERIMA DATA!\n\n" +
      "Status: Online\n" +
      "Waktu Server: " + new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + "\n\n" +
      "Silakan masukkan URL ini ke menu Pengaturan di Webapp DoubleDrip."
    ).setMimeType(ContentService.MimeType.TEXT);
  }

  return handleRequest(e);
}

// Fungsi utama pemroses data (Tahan banting terhadap format JSON maupun Form/URL parameter)
function handleRequest(e) {
  var lock = LockService.getScriptLock();
  // Tunggu maksimal 10 detik agar tidak ada benturan penulisan baris
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getActiveSheet() || doc.getSheets()[0];

    // Parse data dari berbagai kemungkinan format pengiriman browser
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        // Jika bukan format JSON, coba ambil dari parameter
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // Auto-create Header jika sheet masih benar-benar kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Tanggal",
        "Shift",
        "Kasir",
        "Gross Sales",
        "Diskon",
        "Net Sales",
        "Cash",
        "QRIS",
        "EDC",
        "Delivery",
        "Transfer",
        "Modal Awal",
        "Kas Keluar (Petty Cash)",
        "Kas Fisik Laci",
        "Selisih Kas",
        "Catatan",
        "Waktu Submit"
      ]);
      // Format header tebal
      sheet.getRange(1, 1, 1, 17).setFontWeight("bold").setBackground("#d99b43").setFontColor("#000000");
    }

    // Ambil nilai dengan nilai default aman
    var entryDate = data.entry_date || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
    var shift = data.shift || "General";
    var cashier = data.cashier_name || "-";
    var gross = Number(data.gross_sales) || 0;
    var discount = Number(data.discounts) || 0;
    var net = Number(data.net_sales) || (gross - discount);
    var cash = Number(data.payment_cash) || 0;
    var qris = Number(data.payment_qris) || 0;
    var edc = Number(data.payment_edc) || 0;
    var delivery = Number(data.payment_delivery) || 0;
    var transfer = Number(data.payment_transfer) || 0;
    var opening = Number(data.opening_cash) || 0;
    var petty = Number(data.petty_cash_out) || 0;
    var actual = Number(data.actual_cash) || 0;
    var diff = Number(data.cash_difference) || 0;
    var notes = data.notes || "";
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

    // Tambahkan baris baru ke Google Sheets
    sheet.appendRow([
      entryDate,
      shift,
      cashier,
      gross,
      discount,
      net,
      cash,
      qris,
      edc,
      delivery,
      transfer,
      opening,
      petty,
      actual,
      diff,
      notes,
      timestamp
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data omset DoubleDrip berhasil masuk ke Google Sheets!",
      row: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
