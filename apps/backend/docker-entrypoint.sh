#!/bin/sh
set -e
cd /app/apps/backend
if [ "${SKIP_DB_MIGRATE:-}" != "1" ]; then
  yarn db:migrate
fi
exec yarn start
