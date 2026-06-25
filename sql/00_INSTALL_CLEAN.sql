
-- CN10 ENTERPRISE 1.0.0 - CLEAN INSTALL
-- Dùng cho PROJECT SUPABASE MỚI.
-- Chạy toàn bộ file này một lần trong SQL Editor.
-- Không dùng lại patch V10/V11/V12/V13/V14 cũ.

create extension if not exists "pgcrypto";

-- =========================
-- MASTER DATA
-- =========================

create table if not exists diem (
  id bigint primary key,
  ten_diem text not null unique,
  ma_diem text unique,
  thu_tu int not null,
  active boolean default true,
  created_at timestamptz default now()
);

insert into diem(id, ten_diem, ma_diem, thu_tu, active) values
(1, 'Tam Hưng', 'TAM_HUNG', 1, true),
(2, 'Bình Minh', 'BINH_MINH', 2, true),
(3, 'Thanh Oai', 'THANH_OAI', 3, true),
(4, 'Dân Hòa', 'DAN_HOA', 4, true),
(5, 'Ứng Thiên', 'UNG_THIEN', 5, true),
(6, 'Vân Đình', 'VAN_DINH', 6, true),
(7, 'Ứng Hòa', 'UNG_HOA', 7, true),
(8, 'Hòa Xá', 'HOA_XA', 8, true),
(9, 'Hương Sơn', 'HUONG_SON', 9, true),
(10, 'Mỹ Đức', 'MY_DUC', 10, true),
(11, 'Hồng Sơn', 'HONG_SON', 11, true),
(12, 'Phúc Sơn', 'PHUC_SON', 12, true)
on conflict(id) do update set
  ten_diem=excluded.ten_diem,
  ma_diem=excluded.ma_diem,
  thu_tu=excluded.thu_tu,
  active=true;

create table if not exists users_app (
  id bigserial primary key,
  email text not null unique,
  ho_ten text,
  vai_tro text not null default 'diem' check (vai_tro in ('admin','ketoan','lanhdao','diem')),
  diem_id bigint references diem(id),
  active boolean default true,
  created_at timestamptz default now()
);

insert into users_app(email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local','Quản trị CN10','admin',null,true)
on conflict(email) do update set ho_ten=excluded.ho_ten, vai_tro='admin', diem_id=null, active=true;

-- =========================
-- VERSION
-- =========================

create table if not exists system_version (
  id int primary key default 1,
  version_code text not null,
  database_version text not null,
  frontend_version text not null,
  notes text,
  deployed_at timestamptz default now()
);

insert into system_version(id, version_code, database_version, frontend_version, notes)
values (1, 'CN10_ENTERPRISE_1.0.0', '1.0.0', '1.0.0', 'Clean install for new Supabase project')
on conflict(id) do update set
  version_code=excluded.version_code,
  database_version=excluded.database_version,
  frontend_version=excluded.frontend_version,
  notes=excluded.notes,
  deployed_at=now();

-- =========================
-- RECONCILIATION SESSION
-- =========================

create table if not exists doisoat_session (
  id bigserial primary key,
  ma_phien text unique not null,
  diem_id bigint not null references diem(id),
  ky_doisoat text not null,
  ngay_bat_dau date,
  ngay_ket_thuc date,
  trang_thai text default 'draft' check (trang_thai in ('draft','ready','running','review','completed','closed','canceled')),
  created_by text,
  created_at timestamptz default now(),
  closed_by text,
  closed_at timestamptz,
  ghi_chu text
);

create table if not exists doisoat_file (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  loai_file text not null check (loai_file in ('WORKBOOK','THUPHI','BIDV','SINVOICE')),
  file_name text,
  row_count int default 0,
  status text default 'uploaded',
  uploaded_by text,
  uploaded_at timestamptz default now(),
  meta jsonb default '{}'::jsonb
);

-- =========================
-- CORE RESULTS
-- =========================

create table if not exists dot_doisoat (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete set null,
  ngay_doisoat date not null default current_date,
  diem_id bigint references diem(id),
  nguoi_thuc_hien text,
  ghi_chu text,
  file_name text,
  source_mode text,
  created_by text,
  tong_ho_so int default 0,
  so_khop int default 0,
  so_lech int default 0,
  tong_thuphi numeric default 0,
  tong_bidv numeric default 0,
  tong_sinvoice numeric default 0,
  created_at timestamptz default now()
);

create table if not exists ketqua_doisoat (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete set null,
  diem_id bigint references diem(id),
  ma_hoso_goc text,
  ma_hoso_sach text,
  ngay_thu text,
  don_vi text,
  thuphi numeric default 0,
  bidv numeric default 0,
  sinvoice numeric default 0,
  chenh_bidv numeric generated always as (coalesce(thuphi,0)-coalesce(bidv,0)) stored,
  chenh_sinvoice numeric generated always as (coalesce(thuphi,0)-coalesce(sinvoice,0)) stored,
  trang_thai text,
  loai_loi text,
  huong_hach_toan text,
  tham_chieu_bidv text,
  so_hoa_don text,
  trang_thai_xuly text default 'chua_xu_ly',
  ghi_chu_ketoan text,
  created_at timestamptz default now()
);

create table if not exists hoa_don_chua_khop (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete set null,
  diem_id bigint references diem(id),
  ngay_hoa_don text,
  so_hoa_don text,
  tong_tien numeric default 0,
  aq text,
  bp text,
  bu text,
  ly_do text,
  trang_thai_xuly text default 'chua_xu_ly',
  created_at timestamptz default now()
);

create table if not exists saoke_chua_nhan_dien (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete set null,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  dien_giai text,
  so_tien numeric default 0,
  tham_chieu text,
  ly_do text,
  trang_thai_xuly text default 'chua_xu_ly',
  created_at timestamptz default now()
);

create table if not exists thongke_sinvoice (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete set null,
  thang text,
  tong_hd int default 0,
  tong_hoa_don int default 0,
  tong_tien numeric default 0,
  da_khop int default 0,
  tien_da_khop numeric default 0,
  chua_khop int default 0,
  tien_chua_khop numeric default 0,
  created_at timestamptz default now()
);

-- =========================
-- ACCOUNTING CONTROL
-- =========================

create table if not exists bank_transaction (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete set null,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  tham_chieu text,
  dien_giai text,
  so_tien numeric default 0,
  ma_hoso_sach text,
  matched boolean default false,
  unique(tham_chieu, so_tien)
);

create table if not exists invoice_transaction (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete set null,
  diem_id bigint references diem(id),
  ngay_hoa_don text,
  so_hoa_don text unique,
  tong_tien numeric default 0,
  ma_hoso_sach text,
  trang_thai_hoa_don text default 'active',
  hoa_don_thay_the text,
  matched boolean default false
);

create table if not exists bank_unidentified (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete set null,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  so_tien numeric default 0,
  dien_giai text,
  tham_chieu text,
  trang_thai text default 'pending',
  ma_hoso_gan text,
  ghi_chu text,
  created_at timestamptz default now()
);

create table if not exists accounting_status (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete set null,
  diem_id bigint references diem(id),
  ma_hoso_sach text not null,
  ma_hoso_goc text,
  thu_phi_status text default 'unknown',
  bidv_status text default 'unknown',
  invoice_status text default 'unknown',
  accounting_status text default 'cho_xu_ly',
  accounting_date date,
  amount_thuphi numeric default 0,
  amount_bidv numeric default 0,
  amount_invoice numeric default 0,
  ghi_chu text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_id, ma_hoso_sach)
);

-- =========================
-- WORKFLOW
-- =========================

create table if not exists tasks (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  dot_id bigint references dot_doisoat(id) on delete set null,
  diem_id bigint references diem(id),
  ma_hoso text,
  loai_loi text,
  noi_dung text,
  huong_xu_ly text,
  trang_thai text default 'open',
  assigned_to text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists notifications (
  id bigserial primary key,
  diem_id bigint references diem(id),
  tieu_de text,
  noi_dung text,
  muc_do text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists workflow_history (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  action text,
  detail jsonb default '{}'::jsonb,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  action text not null,
  email text,
  vai_tro text,
  diem_id bigint references diem(id),
  detail jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists monthly_close (
  id bigserial primary key,
  thang text not null,
  diem_id bigint references diem(id),
  status text default 'open',
  total_sessions int default 0,
  total_amount numeric default 0,
  unresolved_count int default 0,
  closed_by text,
  closed_at timestamptz,
  created_at timestamptz default now(),
  unique(thang, diem_id)
);

create table if not exists nhatky_xuly (
  id bigserial primary key,
  diem_id bigint references diem(id),
  loai text not null,
  tham_chieu text not null,
  ma_hoso text not null,
  ghi_chu text,
  created_by text,
  created_at timestamptz default now()
);

-- =========================
-- INDEXES
-- =========================

create index if not exists idx_session_diem on doisoat_session(diem_id);
create index if not exists idx_session_status on doisoat_session(trang_thai);
create index if not exists idx_ketqua_session on ketqua_doisoat(session_id);
create index if not exists idx_ketqua_ma on ketqua_doisoat(ma_hoso_sach);
create index if not exists idx_ketqua_status on ketqua_doisoat(trang_thai);
create index if not exists idx_tasks_session on tasks(session_id);
create index if not exists idx_tasks_status on tasks(trang_thai);
create index if not exists idx_bank_unidentified_status on bank_unidentified(trang_thai);
create index if not exists idx_accounting_status on accounting_status(accounting_status);

-- =========================
-- PERMISSIONS FOR EARLY OPERATION
-- =========================

alter table diem disable row level security;
alter table users_app disable row level security;
alter table system_version disable row level security;
alter table doisoat_session disable row level security;
alter table doisoat_file disable row level security;
alter table dot_doisoat disable row level security;
alter table ketqua_doisoat disable row level security;
alter table hoa_don_chua_khop disable row level security;
alter table saoke_chua_nhan_dien disable row level security;
alter table thongke_sinvoice disable row level security;
alter table bank_transaction disable row level security;
alter table invoice_transaction disable row level security;
alter table bank_unidentified disable row level security;
alter table accounting_status disable row level security;
alter table tasks disable row level security;
alter table notifications disable row level security;
alter table workflow_history disable row level security;
alter table audit_log disable row level security;
alter table monthly_close disable row level security;
alter table nhatky_xuly disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

notify pgrst, 'reload schema';
