# CN10 Official V14.0.0 Stable

Bản V14 viết lại phần frontend theo hướng ổn định, tách module để dễ sửa lỗi:

- `supabase-client.js`: kết nối Supabase, version frontend.
- `ui.js`: hàm giao diện chung.
- `data-api.js`: đọc/ghi Supabase, phiên đối soát, danh mục điểm.
- `upload-workflow.js`: upload 1 file tổng hợp hoặc 3 file riêng, kiểm tra mẫu, chạy engine.
- `accounting.js`: dòng tiền, tiền chưa xác định, trạng thái hạch toán.
- `app.js`: điều phối màn hình.

## Điểm chính

- Hiển thị đúng `V14.0.0`.
- Load danh sách 12 điểm chắc chắn từ bảng `diem`, fallback theo `id` nếu thiếu `thu_tu`.
- Có bảng `system_version` để biết database đang ở phiên bản nào.
- Chỉ có 1 file SQL chạy một lần: `sql/00_V14_RUN_ONCE_OFFICIAL.sql`.
- Không xóa lịch sử đối soát cũ.
- Không chạy các patch V10/V11/V12/V13 nữa.

## Triển khai

1. Upload toàn bộ nội dung thư mục này lên GitHub repo `cn10-doisoat-cloud`.
2. Vào Supabase → SQL Editor.
3. Chạy `sql/00_V14_RUN_ONCE_OFFICIAL.sql`.
4. Mở web bằng link:

```text
https://nqthtmlcssjs.github.io/cn10-doisoat-cloud/?v=14
```

5. Nhấn `Ctrl + F5`.

## Test nhanh

- Đăng nhập `admin@cn10.local`.
- Vào `⚙️ Hệ thống` kiểm tra 12 điểm hiện đúng.
- Vào `🚀 Phiên đối soát` chọn điểm, chọn kỳ, tạo phiên.
- Chọn 1 file tổng hợp hoặc 3 file riêng.
- Bấm `Kiểm tra file` → `Chạy đối soát` → `Lưu kết quả`.

