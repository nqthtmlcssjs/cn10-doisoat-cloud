-- CN10 Cloud v4 - Email login + phân quyền cơ bản
-- Chạy trong Supabase SQL Editor nếu bảng users_app còn thiếu cột.

alter table users_app
add column if not exists active boolean default true,
add column if not exists created_at timestamptz default now();

insert into users_app (email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local', 'Quản trị CN10', 'admin', null, true)
on conflict (email) do update
set ho_ten = excluded.ho_ten, vai_tro = 'admin', diem_id = null, active = true;

notify pgrst, 'reload schema';
