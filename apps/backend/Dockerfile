# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace files
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config

# Install dependencies
RUN npm ci

# Generate Prisma client with correct binary targets for the container environment
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"
RUN cd apps/backend && npx prisma generate && cd ../..

# Build the backend
RUN npm run build --workspace=backend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files and turbo config
COPY package*.json ./
COPY turbo.json ./

# Copy entire node_modules and workspace structure from builder
# This preserves all the workspace symlinks needed for @repo/* packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Copy built backend and source
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/src/generated ./apps/backend/src/generated

# Expose port
EXPOSE 3000

# Set working directory to backend
WORKDIR /app/apps/backend

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
