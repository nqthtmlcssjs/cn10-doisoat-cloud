# CN10 Fee Control Center Enterprise 1.0.0

Bản cài sạch, bỏ toàn bộ logic vá V10/V11/V12/V13/V14.

## Cài đặt

1. Supabase SQL Editor: chạy `sql/00_RESET_AND_INSTALL_ENTERPRISE_1_0_0.sql`.
2. Supabase Authentication → Users: tạo `admin@cn10.local` và mật khẩu.
3. Upload toàn bộ thư mục này lên GitHub Pages.
4. Mở `https://nqthtmlcssjs.github.io/cn10-doisoat-cloud/?v=1.0.0` và Ctrl+F5.

## Cảnh báo

SQL này reset schema `public`, chỉ dùng khi muốn làm sạch database để vận hành chính thức.

## Quy trình

Tạo phiên → upload 1 file tổng hợp hoặc 3 file riêng → kiểm tra mẫu → chạy đối soát → lưu kết quả → xử lý lỗi → hạch toán → chốt.
