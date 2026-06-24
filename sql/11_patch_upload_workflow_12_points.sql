-- CN10 V11 - Quy trình upload dữ liệu đầu vào chặt chẽ
-- Chạy sau các patch V10. Script an toàn, có thể chạy lại.

-- 1) Bảo đảm bảng diem có đủ cột vận hành nếu app cũ đang dùng
alter table if exists diem
  add column if not exists thu_tu int,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

-- 2) Chuẩn hóa đúng 12 điểm hiện hành của CN10
update diem set ten_diem='Tam Hưng', thu_tu=1, active=true where id=1;
update diem set ten_diem='Bình Minh', thu_tu=2, active=true where id=2;
update diem set ten_diem='Thanh Oai', thu_tu=3, active=true where id=3;
update diem set ten_diem='Dân Hòa', thu_tu=4, active=true where id=4;
update diem set ten_diem='Ứng Thiên', thu_tu=5, active=true where id=5;
update diem set ten_diem='Vân Đình', thu_tu=6, active=true where id=6;
update diem set ten_diem='Ứng Hòa', thu_tu=7, active=true where id=7;
update diem set ten_diem='Hòa Xá', thu_tu=8, active=true where id=8;
update diem set ten_diem='Hương Sơn', thu_tu=9, active=true where id=9;
update diem set ten_diem='Mỹ Đức', thu_tu=10, active=true where id=10;
update diem set ten_diem='Hồng Sơn', thu_tu=11, active=true where id=11;
update diem set ten_diem='Phúc Sơn', thu_tu=12, active=true where id=12;

-- Nếu thiếu id điểm thì tự tạo bổ sung, không đụng dữ liệu đã có
insert into diem(id, ten_diem, thu_tu, active) values
(1,'Tam Hưng',1,true),(2,'Bình Minh',2,true),(3,'Thanh Oai',3,true),(4,'Dân Hòa',4,true),
(5,'Ứng Thiên',5,true),(6,'Vân Đình',6,true),(7,'Ứng Hòa',7,true),(8,'Hòa Xá',8,true),
(9,'Hương Sơn',9,true),(10,'Mỹ Đức',10,true),(11,'Hồng Sơn',11,true),(12,'Phúc Sơn',12,true)
on conflict (id) do nothing;

-- 3) Bổ sung thông tin file upload vào doisoat_file để lưu vết sau này
alter table if exists doisoat_file
  add column if not exists file_size bigint,
  add column if not exists file_note text,
  add column if not exists validation_status text,
  add column if not exists validation_message text;

-- 4) Bảo đảm các bảng vận hành không bị RLS chặn trong giai đoạn dùng nội bộ
alter table if exists diem disable row level security;
alter table if exists doisoat_session disable row level security;
alter table if exists doisoat_file disable row level security;
alter table if exists doisoat_task disable row level security;
alter table if exists dot_doisoat disable row level security;
alter table if exists ketqua_doisoat disable row level security;
alter table if exists hoa_don_chua_khop disable row level security;
alter table if exists saoke_chua_nhan_dien disable row level security;
alter table if exists thongke_sinvoice disable row level security;
alter table if exists nhatky_xuly disable row level security;
alter table if exists users_app disable row level security;
alter table if exists audit_log disable row level security;

notify pgrst, 'reload schema';
