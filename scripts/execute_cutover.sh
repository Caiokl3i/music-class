#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Music Class V2 — Production Cutover Executor (Phase 7 / Section 12.6)
# ==============================================================================
# Automates the official Production Cutover database migration with strict
# guardrails:
#   1. Explicit confirmation check (CONFIRM_PRODUCTION_CUTOVER=YES)
#   2. Immutable Pre-Cutover Final V1 Backup (.dump + .sha256)
#   3. Full Migration + V2 Schema Upgrade + RLS & Parity Verification (:5432)
#   4. Supavisor Runtime Pooler (:6543) Parity Verification (if configured)
#   5. Optional Live API Full Cutover Smoke Test (if PROD_API_URL is set)
#
# Required env vars:
#   CONFIRM_PRODUCTION_CUTOVER=YES
#   SOURCE_DATABASE_URL     Frozen/Read-only V1 PostgreSQL URL (Neon/Render)
#   SUPABASE_DIRECT_URL     Supabase Production Direct/Session URL (port 5432)
#
# Optional env vars:
#   SUPABASE_POOLER_URL     Supabase Production Transaction Pooler URL (port 6543)
#   PROD_API_URL            Deployed Vercel V2 API URL for post-migrate smoke test
#   BACKUP_DIR              Directory to store final V1 backup & audit log (./backups)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%SZ")"

if [ "${CONFIRM_PRODUCTION_CUTOVER:-}" != "YES" ]; then
  echo "❌ Operação bloqueada por segurança." >&2
  echo "   Confirme primeiro que a V1 está em modo somente leitura (APP_READ_ONLY=true)" >&2
  echo "   e que o Render está fixado em release/v1 (Auto-Deploy de master desativado)." >&2
  echo "   Em seguida, execute com: CONFIRM_PRODUCTION_CUTOVER=YES npm run cutover:execute" >&2
  exit 1
fi

SOURCE_URL="${SOURCE_DATABASE_URL:-}"
DIRECT_URL="${SUPABASE_DIRECT_URL:-${TARGET_DIRECT_URL:-}}"
POOLER_URL="${SUPABASE_POOLER_URL:-}"

if [ -z "$SOURCE_URL" ] || [ -z "$DIRECT_URL" ]; then
  echo "❌ Error: SOURCE_DATABASE_URL e SUPABASE_DIRECT_URL são obrigatórias." >&2
  exit 1
fi

if [ "$SOURCE_URL" = "$DIRECT_URL" ]; then
  echo "❌ Error: SOURCE_DATABASE_URL e SUPABASE_DIRECT_URL não podem ser iguais!" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
FINAL_V1_DUMP="${BACKUP_DIR}/v1_pre_cutover_final_${TIMESTAMP}.dump"
AUDIT_LOG="${BACKUP_DIR}/cutover_execution_${TIMESTAMP}.log"

exec > >(tee -a "$AUDIT_LOG") 2>&1

echo "========================================================================"
echo "🚨 MUSIC CLASS V2 — EXECUÇÃO OFICIAL DE CUTOVER (FASE 7)"
echo "   Timestamp UTC : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "   Backup Final  : ${FINAL_V1_DUMP}"
echo "   Log Auditoria : ${AUDIT_LOG}"
echo "========================================================================"

echo ""
echo "📦 [Passo 1/4] Gerando Backup Final Congelado da V1 com assinatura SHA-256..."
pg_dump "$SOURCE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$FINAL_V1_DUMP"

pg_restore --list "$FINAL_V1_DUMP" >/dev/null
sha256sum "$FINAL_V1_DUMP" > "${FINAL_V1_DUMP}.sha256"
echo "✅ Backup final arquivado e verificado: $(cat "${FINAL_V1_DUMP}.sha256")"

echo ""
echo "🚀 [Passo 2/4] Executando migração V1 -> Supabase Produção (porta 5432), migrations V2 e RLS..."
ANONYMIZE_STAGING=false \
SOURCE_DATABASE_URL="$SOURCE_URL" \
TARGET_DIRECT_URL="$DIRECT_URL" \
DUMP_OUTPUT_PATH="$FINAL_V1_DUMP" \
"${SCRIPT_DIR}/rehearse_cutover.sh"

echo ""
if [ -n "$POOLER_URL" ]; then
  echo "🔌 [Passo 3/4] Validando leitura e paridade através do Supavisor Pooler (porta 6543)..."
  (
    cd "$PROJECT_ROOT"
    SOURCE_DATABASE_URL="$SOURCE_URL" TARGET_DATABASE_URL="$POOLER_URL" \
      npm run --silent db:verify:parity -- --post-migrate
  )
  echo "✅ Pooler de runtime validado com 100% de paridade!"
else
  echo "ℹ️  [Passo 3/4] SUPABASE_POOLER_URL não informada; pulando checagem secundária via porta 6543."
fi

echo ""
if [ -n "${PROD_API_URL:-}" ]; then
  echo "🧪 [Passo 4/4] Executando Smoke Test Completo Pós-Cutover contra ${PROD_API_URL}..."
  (
    cd "$PROJECT_ROOT"
    TARGET_URL="$PROD_API_URL" npm run smoke:test -- --cutover-full
  )
else
  echo "ℹ️  [Passo 4/4] PROD_API_URL não informada. Assim que a API V2 estiver publicada na Vercel, rode:"
  echo "   TARGET_URL=\"https://<sua-api-vercel>\" SMOKE_TEST_EMAIL=\"...\" SMOKE_TEST_PASSWORD=\"...\" npm run smoke:test -- --cutover-full"
fi

echo ""
echo "========================================================================"
echo "🎉 CUTOVER DE BANCO CONCLUÍDO COM SUCESSO!"
echo "   Próximos passos imediatos (ver docs/CUTOVER_EXECUTION_GUIDE.md):"
echo "   1. Confirmar deploy da API V2 na Vercel e validar /health"
echo "   2. Apontar VITE_API_URL do Frontend na Vercel para a API V2 (Redeploy)"
echo "   3. Rodar npm run smoke:test -- --cutover-full contra a produção"
echo "   4. Manter V1 antiga preservada por 2 a 4 semanas antes de descomissionar"
echo "========================================================================"
