# Quy trình xử lý hồ sơ cần kiểm tra và hạch toán CN10

## Bước 1. Chạy đối soát
Upload dữ liệu và chạy đối soát như quy trình hiện tại.

## Bước 2. Kiểm tra nhóm lỗi
Các hồ sơ chưa khớp được chia theo nhóm:
- Thiếu BIDV: chờ tiền về hoặc kiểm tra sao kê.
- Thiếu hóa đơn: đã có tiền, cần xuất/bổ sung hóa đơn.
- Sai tiền: không được chốt, phải xác minh nguồn sai.
- Sao kê chưa nhận diện: đưa sang tiền ngân hàng chưa xác định.
- Hóa đơn chưa nhận diện: kiểm tra sai mã, hóa đơn thay thế hoặc không thuộc kỳ.

## Bước 3. Theo dõi tiền ngân hàng chưa xác định
Vào menu **Tiền chưa xác định** → đồng bộ từ sao kê chưa nhận diện.
Mỗi giao dịch phải xử lý theo một trong hai hướng:
- Gắn mã hồ sơ đúng.
- Đánh dấu không thuộc kỳ/không phải khoản thu phí.

## Bước 4. Theo dõi trạng thái hạch toán
Vào menu **Dòng tiền & hạch toán**.
Hệ thống tự phân loại:
- Đủ điều kiện hạch toán
- Đã hạch toán
- Chờ tiền về
- Chờ hóa đơn
- Chờ nhận diện
- Chờ xử lý

## Bước 5. Đánh dấu đã hạch toán
Chỉ chọn hồ sơ ở trạng thái **Đủ điều kiện hạch toán**.
Sau khi kế toán đã ghi nhận, bấm **Đánh dấu đã hạch toán**.

## Bước 6. Chốt tháng
Vào **Chốt tháng** → Kiểm tra điều kiện.
Chỉ chốt khi:
- Tiền chưa xác định = 0
- Hồ sơ còn vướng = 0

Sau khi chốt tháng, dữ liệu dùng để báo cáo và giải trình.
