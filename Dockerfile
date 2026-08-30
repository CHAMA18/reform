# ===========================================
# Reform — Dockerfile (multi-stage)
# ===========================================
# Builds a production Next.js standalone server.
#
# Usage:
#   docker build -t reform .
#   docker run -p 3000:3000 --env-file .env reform
#
# Or with docker-compose:
#   docker-compose up

# --- Stage 1: Dependencies ---
FROM node:20-slim AS deps

# Install bun for faster installs
RUN npm install -g bun

WORKDIR /app

# Copy lockfile and package.json first for layer caching
COPY package.json bun.lock* package-lock.json* ./

# Install dependencies
RUN bun install --frozen-lockfile || npm install

# --- Stage 2: Builder ---
FROM node:20-slim AS builder

RUN npm install -g bun

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Copy prisma schema and generate the client
COPY prisma ./prisma
RUN bun run db:generate || npx prisma generate

# Build the Next.js app (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build || npm run build

# --- Stage 3: Runner ---
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install openssl (needed by Prisma), curl (for healthchecks), and
# netcat-openbsd (for the entrypoint's DB-wait loop).
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for runtime migrations.
# We need both the generated client (.prisma + @prisma/client) AND the
# Prisma CLI itself (prisma) so the entrypoint can run `prisma db push`.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Copy the startup script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck: verify the server responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Run migrations then start the server
CMD ["./docker-entrypoint.sh"]
