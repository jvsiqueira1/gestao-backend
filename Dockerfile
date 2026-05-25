# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies based on lockfile
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
 && npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

# Copy installed deps + generated Prisma client
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application source
COPY . .

RUN chmod +x scripts/start.sh

EXPOSE 4000

# Container-level healthcheck so Coolify / Docker can verify the API
# is responsive. Alpine ships busybox wget, which is enough for HTTP.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# start.sh applies pending migrations (with retry for cold Neon computes)
# and then execs the API process.
CMD ["sh", "scripts/start.sh"]
