# Web Xem Tử Vi — Cô Dâu Âm Phủ (Nhà Ma Âm Phủ Huế)

Website cho khách xem tử vi khi đến trải nghiệm. **Chế độ nhân viên thủ công**: khách nhập
thông tin → vào hàng chờ → nhân viên dùng ChatGPT Plus gen ảnh rồi upload → khách xem + tải PDF.

## Luồng hoạt động

1. **Khách** quét QR, mở web trên điện thoại, nhập họ tên / ngày sinh / giờ sinh / nơi sinh / giới tính → bấm gửi. Màn hình hiện "Cô Dâu đang gieo quẻ…" và tự chờ.
2. **Nhân viên** mở `/admin` (nhập mật khẩu), thấy yêu cầu mới. Bấm **Copy nội dung** → dán vào ChatGPT project → gen ảnh → tải PNG về → bấm **Upload ảnh PNG**.
3. **Khách** tự động thấy lá số hiện ra, bấm **Tải PDF** để lưu về máy.

## Chạy thử trên máy

```bash
npm install
# Windows PowerShell:
$env:ADMIN_PASSWORD="matkhau123"; npm start
# macOS/Linux:
ADMIN_PASSWORD=matkhau123 npm start
```

Mở http://localhost:3000 (khách) và http://localhost:3000/admin (nhân viên).

## Deploy lên Render

1. Đẩy thư mục này lên một repo GitHub.
2. Vào [render.com](https://render.com) → **New → Web Service** → chọn repo.
3. Render tự đọc `render.yaml`. Nếu cần điền tay:
   - Runtime: **Node**
   - Build: `npm install`
   - Start: `npm start`
4. Tab **Environment** → thêm biến:
   - `ADMIN_PASSWORD` = mật khẩu cho trang admin (bắt buộc đổi).
   - `TUVI_PROMPT` = (tuỳ chọn) prompt bạn đã soạn, để nhân viên copy sẵn.
5. Bấm **Deploy**. Xong sẽ có link dạng `https://ten-cua-ban.onrender.com`.
6. Tạo mã QR trỏ tới link đó, dán tại gian nhà ma.

## Lưu ý quan trọng

- **Lưu trong RAM:** yêu cầu và ảnh chỉ giữ tạm (mặc định 2 giờ) rồi tự xoá. Phù hợp cho việc xem tại chỗ. Nếu server Render (gói free) ngủ do không có khách và khởi động lại, các yêu cầu đang chờ sẽ mất — khách chỉ cần nhập lại.
- **Đổi `ADMIN_PASSWORD`** trước khi mở cho khách.
- Muốn chuyển sang **tự động hoàn toàn** (không cần nhân viên): cần OpenAI API key. Báo mình để bật lại luồng đó.

## Cấu trúc

```
server.js        Backend Express (hàng chờ trong RAM, API admin)
public/
  index.html     Trang khách (form → chờ → kết quả + PDF)
  admin.html     Trang nhân viên (đăng nhập, xem hàng chờ, upload ảnh)
  app.js         Logic phía khách
  admin.js       Logic phía nhân viên
  style.css      Giao diện tông đỏ/đen/vàng
render.yaml      Cấu hình deploy Render
```
