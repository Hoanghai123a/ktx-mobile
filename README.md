# ktx-mobile

Ung dung quan ly KTX/NLD chay tren React + Vite, du lieu PocketBase local.

## Kien truc production

- User -> Cloudflare DNS -> Cloudflare Tunnel -> app Node/PM2 `127.0.0.1:3001`
- App Node/PM2 serve web va proxy same-origin `/api/public/pb/...`
- PocketBase chi nghe local tai `127.0.0.1:8091`

## Cau hinh PM2 de tu khoi phuc

Du an da co san:

- `ecosystem.config.cjs`: cwd tuyet doi theo thu muc du an, tu restart khi crash, restart delay/backoff, gioi han memory va dong ket noi an toan khi deploy.
- `deploy_app.sh`: start/restart theo ecosystem, kiem tra app da online, luu process list bang `pm2 save --force`.
- `setup_pm2_startup.sh`: dang ky PM2 voi systemd de tu chay lai sau khi server reboot; systemd cung tu restart PM2 daemon neu daemon loi.

### 1. Cai dat mot lan tren server

Chay bang user se van hanh ung dung, hoac chi ro user bang `PM2_USER`:

```bash
cd /duong-dan/ktx-mobile
PM2_USER=ubuntu bash setup_pm2_startup.sh
```

Script nay can `sudo` de tao service systemd. Neu PM2 khong nam trong PATH cua shell hien tai, dat them `PM2_BIN` tro toi file `pm2`.

### 2. Khoi tao va luu ung dung

```bash
cd /duong-dan/ktx-mobile
npm ci
npm run pm2:start
pm2 save --force
```

Khong chay `pm2 start pm2_worker.js` thu cong voi mot thu muc hien hanh khac; hay dung ecosystem config de giu dung `cwd`, port va PocketBase URL.

### 3. Kiem tra hang ngay

```bash
pm2 status
pm2 describe QLKTX
pm2 logs QLKTX --lines 200
systemctl status pm2-ubuntu --no-pager
```

Doi `pm2-ubuntu` theo gia tri `PM2_USER` thuc te. Neu app khong online, xem them:

```bash
pm2 monit
free -h
journalctl -u pm2-ubuntu -n 200 --no-pager
```

### 4. Deploy an toan

```bash
cd /duong-dan/ktx-mobile
bash deploy_app.sh
```

Script se build, start/restart PM2, luu process list, xac nhan app online va kiem tra web cung proxy PocketBase. Neu health check that bai, khong coi deploy la thanh cong.

### 5. Khi server reboot

PM2 se tu phuc hoi danh sach da luu. Kiem tra sau khi server len lai:

```bash
pm2 status
curl -fsS http://127.0.0.1:3001/ >/dev/null && echo OK
curl -fsS http://127.0.0.1:3001/api/public/pb/api/health >/dev/null && echo PocketBase_OK
```

Neu danh sach bi mat do chay PM2 bang sai user, dung cung user da cau hinh startup:

```bash
PM2_USER=ubuntu bash setup_pm2_startup.sh
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save --force
```

## Xu ly truong hop PM2 tu dung

1. Xem ly do trong log: `pm2 logs QLKTX --lines 200`.
2. Kiem tra OOM: `free -h`, `dmesg -T | grep -i -E 'out of memory|killed process'`.
3. Kiem tra app co dang dung thu cong khong: `pm2 describe QLKTX`.
4. Neu PM2 daemon dung: `sudo systemctl restart pm2-ubuntu`.
5. Neu PocketBase dung, khoi dong lai PocketBase service truoc; PM2 chi proxy den `127.0.0.1:8091`.

`max_memory_restart` hien dat `300M`. Neu server nho, giam nguong sau khi do memory thuc te; neu server du RAM nhung app build nang, khong tang tuy tien ma hay xem memory leak truoc.

## PocketBase can sua gi?

Khong can sua collection, API rule hay schema PocketBase cho thay doi PM2 nay. Chi can dam bao:

- PocketBase chay nhu mot service rieng va tu khoi dong cung server.
- PocketBase lang nghe tai `127.0.0.1:8091`, dung voi `POCKETBASE_URL` trong ecosystem.
- Health endpoint `/api/health` tra ve thanh cong.

Neu PocketBase dang chay bang lenh thu cong, hay tao mot service systemd rieng cho PocketBase; khong gop PocketBase vao PM2, de khi frontend restart khong lam anh huong database backend.

## Lenh phat trien

```bash
npm run dev              # Vite dev server
npm run build:only       # Chi build production, khong tac dong PM2
npm run pm2:start        # Build, start/restart va luu PM2
npm run pm2:restart      # Build, restart va luu PM2
npm run pm2:reload       # Reload va luu PM2
npm run pm2:status       # Xem trang thai QLKTX
npm run pm2:logs         # Xem log PM2
npm run lint             # Kiem tra ESLint
npm test                 # Chay frontend tests
```

Khong commit `.env`. Khi doi schema PocketBase, cap nhat collection truoc khi test app.
