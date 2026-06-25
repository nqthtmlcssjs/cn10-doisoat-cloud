# CN10 Enterprise Operational 1.0.0

Bản ứng dụng web thực tế để chạy thử vận hành:
- Dashboard
- Đăng nhập Supabase
- Tạo phiên đối soát ngày
- Upload file VBA tổng hợp
- Preview file
- Chạy engine đối soát
- Lưu kết quả vào Supabase
- Sinh task lỗi
- Lưu tiền/sao kê chưa nhận diện
- Case Master

## Triển khai

1. Supabase SQL Editor: chạy `sql/00_INSTALL_OR_VERIFY.sql`.
2. Supabase Authentication: tạo user `admin@cn10.local` với mật khẩu bạn muốn.
3. Upload toàn bộ nội dung thư mục này lên GitHub Pages.
4. Mở web và nhấn Ctrl + F5.

## Lưu ý file Excel
File tổng hợp phải có sheet:
- Doisoat
- dscanbothuphi
- saoke
- sinvoid
