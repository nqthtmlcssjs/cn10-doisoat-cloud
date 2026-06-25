# CN10 Enterprise Fee Control Center - Run Test 1.0.0

Bản chạy thử ổn định theo hướng Enterprise, chốt đối soát theo ngày.

## Cài đặt

1. Supabase project mới `cn10-enterprise` → SQL Editor → chạy:

`sql/00_INSTALL_RUN_TEST.sql`

2. Supabase Authentication → Users → Add user:

- Email: `admin@cn10.local`
- Password: tự đặt

3. Upload toàn bộ source lên GitHub Pages.

4. Mở web với cache version:

`https://nqthtmlcssjs.github.io/cn10-doisoat-cloud/?v=1.0.0-run-test`

## Quy trình chạy thử

1. Đăng nhập admin.
2. Vào `Phiên ngày` → chọn điểm, ngày → tạo phiên.
3. Vào `Upload Center` → chọn phiên.
4. Chọn kiểu upload:
   - 1 file tổng hợp VBA có sheet `dscanbothuphi`, `saoke`, `sinvoid`.
   - Hoặc 3 file riêng.
5. Bấm `Preview file`.
6. Bấm `Import raw`.
7. Bấm `Chạy đối soát`.
8. Xem `Kết quả`, `Xử lý lỗi`, `Tiền chưa xác định`, `Hồ sơ`.

## Nguồn cột đang đọc

### Thu phí
- Sheet: `dscanbothuphi`
- Mã hồ sơ: cột E
- Ngày thu: cột F
- Số tiền: cột J

### Sao kê BIDV
- Sheet: `saoke`
- Diễn giải: cột L
- Nợ: cột F
- Có: cột G
- Tham chiếu: cột P

### SInvoice
- Sheet: `sinvoid`
- Số hóa đơn: cột D
- Ngày hóa đơn: cột E
- Tổng tiền: cột AG
- Mã nhận diện: AQ + BP + BU

## Ghi chú

Bản này tắt RLS để chạy thử ổn định. Khi nghiệp vụ đã ổn, Sprint sau sẽ bật lại RLS theo vai trò admin/kế toán/điểm.
