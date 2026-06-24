-- CN10 V10.1 Production Fixed
-- SQL nâng cấp từ database hiện tại của bạn. Không DROP bảng, không xóa dữ liệu.
-- Chạy 1 lần trong Supabase SQL Editor. Có thể chạy lại an toàn.

-- 0) Chuẩn hóa bảng điểm hiện có: database của bạn có thể chỉ có id, ten_diem.
alter table if exists diem
  add column if not exists ma_diem text,
  add column if not exists thu_tu int default 0,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

-- Bổ sung danh mục 15 điểm nếu còn thiếu. Không dùng ON CONFLICT để tránh lỗi thiếu unique constraint.
insert into diem (ten_diem)
select v.ten_diem
from (values
  ('Tam Hưng'),('Hồng Sơn'),('Ứng Hòa'),('Vân Đình'),('Mỹ Đức'),('Phúc Sơn'),('An Mỹ'),('Lê Thanh'),('Xuy Xá'),('Phùng Xá'),('Hợp Tiến'),('Điểm 12'),('Điểm 13'),('Điểm 14'),('Điểm 15')
) as v(ten_diem)
where not exists (select 1 from diem d where lower(trim(d.ten_diem)) = lower(trim(v.ten_diem)));

update diem set active = true where active is null;
update diem set thu_tu = case trim(ten_diem)
  when 'Tam Hưng' then 1
  when 'Bình Minh' then 2
  when 'Thanh Oai' then 3
  when 'Dân Hòa' then 4
  when 'Ứng Thiên' then 5
  when 'Vân Đình' then 6
  when 'Ứng Hòa' then 7
  when 'Hòa Xá' then 8
  when 'Hương Sơn' then 9
  when 'Mỹ Đức' then 10
  when 'Hồng Sơn' then 11
  when 'Phúc Sơn' then 12
  else coalesce(thu_tu, 99)
end;
update diem set ma_diem = case trim(ten_diem)
  when 'Tam Hưng' then 'TAM_HUNG'
  when 'Hồng Sơn' then 'HONG_SON'
  when 'Ứng Hòa' then 'UNG_HOA'
  when 'Vân Đình' then 'VAN_DINH'
  when 'Mỹ Đức' then 'MY_DUC'
  when 'Phúc Sơn' then 'PHUC_SON'
  when 'An Mỹ' then 'AN_MY'
  when 'Lê Thanh' then 'LE_THANH'
  when 'Xuy Xá' then 'XUY_XA'
  when 'Phùng Xá' then 'PHUNG_XA'
  when 'Hợp Tiến' then 'HOP_TIEN'
  when 'Điểm 12' then 'DIEM_12'
  when 'Điểm 13' then 'DIEM_13'
  when 'Điểm 14' then 'DIEM_14'
  when 'Điểm 15' then 'DIEM_15'
  else coalesce(ma_diem, 'DIEM_' || id::text)
end
where ma_diem is null or ma_diem = '';

-- 1) Bảng phân quyền người dùng.
create table if not exists users_app (
  id bigserial primary key,
  email text not null unique,
  ho_ten text,
  vai_tro text not null default 'diem',
  diem_id bigint references diem(id),
  active boolean default true,
  created_at timestamptz default now()
);
alter table users_app
  add column if not exists ho_ten text,
  add column if not exists vai_tro text default 'diem',
  add column if not exists diem_id bigint,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();
update users_app set email = lower(trim(email));
insert into users_app(email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local','Quản trị CN10','admin',null,true)
on conflict (email) do update set ho_ten=excluded.ho_ten, vai_tro='admin', diem_id=null, active=true;

-- 2) Vá các bảng đối soát cũ để frontend V10.1 dùng được.
alter table if exists dot_doisoat
  add column if not exists diem_id bigint,
  add column if not exists nguoi_thuc_hien text,
  add column if not exists ghi_chu text,
  add column if not exists file_name text,
  add column if not exists source_mode text,
  add column if not exists created_by text,
  add column if not exists tong_ho_so int default 0,
  add column if not exists so_khop int default 0,
  add column if not exists so_lech int default 0,
  add column if not exists tong_thuphi numeric default 0,
  add column if not exists tong_bidv numeric default 0,
  add column if not exists tong_sinvoice numeric default 0,
  add column if not exists created_at timestamptz default now();

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
  dot_id bigint,
  thang text,
  tong_hd int default 0,
  tong_hoa_don int default 0,
  tong_tien numeric default 0,
  da_khop int default 0,
  tien_da_khop numeric default 0,
  chua_khop int default 0,
  tien_chua_khop numeric default 0
);
alter table thongke_sinvoice
  add column if not exists tong_hd int default 0,
  add column if not exists tong_hoa_don int default 0;

alter table if exists nhatky_xuly
  add column if not exists diem_id bigint,
  add column if not exists ghi_chu text,
  add column if not exists created_by text,
  add column if not exists created_at timestamptz default now();

-- 3) Phiên đối soát V10.1.
create table if not exists doisoat_session (
  id bigserial primary key,
  ma_phien text unique not null,
  diem_id bigint references diem(id),
  ky_doisoat text not null,
  trang_thai text not null default 'draft',
  dot_id bigint,
  file_name text,
  ghi_chu text,
  tong_ho_so int default 0,
  so_khop int default 0,
  so_lech int default 0,
  tong_thuphi numeric default 0,
  tong_bidv numeric default 0,
  tong_sinvoice numeric default 0,
  created_by text,
  closed_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);
alter table doisoat_session
  add column if not exists dot_id bigint,
  add column if not exists file_name text,
  add column if not exists ghi_chu text,
  add column if not exists tong_ho_so int default 0,
  add column if not exists so_khop int default 0,
  add column if not exists so_lech int default 0,
  add column if not exists tong_thuphi numeric default 0,
  add column if not exists tong_bidv numeric default 0,
  add column if not exists tong_sinvoice numeric default 0,
  add column if not exists closed_by text,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists closed_at timestamptz;

create table if not exists doisoat_file (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  loai_file text not null,
  file_name text,
  uploaded_by text,
  uploaded_at timestamptz default now()
);

-- 4) Hàng đợi công việc lỗi. Tạo bảng mới doisoat_task, không xóa bảng tasks cũ.
create table if not exists doisoat_task (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  dot_id bigint,
  diem_id bigint references diem(id),
  ma_hoso text,
  loai_loi text,
  noi_dung text,
  so_tien_thuphi numeric default 0,
  so_tien_bidv numeric default 0,
  so_tien_sinvoice numeric default 0,
  assigned_to text,
  trang_thai text default 'open',
  ghi_chu_xu_ly text,
  created_by text,
  done_by text,
  created_at timestamptz default now(),
  done_at timestamptz
);
alter table doisoat_task
  add column if not exists dot_id bigint,
  add column if not exists so_tien_thuphi numeric default 0,
  add column if not exists so_tien_bidv numeric default 0,
  add column if not exists so_tien_sinvoice numeric default 0,
  add column if not exists assigned_to text,
  add column if not exists ghi_chu_xu_ly text,
  add column if not exists done_by text,
  add column if not exists done_at timestamptz;

-- 5) Thông báo: bảng cũ đang có muc_do/is_read, frontend V10 cần loai/created_by.
create table if not exists notifications (
  id bigserial primary key,
  diem_id bigint references diem(id),
  tieu_de text,
  noi_dung text,
  muc_do text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table notifications
  add column if not exists loai text default 'info',
  add column if not exists created_by text,
  add column if not exists da_doc boolean default false;

-- 6) Audit log: bảng cũ đang có email/vai_tro/diem_id. Frontend V10 cần user_email/object_type/object_id.
create table if not exists audit_log (
  id bigserial primary key,
  action text,
  detail jsonb,
  created_at timestamptz default now()
);
alter table audit_log
  add column if not exists user_email text,
  add column if not exists email text,
  add column if not exists vai_tro text,
  add column if not exists diem_id bigint,
  add column if not exists object_type text,
  add column if not exists object_id text;

-- 7) Index vận hành.
create index if not exists idx_diem_ten on diem(ten_diem);
create index if not exists idx_users_email on users_app(email);
create index if not exists idx_dot_ngay on dot_doisoat(ngay_doisoat);
create index if not exists idx_dot_diem on dot_doisoat(diem_id);
create index if not exists idx_ketqua_dot on ketqua_doisoat(dot_id);
create index if not exists idx_ketqua_diem on ketqua_doisoat(diem_id);
create index if not exists idx_ketqua_ma_sach on ketqua_doisoat(ma_hoso_sach);
create index if not exists idx_session_diem on doisoat_session(diem_id);
create index if not exists idx_session_ky on doisoat_session(ky_doisoat);
create index if not exists idx_session_status on doisoat_session(trang_thai);
create index if not exists idx_task_session on doisoat_task(session_id);
create index if not exists idx_task_diem on doisoat_task(diem_id);
create index if not exists idx_task_status on doisoat_task(trang_thai);
create index if not exists idx_notifications_diem on notifications(diem_id);
create index if not exists idx_audit_created on audit_log(created_at);

-- 8) Giai đoạn vận hành nội bộ: tắt RLS để frontend dùng được với publishable key.
alter table if exists diem disable row level security;
alter table if exists users_app disable row level security;
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;
alter table if exists doisoat_session disable row level security;
alter table if exists doisoat_file disable row level security;
alter table if exists doisoat_task disable row level security;
alter table if exists notifications disable row level security;
alter table if exists audit_log disable row level security;

notify pgrst, 'reload schema';
