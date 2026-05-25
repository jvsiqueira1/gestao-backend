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

EXPOSE 4000

# Apply pending migrations then start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
