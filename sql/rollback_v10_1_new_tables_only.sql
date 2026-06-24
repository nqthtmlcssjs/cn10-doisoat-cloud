-- Rollback chỉ xóa bảng mới V10.1. Không xóa bảng dữ liệu cũ.
-- Chỉ chạy nếu cần quay lại trước khi dùng V10.1.
drop table if exists doisoat_file cascade;
drop table if exists doisoat_task cascade;
drop table if exists doisoat_session cascade;
notify pgrst, 'reload schema';
