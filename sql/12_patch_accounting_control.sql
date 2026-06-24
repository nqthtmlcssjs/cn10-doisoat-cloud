-- CN10 V12 - Accounting Control Center
-- Chạy trong Supabase SQL Editor. Script này KHÔNG xóa dữ liệu cũ.
-- Mục tiêu: theo dõi dòng tiền BIDV, tiền chưa xác định và trạng thái hạch toán hồ sơ.

-- 1) Chuẩn hóa danh mục điểm: CN10 hiện vận hành 12 điểm.
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

-- 2) Tiền ngân hàng chưa xác định: lấy từ saoke_chua_nhan_dien, không tự hạch toán.
create table if not exists bank_unidentified (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete set null,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  so_tien numeric default 0,
  dien_giai text,
  tham_chieu text,
  trang_thai text default 'pending', -- pending / identified / ignored
  ma_hoso_gan text,
  ghi_chu text,
  created_by text,
  dedup_key text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bank_unidentified_status on bank_unidentified(trang_thai);
create index if not exists idx_bank_unidentified_diem on bank_unidentified(diem_id);
create index if not exists idx_bank_unidentified_dot on bank_unidentified(dot_id);

-- 3) Trạng thái hạch toán theo mã hồ sơ.
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

create index if not exists idx_accounting_status_diem on accounting_status(diem_id);
create index if not exists idx_accounting_status_status on accounting_status(accounting_status);
create index if not exists idx_accounting_status_ma on accounting_status(ma_hoso_sach);
create index if not exists idx_accounting_status_dot on accounting_status(dot_id);

-- 4) Nhật ký thao tác hạch toán.
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

-- 5) Bảng chốt tháng kế toán.
create table if not exists accounting_month_close (
  id bigserial primary key,
  thang text not null,
  diem_id bigint references diem(id),
  trang_thai text default 'draft', -- draft / closed / reopened
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

-- 6) Bổ sung trường phục vụ hạch toán trong tasks hiện có.
alter table if exists tasks
  add column if not exists accounting_status text,
  add column if not exists due_date date,
  add column if not exists priority text default 'normal';

-- 7) Tạo quyền admin mặc định nếu chưa có.
alter table if exists users_app
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

insert into users_app(email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local','Quản trị CN10','admin',null,true)
on conflict(email) do update set
  ho_ten = excluded.ho_ten,
  vai_tro = 'admin',
  diem_id = null,
  active = true;

-- 8) Giai đoạn vận hành thử: tắt RLS để frontend ghi/đọc ổn định.
alter table if exists bank_unidentified disable row level security;
alter table if exists accounting_status disable row level security;
alter table if exists accounting_action_log disable row level security;
alter table if exists accounting_month_close disable row level security;
alter table if exists diem disable row level security;
alter table if exists users_app disable row level security;
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists tasks disable row level security;

notify pgrst, 'reload schema';

-- Bổ sung dedup_key nếu bảng đã tạo từ bản thử trước đó.
alter table if exists bank_unidentified add column if not exists dedup_key text;
create unique index if not exists ux_bank_unidentified_dedup on bank_unidentified(dedup_key);
notify pgrst, 'reload schema';
