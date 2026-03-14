# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build argument for API URL
ARG VITE_API_URL=http://localhost:3001

# Copy root files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace files
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config

# Install dependencies
RUN npm ci

# Build the frontend with API URL
RUN VITE_API_URL=$VITE_API_URL npm run build --workspace=frontend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init and a simple HTTP server
RUN apk add --no-cache dumb-init

# Install serve package globally to serve the frontend
RUN npm install -g serve

# Copy built frontend from builder stage
COPY --from=builder /app/apps/frontend/dist ./dist

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start the server serving the frontend
CMD ["serve", "-s", "dist", "-l", "3000"]
