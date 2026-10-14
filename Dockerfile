# Lab Brain, for people who host it themselves.
#
#   docker compose up --build        (see docker-compose.yml)
#
# Records live in /data (the SQLite database) and uploaded files in /storage:
# mount volumes there, or both are lost when the container is replaced.

# --- dependencies -----------------------------------------------------------
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
# No git hooks inside an image.
ENV HUSKY=0
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# --- build ------------------------------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN yarn build

# --- run --------------------------------------------------------------------
FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LAB_BRAIN_DATA_DIR=/data \
    LAB_BRAIN_STORAGE_DIR=/storage

COPY --from=build /app/.next/standalone ./
# The build may copy env files next to the server; none belongs in an image.
RUN rm -f .env .env.*
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# The server runs as the unprivileged `node` user, which must own the volumes.
RUN mkdir -p /data /storage /backups \
 && chown -R node:node /data /storage /backups /app
USER node

VOLUME ["/data", "/storage"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
