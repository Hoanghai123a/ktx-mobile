# KTX-Mobile Backend API

Backend được xây dựng bằng **Node.js (Express)** và **PostgreSQL**, tuân thủ cấu trúc API của dự án SmartNote.

## Công nghệ sử dụng
- **Express**: Framework web.
- **PostgreSQL**: Cơ sở dữ liệu.
- **JWT (jsonwebtoken)**: Xác thực người dùng.
- **bcryptjs**: Mã hóa mật khẩu.
- **Cors & Morgan**: Middleware bảo mật và logging.

## Cài đặt và Chạy
1. **Cài đặt thư viện**:
   ```bash
   cd backend
   npm install
   ```

2. **Cấu hình biến môi trường**:
   - Mở file `.env` và cập nhật `DATABASE_URL` theo cấu hình Postgres của bạn.
   - Đảm bảo `APPLICATION_KEY` khớp với `VITE_KEY` ở frontend.

3. **Khởi tạo Database**:
   - Sử dụng file `db_schema.sql` (ở thư mục gốc) để tạo các bảng cần thiết trong Postgres.

4. **Chạy server**:
   ```bash
   node index.js
   ```
   Server sẽ chạy tại: `http://localhost:5000`

## API Endpoints
- **POST /login/**: Đăng nhập (Mock admin/admin).
- **GET /workers/**: Lấy danh sách NLĐ.
- **POST /workers/**: Thêm NLĐ.
- **PATCH /workers/:id**: Cập nhật NLĐ.
- **DELETE /workers/:id**: Xóa NLĐ.
- **GET /rooms/**: Lấy danh sách phòng.
- **... (các routes khác tương tự)**

## Cấu trúc thư mục
- `config/`: Cấu hình DB.
- `controllers/`: Xử lý logic nghiệp vụ.
- `routes/`: Định nghĩa các endpoint.
- `middleware/`: Xử lý xác thực (Application Key & JWT).
