NODE=ts-node -T -O '{"module": "commonjs"}'

# Common

clean:
	rm public/main.js &
	rm public/css/screen.css &
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
	yarn run webpack \
		--mode development \
		--watch \
		--debug \
		--output-pathinfo \
		--devtool inline-source-map \
		--module-bind ts=ts-loader \
		--entry ./src/client/client.ts \
		--output public/main.js \
		--resolve-extensions '.ts,.js'
.PHONY: devjs

devcss: node_modules
	yarn run stylus --sourcemap-inline -w -u nib public/css/screen.styl -o public/css/screen.css
.PHONY: devcss

dev: public/formation/*.png
	make devjs & make devcss & make devserver
.PHONY: dev

# Deployment

buildjs: node_modules
	-NODE_ENV=production yarn run webpack \
		--mode production \
		--module-bind ts=ts-loader \
		--entry ./src/client/client.ts \
		--output public/main.js \
		--resolve-extensions '.ts,.js'
.PHONY: buildjs

buildcss: node_modules
	yarn run stylus -U -c -u nib public/css/screen.styl -o public/css/screen.css
.PHONY: buildcss

buildserver: node_modules
	-yarn run tsc --module commonjs
.PHONY: buildserver

build: buildserver buildjs buildcss public/formation/*.png
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
