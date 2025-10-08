FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache git curl

# Set working directory
WORKDIR /app

# Copy package files and install dependencies (cached layer)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Get git revision and build time for deployment verification
ARG GIT_REVISION=unknown
ARG BUILD_TIME
ENV REACT_APP_GIT_REVISION=$GIT_REVISION
ENV REACT_APP_BUILD_TIME=$BUILD_TIME

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Switch to app user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Default command (will be overridden by docker-compose)
CMD ["yarn", "start"]

