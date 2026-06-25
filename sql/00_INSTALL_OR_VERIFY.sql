-- CN10 Enterprise Operational 1.0.0 - kiểm tra/bổ sung schema cần thiết
create extension if not exists pgcrypto;

create table if not exists system_version (
  id int primary key,
  version_code text not null,
  database_version text not null,
  frontend_version text not null,
  version_name text,
  notes text,
  deployed_at timestamptz default now()
);

insert into system_version(id,version_code,database_version,frontend_version,version_name,notes)
values (1,'1.0.0-operational','1.0.0-operational','1.0.0-operational','CN10 Enterprise Operational','Bản vận hành upload-engine-task-case')
on conflict(id) do update set
  version_code=excluded.version_code,
  database_version=excluded.database_version,
  frontend_version=excluded.frontend_version,
  version_name=excluded.version_name,
  notes=excluded.notes,
  deployed_at=now();

create table if not exists diem (
  id bigint primary key,
  ten_diem text not null,
  ma_diem text unique not null,
  thu_tu int not null,
  active boolean default true,
  created_at timestamptz default now()
);

insert into diem(id,ten_diem,ma_diem,thu_tu,active) values
(1,'Tam Hưng','TAM_HUNG',1,true),
(2,'Bình Minh','BINH_MINH',2,true),
(3,'Thanh Oai','THANH_OAI',3,true),
(4,'Dân Hòa','DAN_HOA',4,true),
(5,'Ứng Thiên','UNG_THIEN',5,true),
(6,'Vân Đình','VAN_DINH',6,true),
(7,'Ứng Hòa','UNG_HOA',7,true),
(8,'Hòa Xá','HOA_XA',8,true),
(9,'Hương Sơn','HUONG_SON',9,true),
(10,'Mỹ Đức','MY_DUC',10,true),
(11,'Hồng Sơn','HONG_SON',11,true),
(12,'Phúc Sơn','PHUC_SON',12,true)
on conflict(id) do update set ten_diem=excluded.ten_diem, ma_diem=excluded.ma_diem, thu_tu=excluded.thu_tu, active=true;

create table if not exists users_app (
  id bigserial primary key,
  email text not null unique,
  ho_ten text,
  vai_tro text not null default 'diem',
  diem_id bigint references diem(id),
  active boolean default true,
  created_at timestamptz default now()
);

insert into users_app(email,ho_ten,vai_tro,diem_id,active)
values ('admin@cn10.local','Quản trị CN10','admin',null,true),('ketoan@cn10.local','Kế toán CN10','ketoan',null,true)
on conflict(email) do update set ho_ten=excluded.ho_ten, vai_tro=excluded.vai_tro, diem_id=excluded.diem_id, active=true;

create table if not exists doisoat_session (
  id bigserial primary key,
  ma_phien text unique not null,
  diem_id bigint references diem(id),
  ngay_doi_soat date not null,
  trang_thai text default 'draft',
  created_by text,
  closed_by text,
  closed_at timestamptz,
  ghi_chu text,
  created_at timestamptz default now()
);

create table if not exists doisoat_file (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  loai_file text not null,
  file_name text,
  file_hash text,
  file_signature text,
  file_size bigint,
  row_count int default 0,
  uploaded_by text,
  uploaded_at timestamptz default now()
);

create table if not exists doisoat_result (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  ma_hoso_goc text,
  ma_hoso_sach text,
  don_vi text,
  ngay_thu text,
  thuphi numeric default 0,
  bidv numeric default 0,
  sinvoice numeric default 0,
  trang_thai text,
  loai_loi text,
  tham_chieu_bidv text,
  so_hoa_don text,
  created_at timestamptz default now()
);

create table if not exists bank_unidentified (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  ngay_giao_dich text,
  tham_chieu text,
  dien_giai text,
  so_tien numeric default 0,
  trang_thai text default 'pending',
  ma_hoso_gan text,
  ghi_chu text,
  created_at timestamptz default now()
);

create table if not exists invoice_unidentified (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  ngay_hoa_don text,
  so_hoa_don text,
  tong_tien numeric default 0,
  aq text,
  bp text,
  bu text,
  trang_thai text default 'pending',
  ma_hoso_gan text,
  ghi_chu text,
  created_at timestamptz default now()
);

create table if not exists task_xuly (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  diem_id bigint references diem(id),
  ma_hoso text,
  loai_loi text,
  noi_dung text,
  huong_xu_ly text,
  trang_thai text default 'open',
  assigned_to text,
  created_by text,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists case_master (
  id bigserial primary key,
  ma_hoso_sach text not null unique,
  ma_hoso_goc text,
  diem_id bigint references diem(id),
  ngay_phat_sinh date,
  don_vi text,
  tong_thuphi numeric default 0,
  tong_bidv numeric default 0,
  tong_sinvoice numeric default 0,
  thuphi_status text default 'missing',
  bidv_status text default 'missing',
  invoice_status text default 'missing',
  accounting_status text default 'pending',
  trang_thai_tong text default 'pending',
  last_session_id bigint references doisoat_session(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists case_event (
  id bigserial primary key,
  case_id bigint references case_master(id) on delete cascade,
  session_id bigint references doisoat_session(id) on delete set null,
  event_type text not null,
  event_source text,
  amount numeric default 0,
  ref_no text,
  note text,
  raw_data jsonb,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists workflow_history (
  id bigserial primary key,
  session_id bigint references doisoat_session(id) on delete cascade,
  action text,
  detail jsonb,
  created_by text,
  created_at timestamptz default now()
);

alter table diem disable row level security;
alter table users_app disable row level security;
alter table doisoat_session disable row level security;
alter table doisoat_file disable row level security;
alter table doisoat_result disable row level security;
alter table bank_unidentified disable row level security;
alter table invoice_unidentified disable row level security;
alter table task_xuly disable row level security;
alter table case_master disable row level security;
alter table case_event disable row level security;
alter table workflow_history disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

notify pgrst, 'reload schema';
