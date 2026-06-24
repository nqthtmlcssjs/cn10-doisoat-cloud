-- CN10 Fee Control Center V10 - Production Workflow
-- Chạy sau 01_schema_cn10.sql và các patch cũ. Script an toàn, có thể chạy lại.

-- 1) Bảng phiên đối soát
create table if not exists doisoat_session (
  id bigserial primary key,
  ma_phien text unique not null,
  diem_id bigint references diem(id),
  ky_doisoat text not null,
  trang_thai text not null default 'draft', -- draft/running/review/completed/closed
  dot_id bigint references dot_doisoat(id) on delete set null,
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

-- 2) File nhận vào của phiên, dùng để quản lý quy trình upload theo nguồn sau này
create table if not exists doisoat_file (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  loai_file text not null, -- workbook/thuphi/bidv/sinvoice
  file_name text,
  uploaded_by text,
  uploaded_at timestamptz default now()
);

-- 3) Công việc xử lý lỗi
create table if not exists doisoat_task (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ma_hoso text,
  loai_loi text, -- missing_bidv/missing_invoice/missing_both/wrong_amount/review
  noi_dung text,
  so_tien_thuphi numeric default 0,
  so_tien_bidv numeric default 0,
  so_tien_sinvoice numeric default 0,
  assigned_to text,
  trang_thai text default 'open', -- open/done/cancelled
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

-- 4) Thông báo nội bộ
create table if not exists notifications (
  id bigserial primary key,
  diem_id bigint references diem(id),
  tieu_de text,
  noi_dung text,
  loai text default 'info',
  da_doc boolean default false,
  created_by text,
  created_at timestamptz default now()
);

-- 5) Audit log chuẩn hóa
create table if not exists audit_log (
  id bigserial primary key,
  user_email text,
  action text,
  object_type text,
  object_id text,
  detail jsonb,
  created_at timestamptz default now()
);

-- 6) Bổ sung các cột hay thiếu ở các bảng cũ
alter table if exists dot_doisoat
add column if not exists file_name text,
add column if not exists source_mode text,
add column if not exists created_by text;

alter table if exists ketqua_doisoat
add column if not exists diem_id bigint,
add column if not exists don_vi text,
add column if not exists tham_chieu_bidv text,
add column if not exists so_hoa_don text;

alter table if exists nhatky_xuly
add column if not exists diem_id bigint,
add column if not exists created_by text;

alter table if exists hoa_don_chua_khop add column if not exists bu text;

-- 7) Index vận hành
create index if not exists idx_session_diem on doisoat_session(diem_id);
create index if not exists idx_session_ky on doisoat_session(ky_doisoat);
create index if not exists idx_session_status on doisoat_session(trang_thai);
create index if not exists idx_task_session on doisoat_task(session_id);
create index if not exists idx_task_diem on doisoat_task(diem_id);
create index if not exists idx_task_status on doisoat_task(trang_thai);
create index if not exists idx_task_loi on doisoat_task(loai_loi);
create index if not exists idx_notifications_diem on notifications(diem_id);
create index if not exists idx_audit_created on audit_log(created_at);

-- 8) Giai đoạn vận hành nội bộ: tắt RLS để frontend dùng publishable key ghi được.
-- Khi triển khai chính thức với chính sách bảo mật chặt, có thể bật lại RLS theo role.
alter table if exists doisoat_session disable row level security;
alter table if exists doisoat_file disable row level security;
alter table if exists doisoat_task disable row level security;
alter table if exists notifications disable row level security;
alter table if exists audit_log disable row level security;
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;
alter table if exists users_app disable row level security;
alter table if exists diem disable row level security;

-- 9) Bảo đảm admin đầu tiên có toàn quyền
insert into users_app(email, ho_ten, vai_tro, diem_id, active)
values ('admin@cn10.local','Quản trị CN10','admin',null,true)
on conflict (email) do update set
  ho_ten=excluded.ho_ten,
  vai_tro='admin',
  diem_id=null,
  active=true;

notify pgrst, 'reload schema';
