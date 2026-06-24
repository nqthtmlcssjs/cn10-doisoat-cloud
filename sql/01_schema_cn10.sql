-- CN10 Đối soát thu phí - Supabase schema cloud v2
create table if not exists diem (
  id bigserial primary key,
  ma_diem text unique,
  ten_diem text not null unique,
  thu_tu int default 0,
  active boolean default true,
  created_at timestamptz default now()
);
insert into diem (ma_diem, ten_diem, thu_tu) values
('TAM_HUNG','Tam Hưng',1),('HONG_SON','Hồng Sơn',2),('UNG_HOA','Ứng Hòa',3),('VAN_DINH','Vân Đình',4),('MY_DUC','Mỹ Đức',5),('PHUC_SON','Phúc Sơn',6),('AN_MY','An Mỹ',7),('LE_THANH','Lê Thanh',8),('XUY_XA','Xuy Xá',9),('PHUNG_XA','Phùng Xá',10),('HOP_TIEN','Hợp Tiến',11),('DIEM_12','Điểm 12',12),('DIEM_13','Điểm 13',13),('DIEM_14','Điểm 14',14),('DIEM_15','Điểm 15',15)
on conflict (ten_diem) do nothing;

create table if not exists users_app (
  id bigserial primary key,
  email text not null unique,
  ho_ten text,
  vai_tro text not null default 'diem',
  diem_id bigint references diem(id),
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists dot_doisoat (
  id bigserial primary key,
  ngay_doisoat date not null,
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

-- Vá schema cũ nếu đã tạo trước đó
alter table if exists dot_doisoat add column if not exists file_name text, add column if not exists source_mode text, add column if not exists created_by text;
alter table if exists ketqua_doisoat add column if not exists dot_id bigint, add column if not exists diem_id bigint, add column if not exists don_vi text, add column if not exists ma_hoso_goc text, add column if not exists ma_hoso_sach text, add column if not exists ngay_thu text, add column if not exists thuphi numeric default 0, add column if not exists bidv numeric default 0, add column if not exists sinvoice numeric default 0, add column if not exists trang_thai text, add column if not exists tham_chieu_bidv text, add column if not exists so_hoa_don text;
alter table if exists hoa_don_chua_khop add column if not exists dot_id bigint, add column if not exists diem_id bigint, add column if not exists ngay_hoa_don text, add column if not exists so_hoa_don text, add column if not exists tong_tien numeric default 0, add column if not exists aq text, add column if not exists bp text, add column if not exists bu text, add column if not exists ly_do text;
alter table if exists saoke_chua_nhan_dien add column if not exists dot_id bigint, add column if not exists diem_id bigint, add column if not exists ngay_giao_dich text, add column if not exists dien_giai text, add column if not exists so_tien numeric default 0, add column if not exists tham_chieu text, add column if not exists ly_do text;
alter table if exists thongke_sinvoice add column if not exists tong_hd int default 0, add column if not exists tong_hoa_don int default 0;

create index if not exists idx_ketqua_dot on ketqua_doisoat(dot_id);
create index if not exists idx_ketqua_ma_sach on ketqua_doisoat(ma_hoso_sach);
create index if not exists idx_dot_ngay on dot_doisoat(ngay_doisoat);

alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;
notify pgrst, 'reload schema';
