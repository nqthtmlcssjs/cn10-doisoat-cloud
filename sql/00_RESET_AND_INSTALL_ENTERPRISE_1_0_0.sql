-- CN10 Fee Control Center Enterprise 1.0.0
-- CẢNH BÁO: File này RESET schema public, xóa toàn bộ bảng/dữ liệu cũ trong public.
-- Chỉ chạy khi đã chấp nhận làm sạch database để cài bản chính thức.

drop schema if exists public cascade;
create schema public;

grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create table system_version (
  id int primary key default 1,
  app_name text default 'CN10 Fee Control Center',
  version_code text not null,
  database_version text not null,
  deployed_at timestamptz default now(),
  notes text
);
insert into system_version(id, version_code, database_version, notes)
values (1, '1.0.0', '1.0.0', 'Enterprise clean install');

create table diem (
  id bigint primary key,
  ten_diem text not null unique,
  ma_diem text unique,
  thu_tu int,
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
(12, 'Phúc Sơn', 'PHUC_SON', 12, true);

create table users_app (
  id bigserial primary key,
  email text not null unique,
  ho_ten text,
  vai_tro text not null default 'diem', -- admin/ketoan/lanhdao/diem
  diem_id bigint references diem(id),
  active boolean default true,
  created_at timestamptz default now()
);

insert into users_app(email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local', 'Quản trị CN10', 'admin', null, true);

create table doisoat_session (
  id bigserial primary key,
  ma_phien text unique not null,
  diem_id bigint references diem(id),
  ky_doisoat text not null,
  ngay_tao date default current_date,
  trang_thai text default 'draft', -- draft/uploaded/checked/running/review/saved/closed/canceled
  ghi_chu text,
  created_by text,
  created_at timestamptz default now(),
  closed_by text,
  closed_at timestamptz
);

create table doisoat_file (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  loai_file text not null, -- workbook/thuphi/bidv/sinvoice
  file_name text,
  row_count int default 0,
  check_status text default 'pending',
  check_message text,
  uploaded_by text,
  created_at timestamptz default now()
);

create table dot_doisoat (
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

create table ketqua_doisoat (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  don_vi text,
  ma_hoso_goc text,
  ma_hoso_sach text,
  ngay_thu text,
  thuphi numeric default 0,
  bidv numeric default 0,
  sinvoice numeric default 0,
  trang_thai text,
  loai_loi text,
  huong_xu_ly text,
  tham_chieu_bidv text,
  so_hoa_don text,
  xu_ly_status text default 'open',
  ghi_chu_ke_toan text,
  created_at timestamptz default now()
);

create table hoa_don_chua_khop (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  ngay_hoa_don text,
  so_hoa_don text,
  tong_tien numeric default 0,
  aq text,
  bp text,
  bu text,
  ly_do text,
  trang_thai_xu_ly text default 'open',
  created_at timestamptz default now()
);

create table saoke_chua_nhan_dien (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  dien_giai text,
  so_tien numeric default 0,
  tham_chieu text,
  ly_do text,
  trang_thai_xu_ly text default 'open',
  created_at timestamptz default now()
);

create table thongke_sinvoice (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete cascade,
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

create table nhatky_xuly (
  id bigserial primary key,
  diem_id bigint references diem(id),
  loai text not null,
  tham_chieu text not null,
  ma_hoso text not null,
  ghi_chu text,
  created_by text,
  created_at timestamptz default now()
);

create table doisoat_task (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  ketqua_id bigint references ketqua_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ma_hoso text,
  loai_loi text,
  noi_dung text,
  huong_xu_ly text,
  trang_thai text default 'open', -- open/processing/waiting/done/ignored
  assigned_to text,
  due_date date,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table bank_unidentified (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  so_tien numeric default 0,
  dien_giai text,
  tham_chieu text,
  trang_thai text default 'pending', -- pending/mapped/ignored/not_in_period
  ma_hoso_gan text,
  ghi_chu text,
  created_at timestamptz default now()
);

create table accounting_status (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ma_hoso text,
  thuphi numeric default 0,
  bidv numeric default 0,
  sinvoice numeric default 0,
  bidv_status text,
  invoice_status text,
  accounting_status text default 'CHO_XU_LY', -- CHO_TIEN_VE/CHO_HOA_DON/CHO_NHAN_DIEN/CHO_XU_LY/DU_DIEU_KIEN_HACH_TOAN/DA_HACH_TOAN
  accounting_date date,
  note text,
  created_at timestamptz default now(),
  unique(session_id, ma_hoso)
);

create table accounting_month_close (
  id bigserial primary key,
  thang text not null,
  diem_id bigint references diem(id),
  trang_thai text default 'open', -- open/ready/closed
  tong_ho_so int default 0,
  tong_thuphi numeric default 0,
  tong_bidv numeric default 0,
  tong_sinvoice numeric default 0,
  tien_chua_xac_dinh numeric default 0,
  can_xu_ly int default 0,
  closed_by text,
  closed_at timestamptz,
  created_at timestamptz default now(),
  unique(thang, diem_id)
);

create table monthly_report (
  id bigserial primary key,
  thang text not null,
  diem_id bigint references diem(id),
  tong_ho_so int default 0,
  so_khop int default 0,
  so_lech int default 0,
  tong_thuphi numeric default 0,
  tong_bidv numeric default 0,
  tong_sinvoice numeric default 0,
  created_at timestamptz default now(),
  unique(thang, diem_id)
);

create table notifications (
  id bigserial primary key,
  diem_id bigint references diem(id),
  tieu_de text,
  noi_dung text,
  muc_do text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table audit_log (
  id bigserial primary key,
  action text not null,
  email text,
  vai_tro text,
  diem_id bigint references diem(id),
  detail jsonb,
  created_at timestamptz default now()
);

create index idx_session_diem on doisoat_session(diem_id);
create index idx_session_status on doisoat_session(trang_thai);
create index idx_dot_session on dot_doisoat(session_id);
create index idx_ketqua_session on ketqua_doisoat(session_id);
create index idx_ketqua_ma on ketqua_doisoat(ma_hoso_sach);
create index idx_task_status on doisoat_task(trang_thai);
create index idx_bank_status on bank_unidentified(trang_thai);
create index idx_accounting_status on accounting_status(accounting_status);

alter table diem disable row level security;
alter table users_app disable row level security;
alter table doisoat_session disable row level security;
alter table doisoat_file disable row level security;
alter table dot_doisoat disable row level security;
alter table ketqua_doisoat disable row level security;
alter table hoa_don_chua_khop disable row level security;
alter table saoke_chua_nhan_dien disable row level security;
alter table thongke_sinvoice disable row level security;
alter table nhatky_xuly disable row level security;
alter table doisoat_task disable row level security;
alter table bank_unidentified disable row level security;
alter table accounting_status disable row level security;
alter table accounting_month_close disable row level security;
alter table monthly_report disable row level security;
alter table notifications disable row level security;
alter table audit_log disable row level security;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
notify pgrst, 'reload schema';
