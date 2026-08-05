# =============================================================================
# frontend — Multi-stage Dockerfile
# Stage 1 (builder): install Node deps and build the Vite production bundle
# Stage 2 (runtime): serve the static bundle with Nginx on port 3000
# =============================================================================

# ---- Builder stage -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# ---- Runtime stage -----------------------------------------------------------
FROM nginx:1.25-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config for SPA (HTML5 history API fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
