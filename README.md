# CN10 Fee Control Center V11 - Upload Workflow chuẩn vận hành

Bản V11 tập trung làm chặt **quy trình tải file đầu vào trước khi đối soát**.

## Điểm mới

- Tạo phiên đối soát trước khi chạy.
- Hỗ trợ 2 chế độ upload:
  - **1 file tổng hợp VBA** có sheet `Doisoat`, `dscanbothuphi`, `saoke`, `sinvoid`.
  - **3 file riêng**: DS thu phí, Sao kê BIDV, S-Invoice.
- Có checklist trạng thái:
  - Phiên đối soát
  - Điểm/kỳ đối soát
  - DS thu phí
  - Sao kê BIDV
  - S-Invoice
  - Điều kiện chạy
- Nút **Bắt đầu đối soát** chỉ sáng khi đủ điều kiện.
- Tự kiểm tra mẫu file cơ bản trước khi chạy.
- Chuẩn hóa hệ thống còn **12 điểm**.

## Triển khai

1. Upload đè toàn bộ source lên GitHub.
2. Vào Supabase → SQL Editor.
3. Chạy:

```sql
sql/11_patch_upload_workflow_12_points.sql
```

4. Mở web và nhấn `Ctrl + F5`.
5. Đăng nhập admin và vào **Phiên đối soát** để test quy trình upload.

## Quy trình cán bộ

1. Đăng nhập.
2. Tạo phiên đối soát.
3. Chọn điểm và kỳ.
4. Upload 1 file tổng hợp hoặc đủ 3 file riêng.
5. Kiểm tra checklist đủ xanh.
6. Bấm **Bắt đầu đối soát**.
7. Lưu phiên.
8. Xử lý lỗi.
9. Chốt phiên.

## Lưu ý

- Engine đối soát giữ nguyên logic VBA đã kiểm chứng.
- SInvoice tiếp tục dùng `AQ + BP + BU`.
- Với 3 file riêng, hệ thống tự tạo sheet `Doisoat` từ DS thu phí để chạy engine.
