# CN10 Đối soát thu phí Cloud v6

Bản v6 sửa trọng tâm phần phân quyền: tài khoản `admin@cn10.local` không còn bị hiện `chưa phân quyền` khi bảng `users_app` đã có vai trò `admin`.

## Cập nhật

1. Upload đè toàn bộ thư mục này lên GitHub repo `cn10-doisoat-cloud`.
2. Vào Supabase → SQL Editor, chạy file:

```text
sql/05_patch_v6_fix_role.sql
```

3. Mở web và nhấn `Ctrl + F5`.
4. Đăng xuất, đăng nhập lại bằng `admin@cn10.local`.

## Nội dung chính

- Đọc quyền từ `users_app` không phân biệt hoa/thường.
- Không dùng join `users_app -> diem` ở bước đọc quyền để tránh lỗi relationship/schema cache.
- Có fallback tạm cho `admin@cn10.local` trong giai đoạn cài đặt.
- Tắt RLS tạm thời cho `users_app` và `diem` để frontend đọc được quyền.
- Giữ nguyên các chức năng v5: lịch sử, tra cứu, nhật ký xử lý, backup, quản trị người dùng.

## Kiểm tra sau khi cập nhật

Góc phải phải hiện:

```text
Quản trị CN10 · admin
```

thay vì:

```text
admin@cn10.local · chưa phân quyền
```


---

# CN10 Đối soát thu phí Cloud v5

Bản v5 là bản hoàn thiện vận hành sau khi engine đã khớp VBA.

## Có gì mới

- Chọn điểm khi lưu lần đối soát đối với admin/kế toán.
- Lọc lịch sử theo điểm và khoảng ngày.
- Tra cứu theo mã hồ sơ, số hóa đơn, tham chiếu BIDV và có lọc điểm.
- Nhật ký xử lý online có chọn điểm, lưu người tạo.
- Quản trị users_app ngay trên web: email, họ tên, vai trò, điểm.
- Backup thêm bảng users_app và diem.
- Dashboard có tỷ lệ khớp.
- Export lần chạy cũ ổn định hơn.

## Cập nhật Supabase

Vào Supabase → SQL Editor → New query, chạy:

```sql
-- chạy file sql/04_patch_v5_final.sql
```

## Cập nhật GitHub Pages

Upload đè toàn bộ nội dung thư mục này lên repo GitHub:

```text
nqthtmlcssjs/cn10-doisoat-cloud
```

Sau đó mở link GitHub Pages và nhấn Ctrl + F5.

## Lưu ý về tài khoản

Web quản trị `users_app`, nhưng tài khoản đăng nhập vẫn phải được tạo trong:

```text
Supabase → Authentication → Users
```

Ví dụ:

```text
admin@cn10.local
ketoan@cn10.local
tamhung@cn10.local
```

Sau đó vào màn hình Quản trị trong web để gán vai trò.
