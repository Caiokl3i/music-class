# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:3333
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS production
ARG VITE_API_URL=http://localhost:3333
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN API_ORIGIN=$(printf '%s' "$VITE_API_URL" | sed -E 's|/*$||; s#(https?://[^/]+).*#\1#') \
  && sed -i "s#__API_ORIGIN__#${API_ORIGIN}#g" /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
