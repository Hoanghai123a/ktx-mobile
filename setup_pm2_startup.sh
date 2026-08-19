#!/usr/bin/env bash

# Run once on the server so PM2 recovers after a server reboot.
set -euo pipefail

PM2_USER="${PM2_USER:-${SUDO_USER:-$USER}}"
PM2_USER_HOME="${PM2_USER_HOME:-$(getent passwd "$PM2_USER" | cut -d: -f6)}"
PM2_HOME="${PM2_HOME:-$PM2_USER_HOME/.pm2}"
PM2_BIN="${PM2_BIN:-$(command -v pm2 || true)}"
SERVICE_NAME="pm2-${PM2_USER}"

if [[ -z "$PM2_USER_HOME" ]]; then
  echo "Cannot determine the home directory for user: $PM2_USER" >&2
  exit 1
fi
if [[ -z "$PM2_BIN" ]]; then
  echo "pm2 was not found in PATH. Install PM2 globally or set PM2_BIN." >&2
  exit 1
fi

run_as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

run_as_pm2_user() {
  if [[ "$(id -un)" = "$PM2_USER" ]]; then
    env "HOME=$PM2_USER_HOME" "PM2_HOME=$PM2_HOME" "PATH=$PATH" "$@"
  else
    sudo -u "$PM2_USER" env "HOME=$PM2_USER_HOME" "PM2_HOME=$PM2_HOME" "PATH=$PATH" "$@"
  fi
}

# Create the PM2 systemd service for the application user.
if [[ "$(id -u)" -eq 0 ]]; then
  env "PATH=$PATH" "$PM2_BIN" startup systemd -u "$PM2_USER" --hp "$PM2_USER_HOME" >/tmp/pm2-startup.log
else
  sudo env "PATH=$PATH" "$PM2_BIN" startup systemd -u "$PM2_USER" --hp "$PM2_USER_HOME" >/tmp/pm2-startup.log
fi

# Let systemd restart the PM2 daemon when it fails.
OVERRIDE_DIR="/etc/systemd/system/${SERVICE_NAME}.service.d"
OVERRIDE_FILE="${OVERRIDE_DIR}/restart.conf"
TEMP_OVERRIDE="$(mktemp)"
trap 'rm -f "$TEMP_OVERRIDE"' EXIT
cat > "$TEMP_OVERRIDE" <<'EOF'
[Service]
Restart=on-failure
RestartSec=5s
EOF
run_as_root mkdir -p "$OVERRIDE_DIR"
run_as_root install -m 0644 "$TEMP_OVERRIDE" "$OVERRIDE_FILE"
run_as_root systemctl daemon-reload
run_as_root systemctl enable --now "$SERVICE_NAME"

# Save the process list for the application user, not root.
run_as_pm2_user "$PM2_BIN" save --force

printf 'PM2 startup and recovery configured for user %s.\n' "$PM2_USER"
printf 'Check: systemctl status %s --no-pager\n' "$SERVICE_NAME"
