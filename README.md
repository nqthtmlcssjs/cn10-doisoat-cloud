# CN10 V13 Official Stable

Bản này là bản ổn định để đưa vào vận hành chính thức, thay thế các gói V10/V11/V12 thử nghiệm.

## Nguyên tắc chính

- Hiển thị đúng phiên bản: **V13 Official Stable**.
- Hệ thống CN10 dùng **12 điểm**.
- Không xóa bảng cũ, không xóa lịch sử đối soát.
- SQL chỉ bổ sung/cập nhật schema còn thiếu.
- Không dùng lại các file patch cũ nếu chưa cần.

## Chức năng chính

- Phiên đối soát.
- Upload 1 file tổng hợp VBA hoặc 3 file riêng.
- Chạy đối soát.
- Lưu Supabase.
- Tạo hàng đợi lỗi.
- Theo dõi dòng tiền BIDV chưa xác định.
- Theo dõi trạng thái hạch toán hồ sơ.
- Chốt tháng.
- Quản trị người dùng.

## Cách triển khai

1. Upload toàn bộ source trong gói này lên GitHub.
2. Vào Supabase SQL Editor.
3. Chạy file: `sql/00_V13_RUN_ONCE_OFFICIAL.sql`.
4. Mở web với `?v=13`, ví dụ:
   `https://nqthtmlcssjs.github.io/cn10-doisoat-cloud/?v=13`
5. Nhấn `Ctrl + F5`.

## Không chạy lại

Không cần chạy lại các file patch cũ như V10, V11, V12 nếu đã chạy V13.

## Tài khoản admin

Script sẽ đảm bảo bảng `users_app` có tài khoản:

- `admin@cn10.local`
- vai trò: `admin`

Lưu ý: tài khoản đăng nhập vẫn phải có trong Supabase Authentication → Users.
