#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM2_APP_NAME="${PM2_APP_NAME:-QLKTX}"
APP_HEALTH_URL="${APP_HEALTH_URL:-http://127.0.0.1:3001}"
PB_PROXY_HEALTH_URL="${PB_PROXY_HEALTH_URL:-http://127.0.0.1:3001/api/public/pb/api/health}"
BACKUP_ROOT="${BACKUP_ROOT:-$APP_DIR/.deploy-backups}"
TIMESTAMP="$(date +%F-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
STASH_NAME="deploy-app-$TIMESTAMP"
NEEDS_STASH=0
HAD_ENV_BACKUP=0

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

restore_env() {
  if [[ "$HAD_ENV_BACKUP" -eq 1 && -f "$BACKUP_DIR/.env" ]]; then
    cp "$BACKUP_DIR/.env" "$APP_DIR/.env"
    log "Restored server .env from backup."
  fi
}

trap 'status=$?; if [[ $status -ne 0 ]]; then log "Deploy stopped at step failure. Check output above."; fi; exit $status' EXIT

require_cmd git
require_cmd npm
require_cmd pm2
require_cmd curl

cd "$APP_DIR"

mkdir -p "$BACKUP_DIR"

log "Checking for local changes in server-only files."
if ! git diff --quiet -- .env; then
  cp .env "$BACKUP_DIR/.env"
  HAD_ENV_BACKUP=1
  NEEDS_STASH=1
  log "Backed up local .env to $BACKUP_DIR/.env"
fi

if ! git diff --quiet -- pm2_worker.js; then
  cp pm2_worker.js "$BACKUP_DIR/pm2_worker.js"
  NEEDS_STASH=1
  log "Backed up local pm2_worker.js to $BACKUP_DIR/pm2_worker.js"
fi

if [[ "$NEEDS_STASH" -eq 1 ]]; then
  log "Stashing local changes in .env and/or pm2_worker.js before pull."
  git stash push -m "$STASH_NAME" -- .env pm2_worker.js >/dev/null
fi

log "Pulling latest code."
git pull --ff-only

if [[ "$HAD_ENV_BACKUP" -eq 1 ]]; then
  restore_env
fi

log "Installing dependencies."
npm ci

log "Generating build-version.json."
VERSION_DAY="$(date +%m.%d)"
LAST_DAY=""
LAST_COUNT="0"
if [ -f build-version.json ] && command -v jq >/dev/null 2>&1; then
  LAST_DAY="$(jq -r '.day // ""' build-version.json 2>/dev/null || true)"
  LAST_COUNT="$(jq -r '.count // 0' build-version.json 2>/dev/null || echo 0)"
fi
if [ "$LAST_DAY" = "$VERSION_DAY" ]; then
  VERSION_COUNT="$((LAST_COUNT + 1))"
else
  VERSION_COUNT="1"
fi
printf '{\n  "day": "%s",\n  "count": %s\n}\n' "$VERSION_DAY" "$VERSION_COUNT" > build-version.json
log "build-version.json: day=$VERSION_DAY count=$VERSION_COUNT"

log "Building production bundle."
npm run build:only

log "Starting or restarting PM2 app from ecosystem config."
pm2 startOrRestart ecosystem.config.cjs --update-env

log "Saving PM2 process list for reboot recovery."
pm2 save --force >/dev/null

if ! pm2 jlist | node -e 'let s=""; process.stdin.on("data", c => s += c).on("end", () => { const apps = JSON.parse(s); const app = apps.find(item => item.name === process.argv[1]); process.exit(app?.pm2_env?.status === "online" ? 0 : 1); });' "$PM2_APP_NAME"; then
  fail "PM2 app $PM2_APP_NAME is not online after restart."
fi

log "Checking web health: $APP_HEALTH_URL"
curl --fail --silent --show-error "$APP_HEALTH_URL" >/dev/null

log "Checking PocketBase proxy health: $PB_PROXY_HEALTH_URL"
curl --fail --silent --show-error "$PB_PROXY_HEALTH_URL" >/dev/null

log "Deploy completed successfully."
log "Backup directory: $BACKUP_DIR"

if [[ "$NEEDS_STASH" -eq 1 ]]; then
  log "A git stash was created: $STASH_NAME"
  log "Review it with: git stash list"
fi
