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

log "Building production bundle."
npm run build:only

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  log "Restarting PM2 app $PM2_APP_NAME."
  pm2 restart "$PM2_APP_NAME" --update-env
else
  log "Starting PM2 app from ecosystem config."
  pm2 start ecosystem.config.cjs --update-env
fi

log "Saving PM2 process list."
pm2 save >/dev/null

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
