FROM node:18 as build

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y libpango1.0-dev libgif-dev

ENV NODE_ENV development
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

ENV NODE_ENV production

COPY tsconfig.json .
ADD src/ ./src
ADD public/ ./public
RUN yarn run tsc --module commonjs
RUN yarn run rollup \
		--plugin commonjs \
		--plugin node-resolve \
		--plugin typescript \
		--plugin svelte \
		--plugin terser \
		--file public/main.prod.js \
		--format iife \
		./src/client/client.ts

RUN bash -c 'HASH=$(shasum public/main.prod.js | awk "{ print $1; }" | cut -c37-40) ;\
		test -n "$HASH" || (echo "Hash of public/main.prod.js empty. Aborting."; rm public/main.prod.js ; exit 1) ;\
		echo "public/main.prod.js → public/main.$HASH.js..." ;\
		mv public/main.prod.js public/main.$HASH.js ;\
		cat src/index.html | sed "s/main.js/main.$HASH.js/g" > public/index.html'

#RUN ts-node -T -O '{"module": "commonjs"}' src/server/images.ts
COPY formations.txt .
RUN mkdir -p /app/public/formation
RUN node /app/server/server/images.js


#########################


FROM --platform=linux/amd64 node:18-bullseye-slim as node

ENV NODE_ENV production

USER node
WORKDIR /app

COPY --chown=node:node package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile

COPY --chown=node:node --from=build /app/server /app/server
COPY --chown=node:node --from=build /app/public/formation /app/public/formation
COPY --chown=node:node --from=build /app/public/main.*.js /app/public/
COPY --chown=node:node --from=build /app/formations.txt /app/formations.txt

EXPOSE 3000
CMD ["node", "/app/server/server/server.js"]


#########################


FROM --platform=linux/amd64 nginx:latest as nginx
COPY ./etc/nginx.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p /app/data/cache
ADD etc/letsencrypt/ /app/letsencrypt

COPY --from=build /app/public /app/public

EXPOSE 80 443


