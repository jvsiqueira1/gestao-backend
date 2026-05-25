#!/bin/sh
set -e

# Run pending Prisma migrations with retry. The Neon compute can be paused
# (scale-to-zero on the free tier) and the first connection is sometimes
# slow enough to trip Prisma's default 10s timeout. We retry a handful of
# times before giving up; if there are no pending migrations, this is a
# fast no-op anyway.
MAX_ATTEMPTS=5
ATTEMPT=1
while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
  echo "[start.sh] prisma migrate deploy (attempt $ATTEMPT/$MAX_ATTEMPTS)"
  if npx --no-install prisma migrate deploy; then
    echo "[start.sh] migrations applied"
    break
  fi
  if [ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]; then
    echo "[start.sh] migrate deploy failed after $MAX_ATTEMPTS attempts" >&2
    exit 1
  fi
  ATTEMPT=$((ATTEMPT + 1))
  sleep 5
done

exec node index.js
