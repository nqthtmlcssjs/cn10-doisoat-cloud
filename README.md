# CN10 Enterprise Fee Control Center 1.0.0

Bản cải tiến gửi lại để upload trực tiếp lên GitHub Pages.

## Cấu trúc

- `index.html`: giao diện chính, nằm ở thư mục gốc để GitHub Pages không hiện README nữa.
- `assets/css/style.css`: giao diện.
- `assets/js/config.js`: cấu hình Supabase mới.
- `assets/js/engine.js`: engine đối soát Excel.
- `assets/js/app.js`: đăng nhập, tạo phiên, preview, lưu Supabase, sinh task, case master.
- `sql/00_INSTALL_OR_VERIFY.sql`: kiểm tra/tạo đủ bảng nếu database còn thiếu.

## Cách triển khai

1. Supabase SQL Editor: chạy `sql/00_INSTALL_OR_VERIFY.sql` nếu chưa chắc database đủ bảng.
2. Supabase Authentication → Users → tạo user `admin@cn10.local` và mật khẩu.
3. Upload toàn bộ nội dung thư mục này lên GitHub repo `cn10-doisoat-cloud`.
4. Mở: `https://nqthtmlcssjs.github.io/cn10-doisoat-cloud/?v=1.0.0-enterprise-run`
5. Nhấn `Ctrl + F5`.

## Quy trình chạy thử

1. Đăng nhập.
2. Tạo phiên theo ngày và điểm.
3. Vào Upload & Engine.
4. Chọn phiên.
5. Upload file VBA tổng hợp có đủ sheet:
   - `Doisoat`
   - `dscanbothuphi`
   - `saoke`
   - `sinvoid`
   - `nhatky_xuly` nếu có
6. Bấm `Kiểm tra file`.
7. Bấm `Chạy engine & lưu Supabase`.

## Lưu ý

- Bản này ưu tiên chạy ổn định với database sạch Sprint 1-4A.
- RLS đang để tắt trong giai đoạn chạy thử.
- Sau khi chạy ổn định mới bật phân quyền chặt theo vai trò.
