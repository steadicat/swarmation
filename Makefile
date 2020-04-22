NODE=ts-node -T -O '{"module": "commonjs"}'

# Common

clean:
	rm public/main.js &
	rm -rf public/formation &
	rm -rf server
.PHONY: clean

node_modules: package.json
	yarn install
	touch node_modules

public/formation/*.png: node_modules formations.txt src/server/images.ts
	mkdir -p public/formation
	$(NODE) src/server/images.ts

# Development

devserver: node_modules
	$(NODE) src/server/server.ts
.PHONY: devserver

devjs: node_modules
	yarn run rollup \
		--watch \
		--plugin commonjs \
		--plugin node-resolve \
		--plugin typescript \
		--plugin svelte \
		--file public/main.js \
		--format iife \
		./src/client/client.ts
.PHONY: devjs

dev: public/formation/*.png
	make devjs & make devserver
.PHONY: dev

bots: node_modules
	$(NODE) src/bots/bots.ts 300 ws://localhost:3000

# Deployment

buildjs: node_modules
	-NODE_ENV=production \
	  yarn run rollup \
		--plugin commonjs \
		--plugin node-resolve \
		--plugin typescript \
		--plugin svelte \
		--plugin terser \
		--file public/main.js \
		--format iife \
		./src/client/client.ts
.PHONY: buildjs

buildserver: node_modules
	-yarn run tsc --module commonjs
.PHONY: buildserver

build: buildserver buildjs public/formation/*.png
.PHONY: build

deploy: build
	# Strip out devDependencies otherwise Now insists on installing them
	mv package.json package.dev.json
	node -e "const package = require('./package.dev.json'); delete package.devDependencies; console.log(JSON.stringify(package))" > package.json
	-now
	rm package.json
	mv package.dev.json package.json
	#now alias
.PHONY: deploy
