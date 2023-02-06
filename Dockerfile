FROM node:18 as build

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y libpango1.0-dev libgif-dev

ENV NODE_ENV development
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

ENV NODE_ENV production

COPY tsconfig.json .
ADD src/ ./src
ADD public/ ./public

RUN yarn run tsc ; exit 0
RUN yarn run rollup \
		--plugin commonjs \
		--plugin node-resolve \
		--plugin typescript \
		--plugin svelte \
		--plugin css-only \
		--plugin terser \
		--format iife \
		--file public/main.prod.js \
		--assetFileNames main.prod.css \
		./src/client/client.ts

COPY src/index.html ./public/index.html

RUN bash -c 'HASH=$(shasum public/main.prod.js | awk "{ print $1; }" | cut -c37-40) ;\
		test -n "$HASH" || (echo "Hash of public/main.prod.js empty. Aborting."; rm public/main.prod.js ; exit 1) ;\
		echo "public/main.prod.js → public/main.$HASH.js..." ;\
		mv public/main.prod.js public/main.$HASH.js ;\
		cat public/index.html | sed "s/main.js/main.$HASH.js/g" > public/index.tmp.html ;\
    mv public/index.tmp.html public/index.html'

RUN bash -c 'HASH=$(shasum public/main.prod.css | awk "{ print $1; }" | cut -c37-40) ;\
		test -n "$HASH" || (echo "Hash of public/main.prod.css empty. Aborting."; rm public/main.prod.css ; exit 1) ;\
		echo "public/main.prod.css → public/main.$HASH.css..." ;\
		mv public/main.prod.css public/main.$HASH.css ;\
		cat public/index.html | sed "s/main.css/main.$HASH.css/g" > public/index.tmp.html ;\
    mv public/index.tmp.html public/index.html'

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
COPY --chown=node:node --from=build /app/public /app/public
COPY --chown=node:node --from=build /app/formations.txt /app/formations.txt

EXPOSE 3000
CMD ["node", "/app/server/server/server.js"]

