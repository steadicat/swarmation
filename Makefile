NODE=ts-node -T -O '{"module": "commonjs"}'

PORT=243
USER=root
DEPLOY_FILES=etc public server Makefile Secrets package.json formations.txt
DEPLOY_TARGET=/opt/swarmation
REMOTE_COPY=rsync -e "ssh -p $(PORT)" -a --delete

include Secrets

# Common

clean:
	rm public/main.js &
	rm public/main.*.js &
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
	SECRET=$(SECRET) AIRTABLE_KEY=$(AIRTABLE_KEY) AIRTABLE_BASE=$(AIRTABLE_BASE) POSTMARK=$(POSTMARK) $(NODE) src/server/server.ts
.PHONY: devserver

devjs: node_modules
	cp src/index.html public/index.html
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

# Debug

bots: node_modules
	$(NODE) src/bots/bots.ts 100 ws://localhost:3000/ws
.PHONY: bots

profileserver: buildserver
	SECRET=$(SECRET) AIRTABLE_KEY=$(AIRTABLE_KEY) AIRTABLE_BASE=$(AIRTABLE_BASE) POSTMARK=$(POSTMARK) node --inspect server/server/server.js
.PHONY: profileserver

# Build

public/main.prod.js: export NODE_ENV=production
public/main.prod.js: node_modules
	yarn run rollup \
		--plugin commonjs \
		--plugin node-resolve \
		--plugin typescript \
		--plugin svelte \
		--plugin terser \
		--file public/main.prod.js \
		--format iife \
		./src/client/client.ts

buildjs: public/main.prod.js | buildserver
	@set -e ;\
		HASH=$$(shasum public/main.prod.js | awk '{ print $$1; }' | cut -c37-40) ;\
		test -n "$$HASH" || (echo "Hash of public/main.prod.js empty. Aborting."; rm public/main.prod.js ; exit 1) ;\
		echo "public/main.prod.js → public/main.$$HASH.js..." ;\
		mv public/main.prod.js public/main.$$HASH.js ;\
		cat src/index.html | sed "s/main.js/main.$$HASH.js/g" > public/index.html 
.PHONY: buildjs

buildserver: node_modules
	-yarn run tsc --module commonjs
.PHONY: buildserver

build: buildserver buildjs public/formation/*.png
.PHONY: build

# Deploy

REGION=nyc3
SIZE=s-1vcpu-1gb
#IMAGE=ubuntu-20-04-x64
IMAGE=63194980
SSH_KEY=16:35:1f:58:21:aa:11:e6:f3:72:33:67:fa:82:ad:4c

create:
	@test -n "$(server)" || (echo "Usage: make new server=[id]"; exit 1)
	doctl compute droplet create swarmation-$(server) \
		--region $(REGION) \
		--size $(SIZE) \
		--image $(IMAGE) \
		--ssh-keys $(SSH_KEY) \
		--enable-ipv6 \
		--enable-monitoring \
		--wait
.PHONY: new

delete: get-server
	doctl compute droplet delete swarmation-$(server)
.PHONY: delete

get-server:
	@test -n "$(server)" || (echo "Usage: make [task] server=[id]"; exit 1)
	$(eval IP=$(shell doctl compute droplet list | grep swarmation-$(server) | awk '{print $$3}'))
	$(eval HOST=$(USER)@$(IP))
	$(eval REMOTE=ssh $(USER)@$(IP) -p $(PORT))
.PHONY: get-server

bootstrap: get-server ssl-upload
	scp -P $(PORT) etc/setup.sh $(HOST):setup.sh
	$(REMOTE) sh setup.sh
	#-$(REMOTE) reboot
.PHONY: bootstrap

ssh: get-server
	$(REMOTE)
.PHONY: ssh

setup-done: etc/setup.sh
	sh ./etc/setup.sh
	mkdir -p /etc/letsencrypt
	echo "dns_cloudflare_api_token = $(CERTBOT)" > /etc/letsencrypt/cloudflare.ini
	chmod 600 /etc/letsencrypt/cloudflare.ini
	touch setup-done
remote-setup: setup-done

nginx-done: etc/nginx.conf
	cp etc/nginx.conf /etc/nginx/sites-available/swarmation.conf
	ln -sf /etc/nginx/sites-available/swarmation.conf /etc/nginx/sites-enabled/swarmation.conf
	rm -f /etc/nginx/sites-enabled/default
	systemctl start nginx
	nginx -s reload
	touch nginx-done
remote-nginx: nginx-done

systemd-done: etc/swarmation.service
	cat etc/swarmation.service \
		| sed 's/secret/$(SECRET)/g' \
		| sed 's/airtable_key/$(AIRTABLE_KEY)/g' \
		| sed 's/airtable_base/$(AIRTABLE_BASE)/g' \
		| sed 's/postmark/$(POSTMARK)/g' \
		> /lib/systemd/system/swarmation.service
	touch systemd-done
remote-systemd: systemd-done

data/cache:
	mkdir -p data/cache
remote-cache: data/cache

dependencies-done: package.json
	yarn install --production --frozen-lockfile
	touch dependencies-done
remote-dependencies: dependencies-done

remote-configure: remote-cache remote-setup remote-nginx remote-systemd remote-dependencies

configure: get-server upload ssl-upload
	$(REMOTE) "cd $(DEPLOY_TARGET); make remote-configure"		

upload: get-server | build
	$(REMOTE) mkdir -p $(DEPLOY_TARGET)
	$(REMOTE_COPY) $(DEPLOY_FILES) $(HOST):$(DEPLOY_TARGET)

deploy: get-server configure build upload
	$(REMOTE) systemctl daemon-reload
	$(REMOTE) systemctl restart swarmation

ssl-download: get-server
	$(REMOTE_COPY) $(HOST):/etc/letsencrypt etc

ssl-upload: get-server
	$(REMOTE_COPY) etc/letsencrypt/ $(HOST):/etc/letsencrypt/

# 14 5 * * * /usr/bin/certbot renew --quiet --post-hook "/usr/sbin/service nginx reload" > /dev/null 2>&1