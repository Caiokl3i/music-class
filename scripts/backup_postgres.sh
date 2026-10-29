#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Automated PostgreSQL Backup Script
# Creates a compressed PostgreSQL dump and optionally uploads to S3-compatible
# object storage (Cloudflare R2, Backblaze B2, AWS S3) with retention policy.
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILENAME="music_class_${TIMESTAMP}.dump"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Resolve Database Connection String
DB_URL="${DATABASE_DIRECT_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo "❌ Error: Neither DATABASE_DIRECT_URL nor DATABASE_URL is set." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "📦 [1/3] Generating PostgreSQL custom-format dump..."
# Use pg_dump with custom format (-Fc) for compression and flexible pg_restore
pg_dump "$DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILEPATH"

FILE_SIZE=$(du -h "$BACKUP_FILEPATH" | cut -f1)
echo "✅ [1/3] Backup generated successfully: ${BACKUP_FILEPATH} (${FILE_SIZE})"

# Optional upload to S3-compatible storage
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "☁️  [2/3] Uploading to S3-compatible object storage (Bucket: ${BACKUP_S3_BUCKET})..."
  
  S3_ENDPOINT_FLAG=""
  if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
    S3_ENDPOINT_FLAG="--endpoint-url=${BACKUP_S3_ENDPOINT}"
  fi

  if command -v aws >/dev/null 2>&1; then
    # shellcheck disable=SC2086
    aws s3 cp "$BACKUP_FILEPATH" "s3://${BACKUP_S3_BUCKET}/backups/${BACKUP_FILENAME}" $S3_ENDPOINT_FLAG
    echo "✅ [2/3] Upload completed via AWS CLI."
  else
    echo "⚠️  AWS CLI not found. Skipping remote upload. Backup preserved locally at ${BACKUP_FILEPATH}."
  fi
else
  echo "ℹ️  [2/3] Remote storage not configured (BACKUP_S3_BUCKET unset). Storing locally."
fi

# Retention policy: Prune local dumps older than RETENTION_DAYS
echo "🧹 [3/3] Applying retention policy (keeping last ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -type f -name "music_class_*.dump" -mtime +"$RETENTION_DAYS" -exec rm -f {} + 2>/dev/null || true
echo "✅ [3/3] Retention pruning complete."

echo "🎉 Backup process finished successfully at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
