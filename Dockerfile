# Multi-stage Dockerfile for OmniTrackr API
# Optimized for Cloud Run deployment with monorepo support

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/worker/package*.json ./packages/worker/
COPY packages/api/package*.json ./packages/api/

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage (npm workspaces installs all in root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package*.json ./
COPY tsconfig.json ./
COPY turbo.json ./
COPY packages/shared ./packages/shared
COPY packages/worker ./packages/worker
COPY packages/api ./packages/api

# Build shared package first (API and worker depend on it)
WORKDIR /app/packages/shared
RUN npm run build

# Build worker package (API depends on it)
WORKDIR /app/packages/worker
RUN npm run build

# Build API package
WORKDIR /app/packages/api
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/worker/package*.json ./packages/worker/
COPY packages/api/package*.json ./packages/api/

# Install only production dependencies (npm workspaces installs all in root node_modules)
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/worker/dist ./packages/worker/dist
COPY --from=builder /app/packages/worker/package.json ./packages/worker/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Set working directory to API
WORKDIR /app/packages/api

# Expose port (Cloud Run will override this)
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/src/index.js"]
