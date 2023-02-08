NODE=ts-node --esm -T

include Secrets

node_modules:
	yarn install
	touch node_modules

public/formation/*.png: node_modules formations.txt src/server/images.ts
	mkdir -p public/formation
	$(NODE) src/server/images.ts

# Development

devserver: node_modules
	SECRET=$(SECRET) AIRTABLE_KEY=$(AIRTABLE_KEY) AIRTABLE_BASE=$(AIRTABLE_BASE) POSTMARK=$(POSTMARK) $(NODE) src/server/server.ts
.PHONY: devserver

devjs: node_modules
	cp src/index.html public/index.html
	yarn run rollup -c --watch
.PHONY: devjs

dev: public/formation/*.png
	make devjs & make devserver
.PHONY: dev

# Debug

bots: count=100
bots: node_modules
	$(NODE) src/bots/bots.ts $(count) ws://localhost:3000/ws
.PHONY: bots

profileserver: buildserver
	SECRET=$(SECRET) AIRTABLE_KEY=$(AIRTABLE_KEY) AIRTABLE_BASE=$(AIRTABLE_BASE) POSTMARK=$(POSTMARK) node --inspect server/server/server.js
.PHONY: profileserver


