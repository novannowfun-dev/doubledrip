-- ==============================================================================
-- SCHEMA DATABASE SUPABASE UNTUK DOUBLEDRIP BAKE & BREW
-- Skrip ini bersifat IDEMPOTENT (Aman dijalankan berulang-ulang tanpa error).
-- Jalankan kode ini di SQL Editor pada dashboard Supabase Anda.
-- ==============================================================================

-- 1. Tabel Transaksi Omset Harian (Daily Sales)
CREATE TABLE IF NOT EXISTS daily_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL,
    shift VARCHAR(30) NOT NULL, -- 'Shift Pagi', 'Shift Sore', 'Full Day', 'Split Shift'
    cashier_name VARCHAR(100) NOT NULL,
    
    -- Rincian Penjualan
    gross_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discounts NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
    
    -- Kanal Pembayaran (Payment Breakdown)
    payment_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_qris NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_edc NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_delivery NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_transfer NUMERIC(12, 2) NOT NULL DEFAULT 0,
    
    -- Rekonsiliasi Kas Laci (Drawer Cash Reconciliation)
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,      -- Modal kas awal
    petty_cash_out NUMERIC(12, 2) NOT NULL DEFAULT 0,    -- Pengeluaran kas kecil darurat
    expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,     -- Kas Awal + Cash In - Kas Kecil
    actual_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,       -- Uang fisik dihitung kasir
    cash_difference NUMERIC(12, 2) NOT NULL DEFAULT 0,   -- Selisih (+ lebih, - kurang)
    
    -- Informasi Tambahan
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Rincian Nota Kas Kecil (Petty Cash Expenses)
CREATE TABLE IF NOT EXISTS petty_cash_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_id UUID REFERENCES daily_sales(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Es Batu / Air', 'Bahan Baku Darurat', 'Operasional', 'Lainnya'
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Daftar Pengguna & Kru Cafe (Staff, Roles, & PIN Login)
CREATE TABLE IF NOT EXISTS cafe_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'kru', -- 'owner', 'manager', 'kru'
    position VARCHAR(50) DEFAULT 'Barista',  -- 'Barista', 'Baker', 'Kasir', 'Cook', 'Manager'
    pin_code VARCHAR(20) DEFAULT '1234',     -- PIN keamanan 4-6 digit untuk login shift
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Absensi Shift Kru (Attendance)
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL,
    user_id UUID REFERENCES cafe_users(id) ON DELETE SET NULL,
    staff_name VARCHAR(100) NOT NULL,
    position VARCHAR(50) DEFAULT 'Barista',      -- 'Barista', 'Baker', 'Kasir', 'Kitchen', 'Manager'
    shift VARCHAR(30) NOT NULL,                  -- 'Shift Pagi', 'Shift Sore', 'Full Day', 'Split Shift'
    clock_in VARCHAR(10) NOT NULL,
    clock_out VARCHAR(10) DEFAULT '-',
    work_duration VARCHAR(30) DEFAULT '-',       -- Contoh: '8 Jam 15 Menit'
    status VARCHAR(20) NOT NULL DEFAULT 'Hadir', -- 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Cuti'
    late_minutes INTEGER DEFAULT 0,              -- Menit terlambat jika lewat jam masuk shift
    overtime_hours NUMERIC(4, 2) DEFAULT 0,      -- Jam lembur
    handover_notes TEXT,                         -- Catatan serah terima shift & closing bar
    notes TEXT,                                  -- Catatan absensi / alasan izin / sakit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Penambahan Kolom Baru secara Idempotent (Jika tabel sudah ada sebelumnya)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS position VARCHAR(50) DEFAULT 'Barista';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS work_duration VARCHAR(30) DEFAULT '-';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS handover_notes TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_reason TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS schedule_in VARCHAR(10);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS schedule_out VARCHAR(10);

-- 5. Tabel Penggajian Staf (Payroll & Payslip)
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_month VARCHAR(20) NOT NULL, -- contoh: 'September 2026'
    user_id UUID REFERENCES cafe_users(id) ON DELETE SET NULL,
    staff_name VARCHAR(100) NOT NULL,
    position VARCHAR(50),
    basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    allowances NUMERIC(12, 2) NOT NULL DEFAULT 0,
    overtime_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
    bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
    kasbon_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    absence_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Paid', -- 'Pending', 'Paid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- KEAMANAN ROW LEVEL SECURITY (RLS) & POLICIES (IDEMPOTENT)
-- ==============================================================================

-- A. RLS untuk daily_sales
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read daily_sales" ON daily_sales;
DROP POLICY IF EXISTS "Allow anon insert daily_sales" ON daily_sales;
DROP POLICY IF EXISTS "Allow anon update daily_sales" ON daily_sales;
DROP POLICY IF EXISTS "Allow anon delete daily_sales" ON daily_sales;
DROP POLICY IF EXISTS "Allow anon all daily_sales" ON daily_sales;
CREATE POLICY "Allow anon all daily_sales" ON daily_sales FOR ALL USING (true) WITH CHECK (true);

-- B. RLS untuk petty_cash_items
ALTER TABLE petty_cash_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read petty_cash_items" ON petty_cash_items;
DROP POLICY IF EXISTS "Allow anon insert petty_cash_items" ON petty_cash_items;
DROP POLICY IF EXISTS "Allow anon update petty_cash_items" ON petty_cash_items;
DROP POLICY IF EXISTS "Allow anon delete petty_cash_items" ON petty_cash_items;
DROP POLICY IF EXISTS "Allow anon all petty_cash_items" ON petty_cash_items;
CREATE POLICY "Allow anon all petty_cash_items" ON petty_cash_items FOR ALL USING (true) WITH CHECK (true);

-- C. RLS untuk cafe_users
ALTER TABLE cafe_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read cafe_users" ON cafe_users;
DROP POLICY IF EXISTS "Allow anon insert cafe_users" ON cafe_users;
DROP POLICY IF EXISTS "Allow anon update cafe_users" ON cafe_users;
DROP POLICY IF EXISTS "Allow anon delete cafe_users" ON cafe_users;
DROP POLICY IF EXISTS "Allow anon all cafe_users" ON cafe_users;
CREATE POLICY "Allow anon all cafe_users" ON cafe_users FOR ALL USING (true) WITH CHECK (true);

-- D. RLS untuk attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all attendance" ON attendance;
CREATE POLICY "Allow anon all attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);

-- E. RLS untuk payroll_records
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all payroll" ON payroll_records;
CREATE POLICY "Allow anon all payroll" ON payroll_records FOR ALL USING (true) WITH CHECK (true);

-- 6. Tabel Target Omset Bulanan & Bonus Kru (Monthly Team Goals)
CREATE TABLE IF NOT EXISTS cafe_targets (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current_target',
    monthly_target NUMERIC(12, 2) NOT NULL DEFAULT 45000000,          -- Target bulanan tim bersama Rp 45.000.000
    bonus_percent_per_staff NUMERIC(5, 2) NOT NULL DEFAULT 1.0,      -- Bonus 1% dari total omset per kru saat target tembus
    daily_target NUMERIC(12, 2) DEFAULT 1500000,
    shift_pagi_target NUMERIC(12, 2) DEFAULT 700000,
    shift_sore_target NUMERIC(12, 2) DEFAULT 800000,
    notes TEXT DEFAULT 'Goals bersama seluruh kru DoubleDrip. Tembus target bulanan = bonus 1% omset untuk setiap kru!',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Penambahan Kolom Bulanan secara Idempotent
ALTER TABLE cafe_targets ADD COLUMN IF NOT EXISTS monthly_target NUMERIC(12, 2) DEFAULT 45000000;
ALTER TABLE cafe_targets ADD COLUMN IF NOT EXISTS bonus_percent_per_staff NUMERIC(5, 2) DEFAULT 1.0;

ALTER TABLE cafe_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all cafe_targets" ON cafe_targets;
CREATE POLICY "Allow anon all cafe_targets" ON cafe_targets FOR ALL USING (true) WITH CHECK (true);

-- Seed konfigurasi default
INSERT INTO cafe_targets (id, monthly_target, bonus_percent_per_staff, daily_target, notes)
VALUES ('current_target', 45000000, 1.0, 1500000, 'Goals bersama seluruh kru DoubleDrip. Tembus target bulanan = bonus 1% omset untuk setiap kru!')
ON CONFLICT (id) DO UPDATE SET 
    monthly_target = EXCLUDED.monthly_target,
    bonus_percent_per_staff = EXCLUDED.bonus_percent_per_staff;

-- 7. Tabel Master Posisi & Role Kru (Kustomisasi Owner)
CREATE TABLE IF NOT EXISTS cafe_positions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    division VARCHAR(50) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE cafe_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all cafe_positions" ON cafe_positions;
CREATE POLICY "Allow anon all cafe_positions" ON cafe_positions FOR ALL USING (true) WITH CHECK (true);

-- 8. Tabel Master Jadwal Shift & Waktu (Kustomisasi Owner)
CREATE TABLE IF NOT EXISTS cafe_shifts (
    id VARCHAR(50) PRIMARY KEY,
    division VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    grace_period_minutes INTEGER DEFAULT 5,
    sort_order INTEGER DEFAULT 0,
    icon VARCHAR(20) DEFAULT '⏰',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE cafe_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all cafe_shifts" ON cafe_shifts;
CREATE POLICY "Allow anon all cafe_shifts" ON cafe_shifts FOR ALL USING (true) WITH CHECK (true);

