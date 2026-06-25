-- CN10 Official V14.0.0 - RUN ONCE
-- Chạy một lần trong Supabase SQL Editor.
-- Mục tiêu: chuẩn hóa 12 điểm, tạo bảng version, phiên đối soát, dòng tiền, hạch toán.
-- Không DROP bảng cũ, không xóa lịch sử đối soát.

-- 1) Chuẩn hóa bảng diem hiện có
alter table if exists diem add column if not exists ma_diem text;
alter table if exists diem add column if not exists thu_tu int;
alter table if exists diem add column if not exists active boolean default true;
alter table if exists diem add column if not exists created_at timestamptz default now();

insert into diem(id, ten_diem, ma_diem, thu_tu, active) values
(1,'Tam Hưng','TAM_HUNG',1,true),
(2,'Bình Minh','BINH_MINH',2,true),
(3,'Thanh Oai','THANH_OAI',3,true),
(4,'Dân Hòa','DAN_HOA',4,true),
(5,'Ứng Thiên','UNG_THIEN',5,true),
(6,'Vân Đình','VAN_DINH',6,true),
(7,'Ứng Hòa','UNG_HOA',7,true),
(8,'Hòa Xá','HOA_XA',8,true),
(9,'Hương Sơn','HUONG_SON',9,true),
(10,'Mỹ Đức','MY_DUC',10,true),
(11,'Hồng Sơn','HONG_SON',11,true),
(12,'Phúc Sơn','PHUC_SON',12,true)
on conflict(id) do update set
  ten_diem = excluded.ten_diem,
  ma_diem = excluded.ma_diem,
  thu_tu = excluded.thu_tu,
  active = true;

-- 2) Version manager
create table if not exists system_version (
  id int primary key,
  version_code text not null,
  deployed_at timestamptz default now(),
  notes text
);
insert into system_version(id, version_code, notes)
values (1,'V14.0.0','CN10 Official Stable - modular frontend, reliable diem loader, upload wizard, session workflow')
on conflict(id) do update set
  version_code = excluded.version_code,
  deployed_at = now(),
  notes = excluded.notes;

-- 3) users_app an toàn
create table if not exists users_app (
  id bigserial primary key,
  email text,
  ho_ten text,
  vai_tro text default 'diem',
  diem_id bigint,
  active boolean default true,
  created_at timestamptz default now()
);
alter table users_app add column if not exists email text;
alter table users_app add column if not exists ho_ten text;
alter table users_app add column if not exists vai_tro text default 'diem';
alter table users_app add column if not exists diem_id bigint;
alter table users_app add column if not exists active boolean default true;
alter table users_app add column if not exists created_at timestamptz default now();
update users_app set email = lower(trim(email)) where email is not null;

do $$
begin
  if not exists (select 1 from users_app where lower(trim(email))='admin@cn10.local') then
    insert into users_app(email, ho_ten, vai_tro, diem_id, active)
    values ('admin@cn10.local','Quản trị CN10','admin',null,true);
  else
    update users_app set ho_ten='Quản trị CN10', vai_tro='admin', diem_id=null, active=true where lower(trim(email))='admin@cn10.local';
  end if;
end $$;

-- 4) Bổ sung cột các bảng đối soát lõi nếu còn thiếu
alter table if exists dot_doisoat add column if not exists diem_id bigint;
alter table if exists dot_doisoat add column if not exists file_name text;
alter table if exists dot_doisoat add column if not exists source_mode text;
alter table if exists dot_doisoat add column if not exists created_by text;
alter table if exists dot_doisoat add column if not exists ghi_chu text;

alter table if exists ketqua_doisoat add column if not exists dot_id bigint;
alter table if exists ketqua_doisoat add column if not exists diem_id bigint;
alter table if exists ketqua_doisoat add column if not exists don_vi text;
alter table if exists ketqua_doisoat add column if not exists ma_hoso_goc text;
alter table if exists ketqua_doisoat add column if not exists ma_hoso_sach text;
alter table if exists ketqua_doisoat add column if not exists ngay_thu text;
alter table if exists ketqua_doisoat add column if not exists thuphi numeric default 0;
alter table if exists ketqua_doisoat add column if not exists bidv numeric default 0;
alter table if exists ketqua_doisoat add column if not exists sinvoice numeric default 0;
alter table if exists ketqua_doisoat add column if not exists trang_thai text;
alter table if exists ketqua_doisoat add column if not exists tham_chieu_bidv text;
alter table if exists ketqua_doisoat add column if not exists so_hoa_don text;

alter table if exists hoa_don_chua_khop add column if not exists dot_id bigint;
alter table if exists hoa_don_chua_khop add column if not exists diem_id bigint;
alter table if exists hoa_don_chua_khop add column if not exists ngay_hoa_don text;
alter table if exists hoa_don_chua_khop add column if not exists so_hoa_don text;
alter table if exists hoa_don_chua_khop add column if not exists tong_tien numeric default 0;
alter table if exists hoa_don_chua_khop add column if not exists aq text;
alter table if exists hoa_don_chua_khop add column if not exists bp text;
alter table if exists hoa_don_chua_khop add column if not exists bu text;
alter table if exists hoa_don_chua_khop add column if not exists ly_do text;

alter table if exists saoke_chua_nhan_dien add column if not exists dot_id bigint;
alter table if exists saoke_chua_nhan_dien add column if not exists diem_id bigint;
alter table if exists saoke_chua_nhan_dien add column if not exists ngay_giao_dich text;
alter table if exists saoke_chua_nhan_dien add column if not exists dien_giai text;
alter table if exists saoke_chua_nhan_dien add column if not exists so_tien numeric default 0;
alter table if exists saoke_chua_nhan_dien add column if not exists tham_chieu text;
alter table if exists saoke_chua_nhan_dien add column if not exists ly_do text;

create table if not exists thongke_sinvoice (
  id bigserial primary key,
  dot_id bigint,
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

-- 5) Phiên đối soát chính thức
create table if not exists doisoat_session (
  id bigserial primary key,
  ma_phien text unique,
  diem_id bigint references diem(id),
  ky_doisoat text,
  ghi_chu text,
  trang_thai text default 'draft',
  dot_id bigint,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);
alter table doisoat_session add column if not exists ma_phien text;
alter table doisoat_session add column if not exists diem_id bigint;
alter table doisoat_session add column if not exists ky_doisoat text;
alter table doisoat_session add column if not exists ghi_chu text;
alter table doisoat_session add column if not exists trang_thai text default 'draft';
alter table doisoat_session add column if not exists dot_id bigint;
alter table doisoat_session add column if not exists created_by text;
alter table doisoat_session add column if not exists created_at timestamptz default now();
alter table doisoat_session add column if not exists updated_at timestamptz default now();
alter table doisoat_session add column if not exists closed_at timestamptz;

create table if not exists doisoat_file (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  loai_file text,
  file_name text,
  version_no int default 1,
  uploaded_by text,
  created_at timestamptz default now()
);

-- 6) Công việc lỗi / thông báo / audit
create table if not exists tasks (
  id bigserial primary key,
  dot_id bigint,
  session_id bigint,
  diem_id bigint,
  ma_hoso text,
  loai_loi text,
  noi_dung text,
  trang_thai text default 'open',
  assigned_to text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tasks add column if not exists session_id bigint;
alter table tasks add column if not exists diem_id bigint;
alter table tasks add column if not exists trang_thai text default 'open';

create table if not exists notifications (
  id bigserial primary key,
  diem_id bigint,
  tieu_de text,
  noi_dung text,
  muc_do text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  action text,
  email text,
  vai_tro text,
  diem_id bigint,
  detail jsonb,
  created_at timestamptz default now()
);

-- 7) Dòng tiền & hạch toán
create table if not exists bank_unidentified (
  id bigserial primary key,
  session_id bigint,
  dot_id bigint,
  diem_id bigint,
  ngay_giao_dich text,
  so_tien numeric default 0,
  dien_giai text,
  tham_chieu text,
  trang_thai text default 'pending',
  created_by text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists accounting_status (
  id bigserial primary key,
  ma_hoso text,
  ma_hoso_sach text,
  diem_id bigint,
  dot_id bigint,
  thu_phi_status text,
  bidv_status text,
  invoice_status text,
  accounting_status text,
  accounting_date date,
  ghi_chu text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists accounting_month_close (
  id bigserial primary key,
  thang text,
  diem_id bigint,
  trang_thai text default 'draft',
  closed_by text,
  closed_at timestamptz,
  ghi_chu text,
  created_at timestamptz default now()
);

create table if not exists workflow_history (
  id bigserial primary key,
  session_id bigint,
  action text,
  detail jsonb,
  created_by text,
  created_at timestamptz default now()
);

-- 8) Index
create index if not exists idx_diem_active on diem(active);
create index if not exists idx_diem_thu_tu on diem(thu_tu);
create index if not exists idx_session_diem on doisoat_session(diem_id);
create index if not exists idx_session_status on doisoat_session(trang_thai);
create index if not exists idx_tasks_status on tasks(trang_thai);
create index if not exists idx_bank_status on bank_unidentified(trang_thai);
create index if not exists idx_accounting_status on accounting_status(accounting_status);
create index if not exists idx_ketqua_ma_sach on ketqua_doisoat(ma_hoso_sach);
create index if not exists idx_ketqua_dot on ketqua_doisoat(dot_id);

-- 9) Tắt RLS giai đoạn vận hành nội bộ ban đầu
alter table if exists diem disable row level security;
alter table if exists users_app disable row level security;
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists doisoat_session disable row level security;
alter table if exists doisoat_file disable row level security;
alter table if exists tasks disable row level security;
alter table if exists notifications disable row level security;
alter table if exists audit_log disable row level security;
alter table if exists bank_unidentified disable row level security;
alter table if exists accounting_status disable row level security;
alter table if exists accounting_month_close disable row level security;
alter table if exists workflow_history disable row level security;
alter table if exists system_version disable row level security;

notify pgrst, 'reload schema';
