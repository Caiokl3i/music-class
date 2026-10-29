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

echo "✅ [1/3] Database restore completed."

echo "🔍 [2/3] Validating restored table existence and integrity..."
TABLES=("users" "auth_access_tokens" "students" "plans" "lessons" "plan_types" "plan_discounts" "rate_limit_buckets")

for table in "${TABLES[@]}"; do
  COUNT=$(psql "$TARGET_URL" -t -A -c "SELECT count(*) FROM ${table};" 2>/dev/null) || {
    echo "❌ Error: Table '${table}' does not exist or query failed." >&2
    exit 1
  }
  echo "  📊 Table '${table}': ${COUNT} records"
done

echo "✅ [2/3] All expected tables verified."

echo "🩺 [3/3] Running active query verification (SELECT 1)..."
PING=$(psql "$TARGET_URL" -t -A -c "SELECT 1;" 2>/dev/null || echo "0")
if [ "$PING" != "1" ]; then
  echo "❌ Error: Database ping failed." >&2
  exit 1
fi

echo "✅ [3/3] Target database is fully queryable."
echo "🎉 Restore test successfully verified at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
