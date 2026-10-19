FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
# Where staff sign in to ucode (.env.example): public ids, not secrets. Vite writes them into
# the bundle, so changing one needs a new build. The Makefile passes them in.
ARG VITE_UCODE_PROJECT_ID
ARG VITE_UCODE_ENVIRONMENT_ID
ARG VITE_UCODE_CLIENT_TYPE_IDS
ENV VITE_UCODE_PROJECT_ID=$VITE_UCODE_PROJECT_ID \
    VITE_UCODE_ENVIRONMENT_ID=$VITE_UCODE_ENVIRONMENT_ID \
    VITE_UCODE_CLIENT_TYPE_IDS=$VITE_UCODE_CLIENT_TYPE_IDS
RUN yarn build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
