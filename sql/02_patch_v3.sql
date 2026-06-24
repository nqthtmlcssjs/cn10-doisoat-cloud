-- CN10 cloud v3 patch: quyền tạm thời mở để chạy frontend, bổ sung cột cần thiết.
alter table if exists dot_doisoat
add column if not exists source_mode text,
add column if not exists created_by text;

alter table if exists ketqua_doisoat
add column if not exists diem_id bigint,
add column if not exists dot_id bigint,
add column if not exists don_vi text,
add column if not exists ma_hoso_goc text,
add column if not exists ma_hoso_sach text,
add column if not exists ngay_thu text,
add column if not exists thuphi numeric default 0,
add column if not exists bidv numeric default 0,
add column if not exists sinvoice numeric default 0,
add column if not exists trang_thai text,
add column if not exists tham_chieu_bidv text,
add column if not exists so_hoa_don text;

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
  created_at timestamp with time zone default now()
);

alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;

notify pgrst, 'reload schema';
