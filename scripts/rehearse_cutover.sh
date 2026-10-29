#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Music Class V2 — Timed Cutover & Migration Rehearsal Orchestrator (Phase 6/7)
# ==============================================================================
# Executes and times the complete data migration flow from V1 (Neon/Render PG)
# to V2 (Supabase PG), handling cross-version PG 18 -> PG 15/16/17 compatibility,
# optional staging PII anonymization, pre-migration parity verification,
# pending V2 migrations (db:migrate:prod), and post-migration RLS/parity checks.
#
# Required env vars:
#   SOURCE_DATABASE_URL  Connection string of V1 source PostgreSQL (read-only/frozen)
#   TARGET_DIRECT_URL    Direct (port 5432) connection string of V2 target PostgreSQL
#
# Optional env vars:
#   ANONYMIZE_STAGING    Set to "true" ONLY when restoring into Staging
#   DUMP_OUTPUT_PATH     Custom path for generated dump file (defaults to tmp file)
# ==============================================================================

SOURCE_URL="${SOURCE_DATABASE_URL:-}"
TARGET_URL="${TARGET_DIRECT_URL:-${TARGET_DATABASE_URL:-}}"
ANONYMIZE="${ANONYMIZE_STAGING:-false}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -z "$SOURCE_URL" ] || [ -z "$TARGET_URL" ]; then
  echo "❌ Error: SOURCE_DATABASE_URL and TARGET_DIRECT_URL must be set." >&2
  exit 1
fi

if [ "$SOURCE_URL" = "$TARGET_URL" ]; then
  echo "❌ Error: SOURCE_DATABASE_URL and TARGET_DIRECT_URL cannot be identical!" >&2
  exit 1
fi

mkdir -p "${PROJECT_ROOT}/tmp"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%SZ")"
DUMP_FILE="${DUMP_OUTPUT_PATH:-${PROJECT_ROOT}/tmp/rehearsal_${TIMESTAMP}.dump}"

now_ms() {
  date +%s%3N
}

TOTAL_START_MS="$(now_ms)"

echo "========================================================================"
echo "🚀 Music Class V2 — Ensaio / Execução Cronometrada de Migração"
echo "   Início (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "   Anonimização Staging: ${ANONYMIZE}"
echo "========================================================================"

# 1. Pre-flight check
STEP_START="$(now_ms)"
SOURCE_VER="$(psql "$SOURCE_URL" -t -A -c "SHOW server_version;")"
TARGET_VER="$(psql "$TARGET_URL" -t -A -c "SHOW server_version;")"
TARGET_VER_NUM="$(psql "$TARGET_URL" -t -A -c "SHOW server_version_num;")"
PREFLIGHT_MS=$(( $(now_ms) - STEP_START ))
echo "✅ [1/6] Conectividade validada (${PREFLIGHT_MS} ms) | Origem PG ${SOURCE_VER} -> Destino PG ${TARGET_VER}"

# 2. pg_dump from Source
STEP_START="$(now_ms)"
pg_dump "$SOURCE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"
DUMP_MS=$(( $(now_ms) - STEP_START ))
DUMP_SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
echo "✅ [2/6] pg_dump concluído (${DUMP_MS} ms) | Arquivo: ${DUMP_FILE} (${DUMP_SIZE})"

# 3. pg_restore into Target (handling PG 17/18 -> PG 15/16 GUC compatibility)
STEP_START="$(now_ms)"
if [ "$TARGET_VER_NUM" -lt 170000 ]; then
  echo "ℹ️  Destino PG < 17 detectado (${TARGET_VER}); aplicando filtro cross-version para transaction_timeout..."
  pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    -f - "$DUMP_FILE" \
    | sed '/^SET transaction_timeout =/d' \
    | psql "$TARGET_URL" -v ON_ERROR_STOP=1 -q >/dev/null
else
  pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --dbname="$TARGET_URL" \
    "$DUMP_FILE" || {
      EXIT_CODE=$?
      if [ "$EXIT_CODE" -gt 1 ]; then
        echo "❌ Error: pg_restore falhou com código $EXIT_CODE" >&2
        exit "$EXIT_CODE"
      fi
    }
fi
RESTORE_MS=$(( $(now_ms) - STEP_START ))
echo "✅ [3/6] pg_restore concluído no destino (${RESTORE_MS} ms)"

# 4. Optional Staging Anonymization
ANON_MS=0
if [ "$ANONYMIZE" = "true" ] || [ "$ANONYMIZE" = "1" ]; then
  STEP_START="$(now_ms)"
  psql "$TARGET_URL" -v ON_ERROR_STOP=1 -q -f "${SCRIPT_DIR}/anonymize_staging.sql"
  ANON_MS=$(( $(now_ms) - STEP_START ))
  echo "✅ [3.5/6] Anonimização de PII (Staging) aplicada (${ANON_MS} ms)"
fi

# 5. Pre-migration Parity Check (V1 tables + financial sums)
STEP_START="$(now_ms)"
(
  cd "$PROJECT_ROOT"
  SOURCE_DATABASE_URL="$SOURCE_URL" TARGET_DATABASE_URL="$TARGET_URL" \
    npm run --silent db:verify:parity
)
PARITY_PRE_MS=$(( $(now_ms) - STEP_START ))
echo "✅ [4/6] Paridade pré-migration validada (${PARITY_PRE_MS} ms)"

# 6. Run Pending V2 Migrations against Target Direct URL
STEP_START="$(now_ms)"
(
  cd "$PROJECT_ROOT"
  NODE_ENV=production \
  APP_KEY="${APP_KEY:-rehearsal_temp_app_key_32_chars_minimum}" \
  APP_URL="${APP_URL:-http://localhost:3333}" \
  HOST="${HOST:-localhost}" \
  PORT="${PORT:-3333}" \
  LOG_LEVEL="${LOG_LEVEL:-info}" \
  SESSION_DRIVER="${SESSION_DRIVER:-cookie}" \
  DB_CONNECTION=pg \
  DATABASE_URL="$TARGET_URL" \
  DATABASE_DIRECT_URL="$TARGET_URL" \
  npm run --silent db:migrate:prod
)
MIGRATE_MS=$(( $(now_ms) - STEP_START ))
echo "✅ [5/6] Migrations pendentes da V2 aplicadas (${MIGRATE_MS} ms)"

# 7. Post-migration Parity + RLS + Financial Constraints Check
STEP_START="$(now_ms)"
(
  cd "$PROJECT_ROOT"
  SOURCE_DATABASE_URL="$SOURCE_URL" TARGET_DATABASE_URL="$TARGET_URL" \
    npm run --silent db:verify:parity -- --post-migrate
)
PARITY_POST_MS=$(( $(now_ms) - STEP_START ))
echo "✅ [6/6] Paridade pós-migration + RLS + Constraints validados (${PARITY_POST_MS} ms)"

TOTAL_MS=$(( $(now_ms) - TOTAL_START_MS ))

echo "========================================================================"
echo "⏱️  RESUMO CRONOMETRADO DA MIGRAÇÃO"
echo "------------------------------------------------------------------------"
printf "  1. Pre-flight check          : %6d ms\n" "$PREFLIGHT_MS"
printf "  2. pg_dump (origem)          : %6d ms\n" "$DUMP_MS"
printf "  3. pg_restore (destino)      : %6d ms\n" "$RESTORE_MS"
if [ "$ANON_MS" -gt 0 ]; then
  printf "  3.5 Anonimização (staging)   : %6d ms\n" "$ANON_MS"
fi
printf "  4. Paridade pré-migration    : %6d ms\n" "$PARITY_PRE_MS"
printf "  5. Migrations V2 pendentes   : %6d ms\n" "$MIGRATE_MS"
printf "  6. Paridade pós + RLS        : %6d ms\n" "$PARITY_POST_MS"
echo "------------------------------------------------------------------------"
printf "  🏁 TEMPO TOTAL               : %6d ms (~%.2f s)\n" "$TOTAL_MS" "$(awk "BEGIN {printf \"%.2f\", ${TOTAL_MS}/1000}")"
echo "========================================================================"

