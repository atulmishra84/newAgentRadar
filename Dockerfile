FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm install --workspace=@agentradar/api --workspace=@agentradar/web --workspace=@agentradar/shared
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
COPY sql sql
COPY scripts scripts
RUN npm run build -w @agentradar/web

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4000
# SEED_ON_START=true only for demo/dev images — never enable in production customer deploys
CMD ["sh", "-c", "node scripts/migrate.js && if [ \"$SEED_ON_START\" = \"true\" ]; then node scripts/seed.js; fi && node apps/api/src/server.js"]
