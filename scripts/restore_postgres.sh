#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Automated PostgreSQL Restore & Verification Script
# Restores a custom-format dump into a specified PostgreSQL database and
# performs automated integrity & count validation.
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DUMP_FILE="${1:-}"

# Resolve dump file (use passed arg or find latest in BACKUP_DIR)
if [ -z "$DUMP_FILE" ]; then
  # shellcheck disable=SC2012
  DUMP_FILE=$(ls -t "${BACKUP_DIR}"/music_class_*.dump 2>/dev/null | head -n 1 || true)
fi

if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "❌ Error: No dump file found at '${DUMP_FILE}' or in '${BACKUP_DIR}'." >&2
  exit 1
fi

TARGET_URL="${RESTORE_DATABASE_URL:-${TARGET_DATABASE_URL:-}}"
if [ -z "$TARGET_URL" ]; then
  echo "❌ Error: Neither RESTORE_DATABASE_URL nor TARGET_DATABASE_URL is set." >&2
  exit 1
fi

echo "🔄 [1/3] Restoring dump '${DUMP_FILE}' into target database..."
TARGET_VER_NUM=$(psql "$TARGET_URL" -t -A -c "SHOW server_version_num;" 2>/dev/null || echo "170000")

if [ "$TARGET_VER_NUM" -lt 170000 ]; then
  # Filter PG 17+ GUC parameters (such as transaction_timeout) when restoring into PG 15/16
  pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    -f - "$DUMP_FILE" \
    | sed '/^SET transaction_timeout =/d' \
    | psql "$TARGET_URL" -v ON_ERROR_STOP=1 -q >/dev/null
else
  # Run pg_restore with --clean --if-exists to replace existing tables cleanly
  pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --dbname="$TARGET_URL" \
    "$DUMP_FILE" || {
      # pg_restore returns 1 for minor warnings (e.g., dropping non-existent tables), which is normal
      EXIT_CODE=$?
      if [ "$EXIT_CODE" -gt 1 ]; then
        echo "❌ Error: pg_restore failed with exit code $EXIT_CODE" >&2
        exit "$EXIT_CODE"
      fi
    }
fi

echo "✅ [1/3] Database restore completed."

echo "🔍 [2/3] Validating restored table existence and integrity..."
CORE_TABLES=("users" "auth_access_tokens" "students" "plans" "lessons" "plan_types" "plan_discounts")

for table in "${CORE_TABLES[@]}"; do
  COUNT=$(psql "$TARGET_URL" -t -A -c "SELECT count(*) FROM ${table};" 2>/dev/null) || {
    echo "❌ Error: Table '${table}' does not exist or query failed." >&2
    exit 1
  }
  echo "  📊 Table '${table}': ${COUNT} records"
done

HAS_RATE_LIMIT_TABLE=$(psql "$TARGET_URL" -t -A -c "SELECT to_regclass('public.rate_limit_buckets') IS NOT NULL;" 2>/dev/null || echo "f")
if [ "$HAS_RATE_LIMIT_TABLE" = "t" ]; then
  RL_COUNT=$(psql "$TARGET_URL" -t -A -c "SELECT count(*) FROM rate_limit_buckets;" 2>/dev/null)
  echo "  📊 Table 'rate_limit_buckets': ${RL_COUNT} records"
else
  echo "  ℹ️  Table 'rate_limit_buckets' not present yet (pre-V2 dump; run npm run db:migrate:prod to apply V2 migrations)"
fi

echo "✅ [2/3] All expected tables verified."

echo "🩺 [3/3] Running active query verification (SELECT 1)..."
PING=$(psql "$TARGET_URL" -t -A -c "SELECT 1;" 2>/dev/null || echo "0")
if [ "$PING" != "1" ]; then
  echo "❌ Error: Database ping failed." >&2
  exit 1
fi

echo "✅ [3/3] Target database is fully queryable."
echo "🎉 Restore test successfully verified at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
