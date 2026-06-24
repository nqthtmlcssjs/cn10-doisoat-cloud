# CN10 Đối soát thu phí Cloud v7

Bản v7 là bản gần vận hành: có Dashboard, Lịch sử, Đối soát mới, Tra cứu, Báo cáo tháng, Nhật ký xử lý, Backup và Quản trị người dùng.

## Điểm mới v7

- Thêm màn hình **Báo cáo tháng**.
- Tổng hợp theo điểm: số lần chạy, tổng hồ sơ, khớp, lệch, tỷ lệ khớp, tổng tiền.
- Xuất báo cáo tháng ra Excel.
- Giữ phân quyền `admin / ketoan / diem`.
- Bảo đảm `admin@cn10.local` được gán quyền admin qua SQL patch.
- Bổ sung checklist vận hành thử.

## Cập nhật GitHub Pages

Giải nén v7, upload đè toàn bộ file lên repo GitHub hoặc dùng git:

```bash
git add .
git commit -m "CN10 cloud v7 operational"
git push
```

Sau khi GitHub Pages cập nhật, mở web và nhấn `Ctrl + F5`.

## Supabase

Vào Supabase → SQL Editor → New Query, chạy:

```text
sql/06_patch_v7_operational.sql
```

## Tài khoản kiểm thử

Tạo user trong Supabase Authentication:

```text
admin@cn10.local
```

Sau đó SQL patch sẽ gán quyền:

```text
vai_tro = admin
active = true
diem_id = null
```

## Checklist trước khi đưa vào hoạt động

1. Đăng nhập admin thấy góc phải: `Quản trị CN10 · admin`.
2. Chạy đối soát file VBA chuẩn và so lại tổng với VBA.
3. Lưu Supabase thành công.
4. Mở Lịch sử, xem lại lần chạy cũ.
5. Xuất Excel từ lần chạy cũ.
6. Tra cứu mã hồ sơ H26.
7. Thêm thử Nhật ký xử lý.
8. Vào Báo cáo tháng, kiểm tra số liệu theo điểm.
9. Backup dữ liệu ra Excel.
10. Chỉ sau khi test ổn 3–7 ngày mới cấp tài khoản cho các điểm.

## Khuyến nghị vận hành

- Giai đoạn đầu chỉ cho admin/kế toán dùng.
- Chưa bật RLS khi chưa cấu hình policy đầy đủ.
- Backup cuối ngày hoặc cuối tuần.
- Mọi thay đổi nghiệp vụ phải đối chiếu lại với VBA chuẩn.
