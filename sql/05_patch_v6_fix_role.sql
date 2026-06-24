-- CN10 Cloud v6 - sửa phân quyền admin và đảm bảo users_app đọc được từ frontend

alter table if exists users_app
add column if not exists active boolean default true,
add column if not exists created_at timestamptz default now();

update users_app set email = lower(trim(email));

insert into users_app (email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local', 'Quản trị CN10', 'admin', null, true)
on conflict (email) do update set
  ho_ten = excluded.ho_ten,
  vai_tro = 'admin',
  diem_id = null,
  active = true;

-- Giai đoạn triển khai: tắt RLS cho bảng quyền để frontend đọc được vai_tro.
-- Khi danh sách tài khoản ổn định sẽ bật lại RLS có policy chuẩn.
alter table if exists users_app disable row level security;
alter table if exists diem disable row level security;

notify pgrst, 'reload schema';
