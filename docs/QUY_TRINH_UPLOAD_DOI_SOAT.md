# Quy trình upload và đối soát CN10 V14

1. Tạo phiên đối soát theo điểm và kỳ.
2. Chọn kiểu upload:
   - 1 file tổng hợp VBA có đủ sheet `Doisoat`, `dscanbothuphi`, `saoke`, `sinvoid`.
   - Hoặc 3 file riêng: thu phí, sao kê BIDV, SInvoice.
3. Bấm kiểm tra file. Hệ thống phải thấy đủ 4 sheet chuẩn.
4. Chỉ khi đạt mẫu mới cho chạy đối soát.
5. Sau khi chạy xong, kiểm tra nhóm cần xử lý.
6. Lưu kết quả vào Supabase.
7. Xử lý lỗi, theo dõi hạch toán và chốt phiên.

