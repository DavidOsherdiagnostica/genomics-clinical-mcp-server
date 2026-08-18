# Use Node.js 20 on Alpine Linux
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN addgroup -S mcp && adduser -S mcp -G mcp
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV ALLOWED_HOSTS=*
ENV OAUTH_ENABLED=false
ENV OAUTH_REQUIRED=false

USER mcp
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["node", "dist/server.js", "--http"]
