# Quy trình vận hành chính thức CN10 V13

## 1. Tạo phiên đối soát

Chọn điểm, chọn kỳ, tạo phiên. Mỗi điểm/kỳ chỉ nên có một phiên chính và nếu cần thì tạo phiên hiệu chỉnh.

## 2. Upload dữ liệu

Có 2 cách:

- 1 file tổng hợp VBA có đủ sheet.
- 3 file riêng: Thu phí, Sao kê BIDV, SInvoice.

Chỉ chạy đối soát khi hệ thống báo file đạt mẫu.

## 3. Chạy đối soát

Nguồn mã hồ sơ chuẩn là danh sách cán bộ thu phí. BIDV và SInvoice dùng để đối chiếu, không tự tạo hồ sơ mới.

## 4. Xử lý lỗi

Các nhóm cần kiểm tra:

- Thiếu BIDV.
- Thiếu hóa đơn.
- Sai tiền.
- Sao kê chưa nhận diện.
- Hóa đơn chưa nhận diện.
- Tiền ngân hàng chưa xác định.

## 5. Hạch toán

Hồ sơ đủ điều kiện hạch toán khi đã xác định đủ tiền, hóa đơn và không còn sai lệch cần xử lý.

## 6. Chốt tháng

Không chốt tháng nếu còn tiền chưa xác định, sai tiền hoặc hóa đơn/sao kê chưa nhận diện chưa xử lý.
