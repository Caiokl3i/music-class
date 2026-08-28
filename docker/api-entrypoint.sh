#!/bin/sh
set -e

mkdir -p /app/tmp
node ace migration:run --force
exec node bin/server.js
