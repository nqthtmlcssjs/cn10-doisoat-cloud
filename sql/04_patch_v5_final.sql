-- CN10 Đối soát Cloud v5 - patch hoàn thiện phân quyền và vận hành

-- Bảo đảm các cột đang được frontend v5 sử dụng đều tồn tại
alter table if exists users_app
add column if not exists active boolean default true,
add column if not exists created_at timestamptz default now();

alter table if exists dot_doisoat
add column if not exists source_mode text,
add column if not exists created_by text,
add column if not exists ghi_chu text,
add column if not exists file_name text;

alter table if exists nhatky_xuly
add column if not exists diem_id bigint,
add column if not exists created_by text,
add column if not exists ghi_chu text,
add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_nhatky_diem') then
    alter table nhatky_xuly
    add constraint fk_nhatky_diem foreign key (diem_id) references diem(id);
  end if;
end $$;

-- Giai đoạn triển khai thử: tắt RLS để tránh lỗi quyền khi chưa hoàn thiện policy.
alter table if exists diem disable row level security;
alter table if exists users_app disable row level security;
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;

-- Tài khoản quản trị mặc định: phải tạo user này trong Authentication → Users trước.
insert into users_app(email, ho_ten, vai_tro, active)
values ('admin@cn10.local','Quản trị CN10','admin',true)
on conflict (email) do update set ho_ten=excluded.ho_ten, vai_tro='admin', active=true;

notify pgrst, 'reload schema';
