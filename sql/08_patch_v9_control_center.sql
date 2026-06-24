-- CN10 v9 Control Center
-- Bổ sung bảng tác vụ/cảnh báo để mở rộng workflow xử lý lỗi.

create table if not exists tasks (
  id bigserial primary key,
  dot_id bigint references dot_doisoat(id) on delete cascade,
  diem_id bigint references diem(id),
  ma_hoso text,
  loai_loi text,
  noi_dung text,
  trang_thai text default 'open', -- open / processing / done / canceled
  assigned_to text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists notifications (
  id bigserial primary key,
  diem_id bigint references diem(id),
  tieu_de text,
  noi_dung text,
  muc_do text default 'info', -- info / warning / danger
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists monthly_report (
  id bigserial primary key,
  thang text not null,
  diem_id bigint references diem(id),
  tong_ho_so int default 0,
  so_khop int default 0,
  so_lech int default 0,
  tong_thuphi numeric default 0,
  tong_bidv numeric default 0,
  tong_sinvoice numeric default 0,
  created_at timestamptz default now(),
  unique(thang, diem_id)
);

alter table tasks disable row level security;
alter table notifications disable row level security;
alter table monthly_report disable row level security;

create index if not exists idx_tasks_dot on tasks(dot_id);
create index if not exists idx_tasks_diem on tasks(diem_id);
create index if not exists idx_tasks_status on tasks(trang_thai);
create index if not exists idx_notifications_diem on notifications(diem_id);
create index if not exists idx_monthly_report_thang on monthly_report(thang);

notify pgrst, 'reload schema';
