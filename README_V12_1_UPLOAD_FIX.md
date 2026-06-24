# CN10 V12.1 - Sửa quy trình upload và chạy đối soát

## Nội dung sửa

- Không còn chỉ có 1 kiểu upload.
- Có 2 cách tải file:
  1. **1 file tổng hợp VBA** có đủ sheet: `Doisoat`, `dscanbothuphi`, `saoke`, `sinvoid`.
  2. **3 file riêng**: Thu phí, Sao kê BIDV, SInvoice.
- Nếu dùng 3 file riêng và file Thu phí chưa có sheet `Doisoat`, hệ thống tự tạo danh sách mã hồ sơ từ cột E của sheet `dscanbothuphi`.
- Nút **Chạy đối soát** chỉ sáng khi đã tạo/mở phiên và đã chọn file.
- Sửa lỗi đọc danh mục `diem` theo schema hiện tại chỉ có `id`, `ten_diem`.
- Sửa lỗi đọc quyền điểm không yêu cầu cột `ma_diem`.

## Cách triển khai

1. Upload đè toàn bộ source lên GitHub.
2. Không cần chạy thêm SQL nếu bạn đã chạy V12.
3. Mở web và nhấn `Ctrl + F5`.
4. Vào **Phiên đối soát**:
   - Tạo phiên.
   - Chọn 1 file tổng hợp hoặc đủ 3 file riêng.
   - Bấm **Chạy đối soát**.
   - Sau khi chạy xong mới bấm **Lưu phiên**.

## Lưu ý

Nếu dùng 3 file riêng:

- File Thu phí nên có sheet `dscanbothuphi`.
- File Sao kê có thể có sheet `saoke`, nếu không có hệ thống lấy sheet đầu tiên.
- File SInvoice có thể có sheet `sinvoid`, nếu không có hệ thống lấy sheet đầu tiên.
