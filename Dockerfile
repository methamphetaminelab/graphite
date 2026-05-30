FROM node:20-alpine AS editor-builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/core/package.json packages/core/
COPY packages/editor/package.json packages/editor/
RUN pnpm install --frozen-lockfile
COPY packages/core/ packages/core/
COPY packages/editor/ packages/editor/
RUN pnpm --filter @graphite/core build
RUN pnpm --filter @graphite/editor build

FROM node:20-alpine AS server
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile
COPY packages/core/ packages/core/
COPY packages/server/ packages/server/
RUN pnpm --filter @graphite/core build
RUN pnpm --filter @graphite/server build

COPY --from=editor-builder /app/packages/editor/dist packages/editor/dist

EXPOSE 3001
CMD ["node", "packages/server/dist/index.js"]
