FROM node:22-alpine AS build

WORKDIR /app/android-app

COPY android-app/package.json android-app/package-lock.json ./
RUN npm ci

COPY android-app/ ./

ARG VITE_API_BASE_URL=/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build -- --base /mobile/

WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./

RUN npm run build -- --config vite.config.docker.js

FROM nginx:1.28-alpine

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist/ /usr/share/nginx/html/
COPY --from=build /app/android-app/dist/ /usr/share/nginx/html/mobile/

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
