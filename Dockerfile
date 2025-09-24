# =============================================================================
# Multi-stage Dockerfile for Angular Application
# =============================================================================
# This Dockerfile creates optimized, secure, and efficient containers for:
# 1. Development environment with hot-reload
# 2. Production SSR (Server-Side Rendering) 
# 3. Production static build with Nginx
# =============================================================================

# -----------------------------------------------------------------------------
# Dependencies Stage - Shared base for dependency installation
# -----------------------------------------------------------------------------
FROM node:22-alpine AS dependencies

# Set build arguments for configuration
ARG NODE_ENV=production
ARG UID=1000
ARG GID=1000

# Install security updates and required system packages
RUN apk update
RUN apk upgrade
RUN apk add --no-cache \
    dumb-init \
    curl
RUN rm -rf /var/cache/apk/*

# Create application directory with proper permissions
WORKDIR /app

# Create non-root user for security with robust error handling
RUN set -e; \
    # Check if group already exists, if not create it
    if ! getent group appgroup >/dev/null 2>&1; then \
        if ! addgroup -g ${GID} -S appgroup 2>/dev/null; then \
            addgroup -S appgroup; \
        fi; \
    fi; \
    # Check if user already exists, if not create it
    if ! getent passwd appuser >/dev/null 2>&1; then \
        if ! adduser -u ${UID} -S -G appgroup -s /bin/sh appuser 2>/dev/null; then \
            # If the specific UID is taken, create user without specifying UID
            adduser -S -G appgroup -s /bin/sh appuser; \
        fi; \
    fi

# Copy package files for dependency installation
# Done early to leverage Docker layer caching
COPY --chown=appuser:appgroup package*.json ./

# Install Angular CLI globally with specific version for consistency
RUN npm install -g @angular/cli@19.2.15
RUN npm cache clean --force

# Install dependencies with optimizations
RUN npm install --only=production --no-audit --no-fund
RUN npm cache clean --force

# -----------------------------------------------------------------------------
# Development Dependencies Stage - For development builds
# -----------------------------------------------------------------------------
# Dev dependencies stage - install all dependencies for building
# -----------------------------------------------------------------------------
FROM node:22-alpine AS dev-dependencies

# Install system dependencies and security updates
RUN apk update
RUN apk upgrade
RUN apk add --no-cache \
    dumb-init \
    curl
RUN rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create user and group with fallback logic for existing IDs
RUN set -e; \
    if ! getent group appgroup >/dev/null 2>&1; then \
        if ! addgroup -g 1000 -S appgroup 2>/dev/null; then \
            addgroup -S appgroup; \
        fi; \
    fi; \
    if ! getent passwd appuser >/dev/null 2>&1; then \
        if ! adduser -u 1000 -S appuser -G appgroup -s /bin/sh 2>/dev/null; then \
            adduser -S appuser -G appgroup -s /bin/sh; \
        fi; \
    fi

# Copy package files with proper ownership
COPY --chown=appuser:appgroup package*.json ./

# Install Angular CLI globally and all dependencies (including dev dependencies)
# Use npm install to handle package-lock.json regeneration
RUN npm install -g @angular/cli@19.2.15
RUN npm cache clean --force
RUN npm install --no-audit --no-fund
RUN npm cache clean --force

# Create .angular cache directory for better build performance
RUN mkdir -p .angular/cache
RUN chown -R appuser:appgroup .angular

# -----------------------------------------------------------------------------
# Development Stage - Hot-reload development environment
# -----------------------------------------------------------------------------
FROM dev-dependencies AS development

# Set environment variables for development
ENV NODE_ENV=development
ENV NG_CLI_ANALYTICS=false
ENV CI=true

# Copy source code with proper ownership
COPY --chown=appuser:appgroup . .

# Change to non-root user for security
USER appuser

# Expose development port
EXPOSE 4200

# Health check for development container
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4200/ || exit 1

# Use dumb-init to handle signals properly and start development server
ENTRYPOINT ["dumb-init", "--"]
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "1000"]

# -----------------------------------------------------------------------------
# Build Stage - Production build with SSR
# -----------------------------------------------------------------------------
FROM dev-dependencies AS build

# Set production environment
ENV NODE_ENV=production
ENV NG_CLI_ANALYTICS=false
ENV CI=true

# Copy source code
COPY --chown=appuser:appgroup . .

# Build the application for production with SSR and optimizations
RUN ng build --configuration=production

# Clean up development dependencies and cache after build
RUN npm prune --production
RUN npm cache clean --force

# Change to non-root user
USER appuser

# Expose SSR port
EXPOSE 4000

# Health check for SSR application
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4000/ || exit 1

# Start SSR server with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "serve:ssr"]

# -----------------------------------------------------------------------------
# Build No-SSR Stage - Static production build
# -----------------------------------------------------------------------------
FROM dev-dependencies AS build-no-ssr

# Set production environment
ENV NODE_ENV=production
ENV NG_CLI_ANALYTICS=false
ENV CI=true

# Copy source code
COPY --chown=appuser:appgroup . .

# Build the application for production without SSR with optimizations
RUN ng build --configuration=production
RUN npm cache clean --force

# -----------------------------------------------------------------------------
# Production No-SSR Stage - Nginx static file server
# -----------------------------------------------------------------------------
FROM nginx:mainline-alpine3.22 AS production-no-ssr

# Install security updates
RUN apk update
RUN apk upgrade
RUN apk add --no-cache curl
RUN rm -rf /var/cache/apk/*

# Create non-root user for nginx with robust error handling
RUN set -e; \
    # Check if group already exists, if not create it
    if ! getent group nginx-app >/dev/null 2>&1; then \
        if ! addgroup -g 1000 -S nginx-app 2>/dev/null; then \
            addgroup -S nginx-app; \
        fi; \
    fi; \
    # Check if user already exists, if not create it
    if ! getent passwd nginx-app >/dev/null 2>&1; then \
        if ! adduser -u 1000 -S -G nginx-app -s /bin/sh nginx-app 2>/dev/null; then \
            # If the specific UID is taken, create user without specifying UID
            adduser -S -G nginx-app -s /bin/sh nginx-app; \
        fi; \
    fi

# Copy built application from build stage
COPY --from=build-no-ssr --chown=nginx-app:nginx-app /app/dist/*/browser /usr/share/nginx/html

# Copy optimized nginx configuration
COPY --chown=nginx-app:nginx-app nginx.conf /etc/nginx/nginx.conf

# Create nginx cache directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /tmp
RUN chown -R nginx-app:nginx-app /var/cache/nginx /var/log/nginx /tmp /usr/share/nginx/html

# Remove default nginx files
RUN rm -f /etc/nginx/conf.d/default.conf

# Switch to non-root user
USER nginx-app

# Expose HTTP port
EXPOSE 80

# Health check for nginx container
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Start nginx with proper signal handling
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]

# -----------------------------------------------------------------------------
# Metadata Labels for Container Management
# -----------------------------------------------------------------------------
LABEL maintainer="LynxPardelle <lynxpardelle@lynxpardelle.com>"
LABEL version="2.0.0"
LABEL description="Angular Docker Template"
LABEL org.opencontainers.image.title="Angular Docker Template"
LABEL org.opencontainers.image.description="Angular application with SSR support"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.authors="LynxPardelle"
LABEL org.opencontainers.image.url="https://lynxpardelle.com"
LABEL org.opencontainers.image.source="https://github.com/LynxPardelle/angular-docker-template"
LABEL org.opencontainers.image.licenses="MIT"
