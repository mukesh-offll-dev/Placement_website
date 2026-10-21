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

# Build argument to configure backend API endpoint if needed (defaults to standard Spring Boot endpoint)
ARG VITE_API_BASE_URL=http://localhost:8080/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production bundle into /app/dist
RUN npm run build

# ============================================================
# Stage 2: Serve the Production Bundle using Nginx Alpine
# ============================================================
FROM nginx:alpine

# Remove default Nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration for client-side React Router support
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
