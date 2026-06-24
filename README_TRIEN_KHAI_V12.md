# CN10 V12 - Accounting Control Center

Bản V12 chuyển trọng tâm từ “đối soát hồ sơ” sang “quản lý dòng tiền và trạng thái hạch toán”.

## 1. Thứ tự triển khai

1. Upload toàn bộ source lên GitHub Pages.
2. Vào Supabase → SQL Editor.
3. Chạy file: `sql/12_patch_accounting_control.sql`.
4. Mở web và nhấn `Ctrl + F5`.
5. Đăng nhập `admin@cn10.local`.

## 2. Module mới

### 💰 Dòng tiền & hạch toán
Theo dõi từng hồ sơ theo trạng thái:
- Đủ điều kiện hạch toán
- Đã hạch toán
- Chờ tiền về
- Chờ hóa đơn
- Chờ nhận diện
- Chờ xử lý

### 🏦 Tiền ngân hàng chưa xác định
Lấy từ `saoke_chua_nhan_dien` sang bảng `bank_unidentified` để theo dõi riêng các khoản tiền vào ngân hàng chưa xác định được hồ sơ.

### 🔒 Chốt tháng
Chỉ chốt khi:
- Không còn tiền ngân hàng chưa xác định trạng thái pending.
- Không còn hồ sơ ở trạng thái chờ xử lý/chờ nhận diện/chờ tiền/chờ hóa đơn.

## 3. Nguyên tắc vận hành

- Cán bộ thu phí vẫn là nguồn gốc mã hồ sơ.
- BIDV là nguồn xác nhận tiền thực nhận.
- SInvoice là nguồn xác nhận hóa đơn.
- Không tự tạo mã hồ sơ mới từ sao kê/hóa đơn.
- Sao kê chưa nhận diện phải đưa vào “Tiền chưa xác định”, không tự hạch toán.
- Chỉ đánh dấu “Đã hạch toán” khi đủ tiền, đủ hóa đơn và hồ sơ khớp.

## 4. Không mất dữ liệu

File SQL chỉ `CREATE TABLE IF NOT EXISTS` và `ALTER TABLE IF EXISTS`, không xóa bảng cũ.
