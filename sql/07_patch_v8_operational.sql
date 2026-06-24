-- CN10 Cloud v8 - vận hành chính thức
-- Chạy trong Supabase SQL Editor sau khi upload v8.

alter table if exists users_app
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

alter table if exists dot_doisoat
  add column if not exists source_mode text,
  add column if not exists created_by text;

alter table if exists ketqua_doisoat
  add column if not exists don_vi text,
  add column if not exists tham_chieu_bidv text,
  add column if not exists so_hoa_don text;

create table if not exists audit_log (
  id bigserial primary key,
  action text not null,
  email text,
  vai_tro text,
  diem_id bigint references diem(id),
  detail jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_audit_log_created_at on audit_log(created_at desc);
create index if not exists idx_audit_log_action on audit_log(action);
create index if not exists idx_audit_log_email on audit_log(email);

-- Tắt RLS giai đoạn vận hành ban đầu để tránh lỗi ghi dữ liệu khi chưa khóa chính sách theo điểm.
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;
alter table if exists users_app disable row level security;
alter table if exists diem disable row level security;
alter table if exists audit_log disable row level security;

-- Bảo đảm tài khoản admin ban đầu có toàn quyền.
insert into users_app(email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local','Quản trị CN10','admin',null,true)
on conflict (email) do update set
  ho_ten=excluded.ho_ten,
  vai_tro='admin',
  diem_id=null,
  active=true;

notify pgrst, 'reload schema';
