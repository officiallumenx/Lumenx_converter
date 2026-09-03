# Build context must be the monorepo root:
#   docker build -f backend/Dockerfile -t lumenx-api .
#
# Run:
#   docker run --env-file backend/.env -p 8787:8787 lumenx-api

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY packages ./packages
COPY apps ./apps
COPY backend ./backend

RUN npm ci
RUN npm run build --workspace=@lumenx/api

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787

RUN useradd --system --uid 10001 --create-home lumenx

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules

USER lumenx
WORKDIR /app/backend
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
