#!/bin/sh
set -e

mkdir -p /app/tmp /app/backups

# In V2, migrations are an explicit pre-deploy step (npm run db:migrate:prod).
# Auto-migration on boot is disabled by default to prevent race conditions across replicated instances.
if [ "$AUTO_MIGRATE" = "true" ]; then
  echo "Executing database migrations (AUTO_MIGRATE=true)..."
  node ace migration:run --force
fi

exec node bin/server.js
