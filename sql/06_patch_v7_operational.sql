-- CN10 Đối soát Cloud v7 - Operational patch
-- Chạy trong Supabase SQL Editor sau khi upload v7.

-- Bảo đảm các cột phục vụ vận hành/phân quyền đã tồn tại.
alter table if exists users_app
add column if not exists active boolean default true,
add column if not exists created_at timestamptz default now();

alter table if exists dot_doisoat
add column if not exists source_mode text,
add column if not exists created_by text,
add column if not exists file_name text;

alter table if exists nhatky_xuly
add column if not exists created_by text,
add column if not exists created_at timestamptz default now();

-- Giai đoạn vận hành thử: tắt RLS để tránh lỗi quyền khi chưa cấu hình policy đầy đủ.
alter table if exists diem disable row level security;
alter table if exists users_app disable row level security;
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;

-- Bảo đảm admin mặc định có toàn quyền.
insert into users_app(email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local','Quản trị CN10','admin',null,true)
on conflict (email) do update set
  ho_ten = excluded.ho_ten,
  vai_tro = 'admin',
  diem_id = null,
  active = true;

notify pgrst, 'reload schema';
