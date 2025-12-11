# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy node_modules from builder (includes all deps needed for runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy files needed for database migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy uploads directory (will be mounted as volume in production)
RUN mkdir -p uploads

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
