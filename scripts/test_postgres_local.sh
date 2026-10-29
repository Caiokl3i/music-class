#!/usr/bin/env bash
set -euo pipefail

PG_PORT="${PG_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
PG_TEST_DB="${PG_TEST_DB:-musicclass_test}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "🐘 Garantindo container PostgreSQL 17 local (docker compose up -d postgres)..."
  docker compose up -d postgres

  echo "⏳ Aguardando PostgreSQL ficar pronto na porta ${PG_PORT}..."
  for i in $(seq 1 30); do
    if docker compose exec -e PGPASSWORD="${PG_PASSWORD}" -T postgres psql -h 127.0.0.1 -U "${PG_USER}" -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
      break
    fi
    if [ "${i}" -eq 30 ]; then
      echo "❌ PostgreSQL não respondeu a tempo." >&2
      exit 1
    fi
    sleep 1
  done

  DB_EXISTS="$(docker compose exec -e PGPASSWORD="${PG_PASSWORD}" -T postgres psql -h 127.0.0.1 -U "${PG_USER}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${PG_TEST_DB}'" | tr -d '[:space:]')"
  if [ "${DB_EXISTS}" != "1" ]; then
    echo "🆕 Criando banco de testes '${PG_TEST_DB}'..."
    docker compose exec -e PGPASSWORD="${PG_PASSWORD}" -T postgres psql -h 127.0.0.1 -U "${PG_USER}" -d postgres -c "CREATE DATABASE ${PG_TEST_DB};" >/dev/null
  fi

  export DATABASE_URL="postgres://${PG_USER}:${PG_PASSWORD}@127.0.0.1:${PG_PORT}/${PG_TEST_DB}"
  export DATABASE_DIRECT_URL="${DATABASE_URL}"
fi

echo "🧪 Executando suíte Japa contra PostgreSQL (TEST_DB=pg)..."
NODE_ENV=test \
TEST_DB=pg \
DB_CONNECTION=pg \
DB_SSL=false \
node ace test "$@"
