NODE=ts-node -T -O '{"module": "commonjs"}'

# Common

clean:
	rm public/main.js &
	rm public/css/screen.css &
	rm -rf public/formation &
	rm -rf server
.PHONY: clean

node_modules: package.json
	yarn
	touch node_modules

public/formation/*.png: formations.txt src/server/images.ts src/server/fbpublish.ts
	mkdir -p public/formation
	$(NODE) src/server/images.ts
	$(NODE) src/server/fbpublish.ts

# Development

devserver: node_modules
	$(NODE) src/server/main.ts
.PHONY: devserver

devjs: node_modules
	yarn run webpack \
		--mode development \
		--watch \
		--debug \
		--output-pathinfo \
		--devtool inline-source-map \
		--module-bind ts=ts-loader \
		--entry ./src/client/main.ts \
		--output public/main.js \
		--resolve-extensions '.ts,.js'
.PHONY: devjs

devcss: node_modules
	yarn run stylus --sourcemap-inline -w -u nib public/css/screen.styl -o public/css/screen.css
.PHONY: devcss

dev: node_modules public/formation/*.png
	make devjs & make devcss & make devserver
.PHONY: dev

# Deployment

buildjs: node_modules
	-NODE_ENV=production yarn run webpack \
		--mode production \
		--module-bind ts=ts-loader \
		--entry ./src/client/main.ts \
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
	now
	#now alias
.PHONY: deploy
