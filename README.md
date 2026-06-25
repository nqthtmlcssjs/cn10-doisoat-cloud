# CN10 Fee Control Center Enterprise 1.0.0

Bản sạch cho project Supabase mới.

## Triển khai

1. Supabase → SQL Editor → chạy toàn bộ:
   `sql/00_INSTALL_CLEAN.sql`

2. Supabase → Authentication → Users → Add user:
   - Email: `admin@cn10.local`
   - Password: tự đặt

3. Upload toàn bộ source lên GitHub Pages.

4. Mở:
   `https://nqthtmlcssjs.github.io/cn10-doisoat-cloud/?v=1.0.0`

## Lưu ý

- Không chạy patch cũ V10/V11/V12/V13/V14.
- Project Supabase mới đã được cấu hình trong `assets/js/config.js`.
- RLS đang tắt cho giai đoạn vận hành thử để tránh lỗi quyền; sau khi ổn định mới bật policy chuẩn.
