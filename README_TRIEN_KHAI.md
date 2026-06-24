# CN10 V10.1 Production Fixed

Bản này dùng đúng database hiện tại của bạn, không xóa bảng cũ và không làm mất dữ liệu.

## Triển khai

1. Vào Supabase → SQL Editor → New Query.
2. Chạy file: `sql/10_upgrade_from_current_db.sql`.
3. Upload toàn bộ source trong thư mục này đè lên GitHub repo `cn10-doisoat-cloud`.
4. Mở web GitHub Pages và nhấn `Ctrl + F5`.
5. Đăng nhập `admin@cn10.local`.

## Thay đổi chính

- Bổ sung schema tương thích database hiện tại.
- Thêm/chuẩn hóa `doisoat_session`.
- Thêm `doisoat_task` cho hàng đợi xử lý lỗi.
- Bổ sung các cột thiếu trong `diem`, `users_app`, `notifications`, `audit_log`.
- Không xóa các bảng cũ: `dot_doisoat`, `ketqua_doisoat`, `nhatky_xuly`, `tasks`, `notifications`, `monthly_report`.
- Giữ engine đối soát theo VBA, SInvoice dùng `AQ + BP + BU`.

## Quy trình cán bộ

1. Đăng nhập.
2. Vào **Phiên đối soát**.
3. Chọn điểm và kỳ đối soát.
4. Tạo phiên.
5. Upload file Excel chuẩn VBA.
6. Chạy đối soát.
7. Lưu phiên.
8. Xử lý công việc lỗi.
9. Chốt phiên.
10. Xuất báo cáo khi cần.
