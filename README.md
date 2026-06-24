# CN10 Đối soát thu phí Cloud v8

Bản v8 là bản hướng tới vận hành nội bộ Chi nhánh số 10.

## Có gì mới

- Bắt buộc chọn Điểm trước khi lưu Supabase.
- Dashboard thêm Top điểm cần xử lý nhiều trong tháng.
- Bảng kết quả có cột chênh lệch BIDV và chênh lệch hóa đơn.
- Phân loại nhanh: thiếu BIDV, thiếu hóa đơn, sai tiền.
- Ghi log thao tác vào bảng `audit_log` khi lưu/xóa lần chạy.
- SQL patch v8 bảo đảm đủ cột, tắt RLS giai đoạn đầu và gán quyền admin.

## Cập nhật lên GitHub Pages

1. Giải nén file zip.
2. Upload đè toàn bộ file/thư mục lên repo GitHub.
3. Commit changes.
4. Mở web và nhấn Ctrl + F5.

## Supabase

Vào SQL Editor và chạy:

```sql
sql/07_patch_v8_operational.sql
```

## Tài khoản admin kiểm thử

- Email: `admin@cn10.local`
- Vai trò trong `users_app`: `admin`
- `diem_id`: NULL
- `active`: true

## Checklist trước khi cho các điểm dùng

1. Đăng nhập admin thành công.
2. Dashboard hiện dữ liệu lần chạy mới nhất.
3. Chạy đối soát thử và lưu được Supabase.
4. Lịch sử mở lại được lần chạy cũ.
5. Tra cứu mã H26 ra kết quả.
6. Backup xuất được Excel.
7. Chọn điểm đúng trước khi lưu.
