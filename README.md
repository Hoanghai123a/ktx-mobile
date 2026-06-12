# ktx-mobile

Ung dung quan ly KTX/NLD chay tren React + Vite, du lieu PocketBase local.

Kien truc production muc tieu:

- User -> Cloudflare DNS -> Cloudflare Tunnel -> app Node/PM2 `127.0.0.1:3001`
- App Node/PM2 serve web va proxy same-origin `/api/public/pb/...`
- PocketBase chi nghe local tai `127.0.0.1:8091`

## Yeu cau

- Node.js 20+
- npm 10+
- PocketBase local tai `http://127.0.0.1:8091`
- PM2 neu muon chay production local

## Cai dat

```bash
npm install
```

## Env local

Root `.env`:

```env
VITE_POCKETBASE_URL=/api/public/pb
VITE_POCKETBASE_PROXY_TARGET=http://127.0.0.1:8091
VITE_DEBUGMODE=development
VITE_PORT=5174
```

## Chay dev

```bash
npm run dev
```

Frontend: `http://127.0.0.1:5174/`

## Chay local bang PM2

PocketBase can chay truoc tai `http://127.0.0.1:8091`.

```bash
npm run pm2:start
```

Lenh huu ich:

```bash
npm run pm2:restart
npm run pm2:logs
npm run pm2:stop
npm run pm2:delete
```

PM2 app: `QLKTX` tai `http://127.0.0.1:3001`.

PM2 chay file `pm2_worker.js`. File nay serve thu muc `dist/`, fallback SPA ve `dist/index.html`, va proxy `/api/public/pb` sang PocketBase local.

## PocketBase register rule

Vao PocketBase Admin UI > Collections > `users` > API rules, mo Create rule de frontend co the dang ky user truc tiep. Neu app dang bat duyet user, tai khoan moi van se cho admin phe duyet theo `system_settings.key = "auth"`.

## Scripts

- `npm run dev`: chay Vite dev server
- `npm run build`: build production
- `npm run preview`: preview ban build
- `npm run lint`: kiem tra ESLint
- `npm test`: chay frontend tests

## Ghi chu

- Khong commit `.env`.
- Khi doi schema PocketBase, cap nhat collection truoc khi test app.
- App co manifest PWA `display: standalone`, nen khi cai ra man hinh chinh se mo nhu app rieng neu trinh duyet/OS ho tro.
