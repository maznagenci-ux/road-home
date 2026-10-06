#!/usr/bin/env bash
# Daily Postgres backup for Road Home (Hostinger VPS).
# Keeps last 14 dumps. Logs to /var/log/road-home-backup.log
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/road-home}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/road-home}"
KEEP="${KEEP:-14}"
LOG="${LOG:-/var/log/road-home-backup.log}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/road-home-${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "[$(date -Is)] ERROR: missing $APP_DIR/.env" | tee -a "$LOG"
  exit 1
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source <(grep -E '^(DATABASE_URL)=' .env | sed 's/\r$//')
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[$(date -Is)] ERROR: DATABASE_URL empty" | tee -a "$LOG"
  exit 1
fi

# pg_dump rejects Prisma-style ?schema= query; strip query string for dump only
DUMP_URL="${DATABASE_URL%%\?*}"

echo "[$(date -Is)] backup start → $OUT" | tee -a "$LOG"
if pg_dump --no-owner --no-acl "$DUMP_URL" | gzip -c >"$OUT"; then
  BYTES=$(wc -c <"$OUT" | tr -d ' ')
  if [[ "$BYTES" -lt 200 ]]; then
    echo "[$(date -Is)] ERROR: dump too small ($BYTES bytes)" | tee -a "$LOG"
    rm -f "$OUT"
    exit 1
  fi
  echo "[$(date -Is)] OK size=${BYTES}" | tee -a "$LOG"
else
  echo "[$(date -Is)] ERROR: pg_dump failed" | tee -a "$LOG"
  rm -f "$OUT"
  exit 1
fi

# prune old
ls -1t "$BACKUP_DIR"/road-home-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f

# light restore-check: gzip magic + min size already validated
if gzip -t "$OUT" 2>/dev/null; then
  echo "[$(date -Is)] restore-check: gzip integrity OK" | tee -a "$LOG"
else
  echo "[$(date -Is)] WARN: gzip integrity check failed" | tee -a "$LOG"
fi

echo "[$(date -Is)] DONE" | tee -a "$LOG"
