-- CN10 V13 OFFICIAL STABLE
-- Chạy 1 lần trong Supabase SQL Editor.
-- Script này KHÔNG xóa dữ liệu cũ, KHÔNG drop bảng, chỉ bổ sung/cập nhật schema còn thiếu.

-- =========================================================
-- 0) Bảng điểm: CN10 dùng 12 điểm
-- =========================================================
create table if not exists diem (
  id bigserial primary key,
  ten_diem text
);

alter table if exists diem
  add column if not exists ma_diem text,
  add column if not exists thu_tu int default 0,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

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
on conflict (id) do update set
  ten_diem = excluded.ten_diem,
  ma_diem = excluded.ma_diem,
  thu_tu = excluded.thu_tu,
  active = true;

select setval(pg_get_serial_sequence('diem','id'), greatest((select coalesce(max(id),1) from diem), 12), true);

-- =========================================================
-- 1) Người dùng ứng dụng
-- =========================================================
create table if not exists users_app (
  id bigserial primary key,
  email text,
  ho_ten text,
  vai_tro text default 'diem',
  diem_id bigint references diem(id),
  active boolean default true,
  created_at timestamptz default now()
);

alter table if exists users_app
  add column if not exists email text,
  add column if not exists ho_ten text,
  add column if not exists vai_tro text default 'diem',
  add column if not exists diem_id bigint,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

update users_app set email = lower(trim(email)) where email is not null;
create unique index if not exists ux_users_app_email on users_app(email);

insert into users_app(email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local', 'Quản trị CN10', 'admin', null, true)
on conflict (email) do update set
  ho_ten = excluded.ho_ten,
  vai_tro = 'admin',
  diem_id = null,
  active = true;

-- =========================================================
-- 2) Bảng đối soát lõi nếu còn thiếu
-- =========================================================
create table if not exists dot_doisoat (
  id bigserial primary key,
  ngay_doisoat date,
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

alter table if exists dot_doisoat
  add column if not exists diem_id bigint,
  add column if not exists file_name text,
  add column if not exists source_mode text,
  add column if not exists created_by text,
  add column if not exists ghi_chu text,
  add column if not exists tong_ho_so int default 0,
  add column if not exists so_khop int default 0,
  add column if not exists so_lech int default 0,
  add column if not exists tong_thuphi numeric default 0,
  add column if not exists tong_bidv numeric default 0,
  add column if not exists tong_sinvoice numeric default 0;

create table if not exists ketqua_doisoat (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ma_hoso_goc text,
  ma_hoso_sach text,
  ngay_thu text,
  don_vi text,
  thuphi numeric default 0,
  bidv numeric default 0,
  sinvoice numeric default 0,
  trang_thai text,
  tham_chieu_bidv text,
  so_hoa_don text,
  created_at timestamptz default now()
);

alter table if exists ketqua_doisoat
  add column if not exists dot_id bigint,
  add column if not exists diem_id bigint,
  add column if not exists ma_hoso_goc text,
  add column if not exists ma_hoso_sach text,
  add column if not exists ngay_thu text,
  add column if not exists don_vi text,
  add column if not exists thuphi numeric default 0,
  add column if not exists bidv numeric default 0,
  add column if not exists sinvoice numeric default 0,
  add column if not exists trang_thai text,
  add column if not exists tham_chieu_bidv text,
  add column if not exists so_hoa_don text;

create table if not exists hoa_don_chua_khop (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ngay_hoa_don text,
  so_hoa_don text,
  tong_tien numeric default 0,
  aq text,
  bp text,
  bu text,
  ly_do text,
  created_at timestamptz default now()
);

alter table if exists hoa_don_chua_khop
  add column if not exists dot_id bigint,
  add column if not exists diem_id bigint,
  add column if not exists ngay_hoa_don text,
  add column if not exists so_hoa_don text,
  add column if not exists tong_tien numeric default 0,
  add column if not exists aq text,
  add column if not exists bp text,
  add column if not exists bu text,
  add column if not exists ly_do text;

create table if not exists saoke_chua_nhan_dien (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  dien_giai text,
  so_tien numeric default 0,
  tham_chieu text,
  ly_do text,
  created_at timestamptz default now()
);

alter table if exists saoke_chua_nhan_dien
  add column if not exists dot_id bigint,
  add column if not exists diem_id bigint,
  add column if not exists ngay_giao_dich text,
  add column if not exists dien_giai text,
  add column if not exists so_tien numeric default 0,
  add column if not exists tham_chieu text,
  add column if not exists ly_do text;

create table if not exists thongke_sinvoice (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
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

alter table if exists thongke_sinvoice
  add column if not exists dot_id bigint,
  add column if not exists thang text,
  add column if not exists tong_hd int default 0,
  add column if not exists tong_hoa_don int default 0,
  add column if not exists tong_tien numeric default 0,
  add column if not exists da_khop int default 0,
  add column if not exists tien_da_khop numeric default 0,
  add column if not exists chua_khop int default 0,
  add column if not exists tien_chua_khop numeric default 0;

-- =========================================================
-- 3) Phiên đối soát và workflow
-- =========================================================
create table if not exists doisoat_session (
  id bigserial primary key,
  ma_phien text unique not null,
  diem_id bigint references diem(id),
  ky_doisoat text,
  trang_thai text default 'draft',
  dot_id bigint references dot_doisoat(id) on delete set null,
  file_name text,
  tong_ho_so int default 0,
  so_khop int default 0,
  so_lech int default 0,
  tong_thuphi numeric default 0,
  tong_bidv numeric default 0,
  tong_sinvoice numeric default 0,
  created_by text,
  closed_by text,
  created_at timestamptz default now(),
  closed_at timestamptz
);

alter table if exists doisoat_session
  add column if not exists diem_id bigint,
  add column if not exists ky_doisoat text,
  add column if not exists trang_thai text default 'draft',
  add column if not exists dot_id bigint,
  add column if not exists file_name text,
  add column if not exists tong_ho_so int default 0,
  add column if not exists so_khop int default 0,
  add column if not exists so_lech int default 0,
  add column if not exists tong_thuphi numeric default 0,
  add column if not exists tong_bidv numeric default 0,
  add column if not exists tong_sinvoice numeric default 0,
  add column if not exists created_by text,
  add column if not exists closed_by text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists closed_at timestamptz;

create table if not exists doisoat_task (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ma_hoso text,
  loai_loi text,
  noi_dung text,
  so_tien_thuphi numeric default 0,
  so_tien_bidv numeric default 0,
  so_tien_sinvoice numeric default 0,
  trang_thai text default 'open',
  assigned_to text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists doisoat_task
  add column if not exists session_id bigint,
  add column if not exists dot_id bigint,
  add column if not exists diem_id bigint,
  add column if not exists ma_hoso text,
  add column if not exists loai_loi text,
  add column if not exists noi_dung text,
  add column if not exists so_tien_thuphi numeric default 0,
  add column if not exists so_tien_bidv numeric default 0,
  add column if not exists so_tien_sinvoice numeric default 0,
  add column if not exists trang_thai text default 'open',
  add column if not exists assigned_to text,
  add column if not exists created_by text,
  add column if not exists updated_at timestamptz default now();

create table if not exists file_repository (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  loai_file text,
  file_name text,
  uploaded_by text,
  version_no int default 1,
  created_at timestamptz default now()
);

create table if not exists workflow_history (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  action text,
  detail jsonb,
  created_by text,
  created_at timestamptz default now()
);

-- =========================================================
-- 4) Hạch toán và dòng tiền
-- =========================================================
create table if not exists bank_unidentified (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete set null,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  so_tien numeric default 0,
  dien_giai text,
  tham_chieu text,
  trang_thai text default 'pending',
  ma_hoso_gan text,
  ghi_chu text,
  created_by text,
  dedup_key text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists bank_unidentified
  add column if not exists dot_id bigint,
  add column if not exists diem_id bigint,
  add column if not exists ngay_giao_dich text,
  add column if not exists so_tien numeric default 0,
  add column if not exists dien_giai text,
  add column if not exists tham_chieu text,
  add column if not exists trang_thai text default 'pending',
  add column if not exists ma_hoso_gan text,
  add column if not exists ghi_chu text,
  add column if not exists created_by text,
  add column if not exists dedup_key text,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists ux_bank_unidentified_dedup on bank_unidentified(dedup_key);

create table if not exists accounting_status (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete set null,
  diem_id bigint references diem(id),
  ma_hoso_goc text,
  ma_hoso_sach text,
  thuphi numeric default 0,
  bidv numeric default 0,
  sinvoice numeric default 0,
  bidv_ref text,
  so_hoa_don text,
  thu_phi_status text,
  bidv_status text,
  invoice_status text,
  accounting_status text default 'CHO_XU_LY',
  accounting_date date,
  nguoi_hach_toan text,
  ghi_chu text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(dot_id, ma_hoso_sach)
);

alter table if exists accounting_status
  add column if not exists dot_id bigint,
  add column if not exists diem_id bigint,
  add column if not exists ma_hoso_goc text,
  add column if not exists ma_hoso_sach text,
  add column if not exists thuphi numeric default 0,
  add column if not exists bidv numeric default 0,
  add column if not exists sinvoice numeric default 0,
  add column if not exists bidv_ref text,
  add column if not exists so_hoa_don text,
  add column if not exists thu_phi_status text,
  add column if not exists bidv_status text,
  add column if not exists invoice_status text,
  add column if not exists accounting_status text default 'CHO_XU_LY',
  add column if not exists accounting_date date,
  add column if not exists nguoi_hach_toan text,
  add column if not exists ghi_chu text,
  add column if not exists updated_at timestamptz default now();

create table if not exists accounting_action_log (
  id bigserial primary key,
  accounting_id bigint references accounting_status(id) on delete cascade,
  ma_hoso_sach text,
  action text,
  old_status text,
  new_status text,
  note text,
  created_by text,
  dedup_key text unique,
  created_at timestamptz default now()
);

create table if not exists accounting_month_close (
  id bigserial primary key,
  thang text not null,
  diem_id bigint references diem(id),
  trang_thai text default 'draft',
  tong_ho_so int default 0,
  du_dieu_kien int default 0,
  da_hach_toan int default 0,
  tien_chua_xac_dinh numeric default 0,
  ho_so_cho_xu_ly int default 0,
  closed_by text,
  closed_at timestamptz,
  created_at timestamptz default now(),
  unique(thang, diem_id)
);

-- =========================================================
-- 5) Nhật ký, thông báo, audit
-- =========================================================
create table if not exists notifications (
  id bigserial primary key,
  diem_id bigint references diem(id),
  tieu_de text,
  noi_dung text,
  muc_do text default 'info',
  loai text,
  created_by text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table if exists notifications
  add column if not exists loai text,
  add column if not exists created_by text,
  add column if not exists is_read boolean default false,
  add column if not exists muc_do text default 'info';

create table if not exists nhatky_xuly (
  id bigserial primary key,
  diem_id bigint references diem(id),
  loai text,
  tham_chieu text,
  ma_hoso text,
  ghi_chu text,
  created_by text,
  created_at timestamptz default now()
);

alter table if exists nhatky_xuly
  add column if not exists diem_id bigint,
  add column if not exists loai text,
  add column if not exists tham_chieu text,
  add column if not exists ma_hoso text,
  add column if not exists ghi_chu text,
  add column if not exists created_by text,
  add column if not exists created_at timestamptz default now();

create table if not exists audit_log (
  id bigserial primary key,
  user_email text,
  action text,
  object_type text,
  object_id text,
  detail jsonb,
  created_at timestamptz default now()
);

alter table if exists audit_log
  add column if not exists user_email text,
  add column if not exists action text,
  add column if not exists object_type text,
  add column if not exists object_id text,
  add column if not exists detail jsonb,
  add column if not exists created_at timestamptz default now();

-- =========================================================
-- 6) Index hỗ trợ tốc độ
-- =========================================================
create index if not exists idx_dot_ngay on dot_doisoat(ngay_doisoat);
create index if not exists idx_dot_diem on dot_doisoat(diem_id);
create index if not exists idx_ketqua_dot on ketqua_doisoat(dot_id);
create index if not exists idx_ketqua_diem on ketqua_doisoat(diem_id);
create index if not exists idx_ketqua_ma on ketqua_doisoat(ma_hoso_sach);
create index if not exists idx_session_diem on doisoat_session(diem_id);
create index if not exists idx_session_status on doisoat_session(trang_thai);
create index if not exists idx_task_session on doisoat_task(session_id);
create index if not exists idx_task_status on doisoat_task(trang_thai);
create index if not exists idx_bank_status on bank_unidentified(trang_thai);
create index if not exists idx_accounting_status on accounting_status(accounting_status);
create index if not exists idx_accounting_diem on accounting_status(diem_id);

-- =========================================================
-- 7) Tắt RLS giai đoạn vận hành nội bộ để tránh lỗi đọc/ghi frontend.
-- Sau khi ổn định có thể bật RLS và viết policy theo vai trò.
-- =========================================================
alter table if exists diem disable row level security;
alter table if exists users_app disable row level security;
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;
alter table if exists doisoat_session disable row level security;
alter table if exists doisoat_task disable row level security;
alter table if exists file_repository disable row level security;
alter table if exists workflow_history disable row level security;
alter table if exists notifications disable row level security;
alter table if exists audit_log disable row level security;
alter table if exists bank_unidentified disable row level security;
alter table if exists accounting_status disable row level security;
alter table if exists accounting_action_log disable row level security;
alter table if exists accounting_month_close disable row level security;

notify pgrst, 'reload schema';
