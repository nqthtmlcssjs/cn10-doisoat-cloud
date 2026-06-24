# CN10 Đối soát thu phí Cloud v9 - Control Center

Bản v9 chuyển hệ thống từ web đối soát sang **Trung tâm điều hành thu phí CN10**.

## Điểm mới

- Màn hình **CN10 Fee Control Center**.
- KPI điều hành: tỷ lệ khớp, hồ sơ cần xử lý, tổng thu phí, điểm chưa đối soát.
- Bản đồ 15 điểm theo màu: xanh/cam/đỏ/xám.
- Hàng đợi xử lý lỗi chỉ hiển thị hồ sơ Needs Review.
- Phân loại lỗi: thiếu BIDV, thiếu hóa đơn, sai tiền, thiếu cả BIDV + hóa đơn.
- Nút tạo nhật ký xử lý từ dòng lỗi.
- Xuất hàng đợi lỗi ra Excel.
- SQL mở rộng: `sql/08_patch_v9_control_center.sql`.

## Cập nhật

1. Upload đè toàn bộ file lên GitHub.
2. Chạy SQL `sql/08_patch_v9_control_center.sql` trong Supabase SQL Editor.
3. Mở web và nhấn `Ctrl + F5`.
4. Đăng nhập admin, kiểm tra màn hình Điều hành và Xử lý lỗi.

## Lưu ý

- Engine đối soát vẫn giữ logic VBA đã kiểm chứng.
- SInvoice vẫn dùng `AQ + BP + BU`.
- Bản v9 chưa bắt buộc dùng bảng `tasks`, nhưng đã tạo sẵn để nâng cấp workflow giao việc ở v10.
