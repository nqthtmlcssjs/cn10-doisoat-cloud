# CN10 Fee Control Center V10 - Production Workflow

Bản V10 chuyển hệ thống từ **web upload Excel** thành **quy trình vận hành đối soát** cho Chi nhánh số 10.

## Điểm mới quan trọng

1. **Phiên đối soát**
   - Mỗi lần làm việc tạo một phiên có mã riêng, ví dụ `DS2026071234`.
   - Phiên có trạng thái: `draft`, `running`, `review`, `completed`, `closed`.

2. **Wizard quy trình**
   - Tạo phiên
   - Chọn file Excel chuẩn VBA
   - Chạy đối soát
   - Lưu Supabase
   - Tự tạo công việc lỗi
   - Xử lý lỗi
   - Chốt phiên
   - Báo cáo/lưu trữ

3. **Công việc xử lý lỗi**
   - Các dòng `Needs Review` được chuyển thành bảng `doisoat_task`.
   - Có thể đánh dấu hoàn thành từng lỗi.

4. **Chốt phiên**
   - Phiên đã chốt sẽ bị khóa ở mức quy trình.
   - Không nên sửa/xóa dữ liệu phiên đã chốt.

5. **Dashboard vận hành**
   - Phiên đang mở
   - Bản đồ 15 điểm
   - Top điểm cần xử lý
   - Công việc lỗi mới nhất

## Cấu trúc thư mục

```text
index.html
assets/
  css/style.css
  js/app.js
  js/engine.js
  js/config.js
sql/
  01_schema_cn10.sql
  09_patch_v10_production_workflow.sql
  00_RUN_THIS_FIRST.sql
README.md
```

## Cập nhật lên GitHub Pages

1. Giải nén file zip.
2. Upload đè toàn bộ lên repository `cn10-doisoat-cloud`.
3. Chờ GitHub Pages build lại.
4. Mở web và nhấn `Ctrl + F5`.

## Cập nhật Supabase

Vào **Supabase → SQL Editor** và chạy theo thứ tự:

1. Nếu database đã có sẵn: chỉ cần chạy:

```text
sql/09_patch_v10_production_workflow.sql
```

2. Nếu tạo database mới từ đầu:

```text
sql/01_schema_cn10.sql
sql/09_patch_v10_production_workflow.sql
```

## Quy trình cán bộ sử dụng

1. Đăng nhập.
2. Vào **Phiên đối soát**.
3. Chọn điểm và kỳ đối soát.
4. Bấm **Tạo phiên**.
5. Chọn file Excel chuẩn VBA.
6. Bấm **Chạy đối soát**.
7. Bấm **Lưu phiên**.
8. Vào **Công việc lỗi** để xử lý các hồ sơ cần kiểm tra.
9. Khi đã xử lý xong, quay lại phiên và bấm **Chốt phiên**.
10. Vào **Báo cáo** để xem tổng hợp tháng.

## Ghi chú nghiệp vụ

- Engine đối soát vẫn giữ logic VBA đã kiểm chứng.
- SInvoice vẫn nhận diện theo `AQ + BP + BU`.
- Bảng `doisoat_task` là điểm khác biệt mới: biến lỗi thành việc cần xử lý, giúp 15 điểm làm theo quy trình thống nhất.
