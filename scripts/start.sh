#!/bin/sh
set -e

# Migrations are intentionally NOT run here. The container at boot only
# starts the API. Apply schema changes manually before deploying:
#
#   DATABASE_URL=<neon direct url> npx prisma migrate deploy
#
# Rationale: the VPS cannot reach Neon's direct (non-pooled) endpoint
# reliably, and running `prisma migrate deploy` through the pooler
# fails on the postgres advisory lock that PgBouncer in transaction
# mode does not support. Decoupling migration from container start
# avoids a fragile dependency in the hot path and makes rolling back
# a deploy a pure container swap.

exec node index.js
