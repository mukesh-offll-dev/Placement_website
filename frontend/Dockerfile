# ============================================================
# Stage 1: Build the React + Vite Application
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm ci

# Copy application source code
COPY . .

# Vite inlines VITE_* variables into the bundle at build time, so the API URL is
# fixed when the image is built, not when the container starts. The default is a
# relative path: the browser calls this same nginx, which proxies to the backend.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production bundle into /app/dist
RUN npm run build

# ============================================================
# Stage 2: Serve the Production Bundle using Nginx Alpine
# ============================================================
FROM nginx:alpine

# Remove default Nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Nginx config goes in as a TEMPLATE: the official image runs envsubst over
# /etc/nginx/templates/*.template at startup and writes the result to conf.d.
# That is what fills in ${BACKEND_ORIGIN} below.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Where to forward /api. Defaults to the docker-compose service name; override
# with -e BACKEND_ORIGIN=... when the API runs elsewhere.
ENV BACKEND_ORIGIN=http://backend:8080

# Substitute ONLY BACKEND_* variables. Without this filter envsubst would also
# eat nginx's own $uri, $host and $remote_addr and emit a broken config.
ENV NGINX_ENVSUBST_FILTER=^BACKEND_

# Copy production build artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
