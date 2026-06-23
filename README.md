# CN10 Đối soát Cloud v3

Bản v3 bổ sung:
- Đăng nhập Google qua Supabase Auth.
- Phân quyền frontend theo bảng `users_app`: `admin`, `ketoan`, `diem`.
- Lịch sử đối soát, xem chi tiết, xóa lần chạy lỗi cho admin.
- Tra cứu theo mã hồ sơ, số hóa đơn, tham chiếu BIDV.
- Nhật ký xử lý online: thêm/sửa/xóa.
- Backup toàn bộ dữ liệu Supabase ra Excel.

## Cập nhật database
Chạy trong Supabase SQL Editor:

1. `sql/01_schema_cn10.sql`
2. `sql/02_patch_v3.sql`

## Cấu hình
Sửa `assets/js/config.js`:

```js
window.CN10_CONFIG = {
  SUPABASE_URL: 'https://tstxzuuyrpzwhuggzqvd.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_...'
};
```

## Push GitHub
```bash
git add .
git commit -m "CN10 cloud v3 auth backup journal"
git push --force
```

## Lưu ý bảo mật
Bản v3 đang tắt RLS để vận hành nhanh. Sau khi chốt danh sách tài khoản, cần bật RLS thật để bảo mật cấp database.


## v4 - Đăng nhập Email + mật khẩu

Bản v4 thay nút Google Login bằng Email/Password qua Supabase Auth.

Supabase cần bật: Authentication → Sign In / Providers → Email.
Tạo user ví dụ: admin@cn10.local.
Sau đó chạy sql/03_patch_v4_email_auth.sql để khai báo quyền trong bảng users_app.

Upload toàn bộ thư mục lên GitHub Pages như các bản trước.
