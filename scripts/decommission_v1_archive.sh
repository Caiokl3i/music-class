#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Music Class V2 — Legacy V1 Final Archive & Decommissioning Script (Phase 7.7)
# ==============================================================================
# Run ONLY after 2 to 4 weeks of stable V2 operation in production, immediately
# before shutting down the legacy Render service and Neon V1 PostgreSQL database.
#
# Generates:
#   - v1_decommission_final_<timestamp>.dump     (Custom compressed PG dump)
#   - v1_decommission_final_<timestamp>.dump.sha256
#   - v1_decommission_final_<timestamp>.manifest.txt (Row counts & SUM(price))
#   - Optional upload to S3 / Cloudflare R2 archive path
#
# Required env vars:
#   LEGACY_V1_DATABASE_URL  Connection string of the legacy V1 PostgreSQL
# ==============================================================================

LEGACY_URL="${LEGACY_V1_DATABASE_URL:-${SOURCE_DATABASE_URL:-}}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%SZ")"

if [ -z "$LEGACY_URL" ]; then
  echo "❌ Error: LEGACY_V1_DATABASE_URL must be set." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
BASE_NAME="v1_decommission_final_${TIMESTAMP}"
DUMP_PATH="${BACKUP_DIR}/${BASE_NAME}.dump"
SHA_PATH="${DUMP_PATH}.sha256"
MANIFEST_PATH="${BACKUP_DIR}/${BASE_NAME}.manifest.txt"

echo "🏛️  [1/4] Extraindo arquivo histórico final da V1 antes do descomissionamento..."
pg_dump "$LEGACY_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$DUMP_PATH"

echo "🔍 [2/4] Validando integridade estrutural do dump e calculando SHA-256..."
TOC_ENTRIES="$(pg_restore --list "$DUMP_PATH" | grep -c '^[^;]' || true)"
sha256sum "$DUMP_PATH" > "$SHA_PATH"

echo "📋 [3/4] Gerando manifesto contábil e de registros (${MANIFEST_PATH})..."
{
  echo "Music Class — Manifesto Final de Descomissionamento da Infraestrutura V1"
  echo "Gerado em (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Arquivo Dump   : ${BASE_NAME}.dump ($(du -h "$DUMP_PATH" | cut -f1))"
  echo "Entradas TOC   : ${TOC_ENTRIES}"
  echo "SHA-256        : $(cut -d' ' -f1 "$SHA_PATH")"
  echo "------------------------------------------------------------------------"
  for table in users students plans lessons plan_types plan_discounts auth_access_tokens adonis_schema; do
    cnt="$(psql "$LEGACY_URL" -t -A -c "SELECT COUNT(*) FROM public.${table};")"
    printf "%-22s : %s\n" "$table" "$cnt"
  done
  price_sum="$(psql "$LEGACY_URL" -t -A -c "SELECT COALESCE(SUM(price), 0)::numeric(14,2) FROM public.plans;")"
  discount_sum="$(psql "$LEGACY_URL" -t -A -c "SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM public.plan_discounts;")"
  echo "------------------------------------------------------------------------"
  echo "plans.SUM(price)       : R$ ${price_sum}"
  echo "discounts.SUM(amount)  : R$ ${discount_sum}"
} > "$MANIFEST_PATH"

cat "$MANIFEST_PATH"

if [ -n "${BACKUP_S3_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
  echo "☁️  [4/4] Arquivando dump e manifesto permanente no bucket ${BACKUP_S3_BUCKET}..."
  S3_ENDPOINT_FLAG=""
  if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
    S3_ENDPOINT_FLAG="--endpoint-url=${BACKUP_S3_ENDPOINT}"
  fi
  # shellcheck disable=SC2086
  aws s3 cp "$DUMP_PATH" "s3://${BACKUP_S3_BUCKET}/archive/v1/${BASE_NAME}.dump" $S3_ENDPOINT_FLAG
  # shellcheck disable=SC2086
  aws s3 cp "$SHA_PATH" "s3://${BACKUP_S3_BUCKET}/archive/v1/${BASE_NAME}.dump.sha256" $S3_ENDPOINT_FLAG
  # shellcheck disable=SC2086
  aws s3 cp "$MANIFEST_PATH" "s3://${BACKUP_S3_BUCKET}/archive/v1/${BASE_NAME}.manifest.txt" $S3_ENDPOINT_FLAG
  echo "✅ [4/4] Cópia fria enviada para s3://${BACKUP_S3_BUCKET}/archive/v1/"
else
  echo "ℹ️  [4/4] Upload S3 não configurado; guarde ${DUMP_PATH}, ${SHA_PATH} e ${MANIFEST_PATH} em local seguro externo."
fi

echo "🎉 Arquivo final da V1 concluído. Agora é seguro desligar o serviço antigo no Render/Neon."
