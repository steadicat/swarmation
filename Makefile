NODE=ts-node -T -O '{"module": "commonjs"}'

PORT=243
DEPLOY_FILES=etc public server Makefile Secrets package.json formations.txt
DEPLOY_TARGET=/opt/swarmation
DEPLOY_SERVER=root@159.203.109.43
REMOTE_EXEC=ssh $(DEPLOY_SERVER) -p $(PORT)
REMOTE_COPY=rsync -e "ssh -p $(PORT)" -a --delete

NAME=swarmation-1
REGION=nyc3
SIZE=s-1vcpu-1gb
IMAGE=ubuntu-18-04-x64
SSH_KEY=16:35:1f:58:21:aa:11:e6:f3:72:33:67:fa:82:ad:4c

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
	SECRET=$(SECRET) $(NODE) src/server/server.ts
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
	SECRET=$(SECRET) node --inspect server/server/server.js
.PHONY: profileserver

# Build

buildjs: node_modules | buildserver
	-NODE_ENV=production \
		yarn run rollup \
		--plugin commonjs \
		--plugin node-resolve \
		--plugin typescript \
		--plugin svelte \
		--plugin terser \
		--file public/main.prod.js \
		--format iife \
		./src/client/client.ts
	$(eval HASH=$(shell shasum public/main.js | awk '{ print $$1; }' | cut -c37-40))
	mv public/main.prod.js public/main.$(HASH).js
	cat src/index.html | sed 's/main.js/main.$(HASH).js/g' > public/index.html
.PHONY: buildjs

buildserver: node_modules
	-yarn run tsc --module commonjs
.PHONY: buildserver

build: buildserver buildjs public/formation/*.png
.PHONY: build

# Deploy

new:
	doctl compute droplet create $(NAME) \
		--region $(REGION) \
		--size $(SIZE) \
		--image $(IMAGE) \
		--ssh-keys $(SSH_KEY) \
		--enable-ipv6 \
		--wait

bootstrap:
	scp etc/setup.sh $(DEPLOY_SERVER):setup.sh
	ssh $(DEPLOY_SERVER) sh setup.sh
	-ssh $(DEPLOY_SERVER) reboot
.PHONY: bootstrap

rebootstrap:
	scp -P 243 etc/setup.sh $(DEPLOY_SERVER):setup.sh
	ssh $(DEPLOY_SERVER) -p 243 sh setup.sh
	#-ssh $(DEPLOY_SERVER) -p 243 reboot
.PHONY: rebootstrap

ssh:
	$(REMOTE_EXEC)
.PHONY: ssh

setup-done: etc/setup.sh
	sh ./etc/setup.sh
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
	cat etc/swarmation.service | sed 's/secret/$(SECRET)/g' > /lib/systemd/system/swarmation.service
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

configure: upload
	$(REMOTE_EXEC) "cd $(DEPLOY_TARGET); make remote-configure"		

upload: build
	$(REMOTE_EXEC) mkdir -p $(DEPLOY_TARGET)
	$(REMOTE_COPY) $(DEPLOY_FILES) $(DEPLOY_SERVER):$(DEPLOY_TARGET)

deploy: configure build	
	$(REMOTE_EXEC) systemctl daemon-reload
	$(REMOTE_EXEC) systemctl restart swarmation

ssl:
	$(REMOTE_EXEC) certbot certonly --dns-cloudflare

ssl-backup:
	$(REMOTE_COPY) $(DEPLOY_SERVER):/etc/letsencrypt etc

ssl-upload:
	$(REMOTE_COPY) etc/letsencrypt/ $(DEPLOY_SERVER):/etc/letsencrypt/

# 14 5 * * * /usr/bin/certbot renew --quiet --post-hook "/usr/sbin/service nginx reload" > /dev/null 2>&1
renew:
	$(REMOTE_EXEC) certbot renew