# CN10 Enterprise Fee Control Center - Operational 1.1.2

## Triển khai
1. Chạy `sql/20_OPERATIONAL_FINAL_1_1_2.sql` trong Supabase SQL Editor.
2. Upload toàn bộ nội dung thư mục này lên GitHub Pages repo `cn10-doisoat-cloud`.
3. Tạo user trong Supabase Authentication nếu chưa có:
   - email: `admin@cn10.local`
   - password: mật khẩu bạn tự đặt
   - Auto confirm: bật
4. Mở web và nhấn `Ctrl + F5`.

## Quy trình vận hành
1. Tạo phiên đối soát ngày.
2. Vào Upload & Engine, chọn phiên, chọn file VBA tổng hợp.
3. Preview file.
4. Chạy engine.
5. Lưu Supabase. Hệ thống hiển thị tiến trình và thông báo thành công.
6. Vào Trung tâm lỗi để xử lý A02/A03/A04/A99.
7. Vào Chốt ngày để kiểm tra điều kiện và chốt phiên.

## Ghi chú
Giai đoạn chạy thử đang tắt RLS để tránh lỗi quyền. Khi nghiệm thu quy trình ổn định, cần bật lại RLS theo vai trò admin/kế toán/điểm.
