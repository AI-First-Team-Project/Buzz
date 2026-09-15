FROM node:22-alpine AS build

WORKDIR /app

COPY web/package.json web/package-lock.json ./web/
COPY android-app/package.json android-app/package-lock.json ./android-app/
RUN cd web && npm ci && cd /app/android-app && npm ci

COPY web ./web
COPY android-app ./android-app

WORKDIR /app/web
ARG VITE_API_BASE_URL=/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build -- --config vite.config.docker.js

FROM nginx:1.28-alpine

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
