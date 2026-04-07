# ktx-mobile

Ứng dụng quản lý KTX/NLĐ chạy trên React + Vite, dùng Node.js/Express + PostgreSQL làm backend (qua `/api` proxy).

## Stack chính

- React 19 + Vite
- Node.js/Express + PostgreSQL (backend)
- Tailwind CSS
- Recharts
- XLSX (import/export Excel)

## Yêu cầu

- Node.js 20+
- npm 10+

## Cài đặt

```bash
npm install
```

## Cấu hình môi trường

Tạo file `.env` ở thư mục gốc:

```env
VITE_HOST=/api/
VITE_KEY=your_application_key
VITE_DEBUGMODE=development
```

## Chạy dự án

```bash
npm run dev
```

## Scripts

- `npm run dev`: chạy local dev server
- `npm run build`: build production
- `npm run preview`: preview bản build
- `npm run lint`: kiểm tra ESLint

## Cấu trúc thư mục

- `src/features`: các màn hình và modal theo domain nghiệp vụ
- `src/services`: lớp thao tác dữ liệu qua API backend + import/export
- `src/components/ui`: UI components dùng lại

## Ghi chú

- Không commit file `.env`.
- Khi thay đổi logic import/export hoặc mutation dữ liệu, nên chạy `npm run lint` trước khi commit.
