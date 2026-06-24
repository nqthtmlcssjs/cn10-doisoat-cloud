# CN10 V10.1 Production Fixed

Bản vận hành chính thức theo mô hình **Phiên đối soát → Công việc lỗi → Chốt phiên**.

## Cài đặt

Chạy SQL:

```text
sql/10_upgrade_from_current_db.sql
```

Sau đó upload source lên GitHub Pages.

## Lưu ý

- Không xóa database cũ.
- Không chạy lại `01_schema_cn10.sql` nếu Supabase đã có dữ liệu.
- File cần chạy duy nhất cho bản này là `10_upgrade_from_current_db.sql`.
