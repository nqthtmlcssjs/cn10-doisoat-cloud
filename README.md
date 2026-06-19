# CN10 Đối soát thu phí Cloud v2

Bản v2 bổ sung các chức năng để mở lại web không phải đối soát lại từ đầu:

- Dashboard lấy lần chạy mới nhất từ Supabase.
- Lịch sử đối soát.
- Xem chi tiết từng lần chạy.
- Tra cứu hồ sơ H26 từ Supabase.
- Nhật ký xử lý online.
- Xuất Excel lại từ dữ liệu đã lưu.

## Cập nhật lên GitHub Pages

Copy đè toàn bộ file trong thư mục này vào repo `cn10-doisoat-cloud`, sau đó chạy:

```bash
git add .
git commit -m "Add history lookup journal cloud v2"
git push
```

## Supabase

Nếu trước đó thiếu bảng/cột, chạy lại toàn bộ file:

`sql/01_schema_cn10.sql`

trong Supabase SQL Editor.
