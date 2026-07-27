# OpenVan.camp MCP server — stdio transport.
#
# Build:  docker build -t openvan-mcp .
# Run:    docker run -i --rm openvan-mcp
#
# The container speaks MCP over stdio on stdin/stdout, so it must be run with
# -i (interactive). Diagnostics go to stderr to keep the JSON-RPC stream clean.

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install --no-audit --no-fund

COPY src ./src
RUN npm run build


FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY README.md LICENSE ./

USER node

ENTRYPOINT ["node", "dist/index.js"]
