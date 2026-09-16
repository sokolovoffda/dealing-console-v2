### STAGE 1: Build ###
ARG DOCKER_PROXY_HOST
FROM ${DOCKER_PROXY_HOST}/node:24 as build
RUN mkdir /usr/src/app
RUN mkdir /var/log/nginx
WORKDIR /usr/src/app
ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY package.json /usr/src/app/package.json
COPY package-lock.json /usr/src/app/package-lock.json
ARG WUI_REGISTRY_ACCESS_TOKEN
RUN npm config set @wui:registry=https://gitlab.satel.org/api/v4/packages/npm/
RUN npm config set -- '//gitlab.satel.org/api/v4/packages/npm/:_authToken' "${WUI_REGISTRY_ACCESS_TOKEN}"
RUN npm config set -- '//gitlab.satel.org/api/v4/projects/:_authToken' "${WUI_REGISTRY_ACCESS_TOKEN}"
RUN npm config set -- '//gitlab.satel.org/api/v4/projects/682/packages/npm/:_authToken' "${WUI_REGISTRY_ACCESS_TOKEN}"
RUN npm config set -- '//gitlab.satel.org/api/v4/projects/1126/packages/npm/:_authToken' "${WUI_REGISTRY_ACCESS_TOKEN}"
RUN npm config set -- '//gitlab.satel.org/api/v4/projects/:_authToken' "${WUI_REGISTRY_ACCESS_TOKEN}"
RUN npm ci --ignore-scripts
COPY . /usr/src/app
RUN npm run build:stage

### STAGE 2: NGINX ###
FROM ${DOCKER_PROXY_HOST}/nginx:latest
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
ADD ./nginx.conf /etc/nginx/nginx.conf
ARG DOCKER_APP_PORT=3334
RUN sed -i "s/\$DOCKER_APP_PORT/$DOCKER_APP_PORT/g" /etc/nginx/nginx.conf
EXPOSE $DOCKER_APP_PORT
CMD ["nginx", "-g", "daemon off;"]
