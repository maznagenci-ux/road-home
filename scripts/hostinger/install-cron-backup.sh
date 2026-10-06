#!/usr/bin/env bash
# Install daily cron: 02:30 local — backup DB
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/road-home}"
SCRIPT="$APP_DIR/scripts/hostinger/backup-db.sh"
mkdir -p /var/backups/road-home /var/log
chmod +x "$SCRIPT"

CRON_LINE="30 2 * * * APP_DIR=$APP_DIR bash $SCRIPT >/dev/null 2>&1"
EXISTING="$(crontab -l 2>/dev/null || true)"
if echo "$EXISTING" | grep -Fq "$SCRIPT"; then
  echo "cron already installed for backup-db.sh"
else
  (echo "$EXISTING"; echo "$CRON_LINE") | crontab -
  echo "installed: $CRON_LINE"
fi

# run once now to verify
bash "$SCRIPT"
crontab -l | grep backup-db || true
echo BACKUP_CRON_OK
