#!/bin/sh
set -e

mkdir -p /app/tmp /app/backups
node ace migration:run --force
exec node bin/server.js
