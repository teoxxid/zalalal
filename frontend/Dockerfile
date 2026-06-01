FROM node:22-alpine as build

WORKDIR /app

ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

COPY package*.json ./
RUN npm install

ARG VITE_API_TARGET=
ARG VITE_ENABLE_PWA=false
ENV VITE_API_TARGET=${VITE_API_TARGET}
ENV VITE_ENABLE_PWA=${VITE_ENABLE_PWA}

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
