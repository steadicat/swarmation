NODE=ts-node --fast --compilerOptions '{"module": "commonjs"}'
NODE_BIN=./node_modules/.bin

PORT=243
DEPLOY_FILES=etc public server Makefile Secrets package.json formations.txt
DEPLOY_TARGET=/opt/swarmation
DEPLOY_SERVER=root@138.197.110.95
REMOTE_EXEC=ssh $(DEPLOY_SERVER) -p $(PORT)
REMOTE_COPY=rsync -e "ssh -p $(PORT)" -a --delete

NAME=swarmation-new
REGION=nyc3
SIZE=s-1vcpu-1gb
IMAGE=ubuntu-18-04-x64
SSH_KEY=18156994

# Common

clean:
	rm public/main.js &
	rm public/css/screen.css &
	rm -rf public/formation &
	rm -rf server

node_modules/update: package.json
	yarn
	touch node_modules/update
dependencies: node_modules/update

dependencies-done: package.json
	npm install --production
	touch dependencies-done
remote-dependencies: dependencies-done

public/formation/update: formations.txt src/server/images.ts src/server/fbpublish.ts
	mkdir -p public/formation
	$(NODE) src/server/images.ts
	$(NODE) src/server/fbpublish.ts
	touch public/formation/update
formations: public/formation/update

upload: build
	$(REMOTE_EXEC) mkdir -p $(DEPLOY_TARGET)
	$(REMOTE_COPY) $(DEPLOY_FILES) $(DEPLOY_SERVER):$(DEPLOY_TARGET)

.PHONY: clean dependencies formations upload

# Development

devserver: dependencies
	$(NODE) src/server/main.ts

devjs: dependencies
	$(NODE_BIN)/webpack \
		--watch \
		--debug \
		--output-pathinfo \
		--devtool inline-source-map \
		--module-bind ts=awesome-typescript-loader \
		src/client/main.ts public/main.js \
		--resolve-extensions '.ts,.js'

devcss: dependencies
	$(NODE_BIN)/stylus --sourcemap-inline -w -u nib public/css/screen.styl -o public/css/screen.css

dev: dependencies formations
	make devjs & make devcss & make devserver

# Server Configuration

include Secrets
new:
	curl -X POST \
	  -H Content-Type:application/json \
	  -H "Authorization: Bearer $(DIGITAL_OCEAN_TOKEN)" \
	  -d '{"name":"$(NAME)","region":"$(REGION)","size":"$(SIZE)","image":"$(IMAGE)","ssh_keys":["$(SSH_KEY)"],"ipv6":true}' \
	  https://api.digitalocean.com/v2/droplets

bootstrap:
	scp etc/setup.sh $(DEPLOY_SERVER):setup.sh
	ssh $(DEPLOY_SERVER) sh setup.sh
	-ssh $(DEPLOY_SERVER) reboot
.PHONY: bootstrap

rebootstrap:
	scp -P 243 etc/setup.sh $(DEPLOY_SERVER):setup.sh
	ssh $(DEPLOY_SERVER) -p 243 sh setup.sh
	-ssh $(DEPLOY_SERVER) -p 243 reboot
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
	cp etc/swarmation.service /lib/systemd/system/swarmation.service
	touch systemd-done
remote-systemd: systemd-done

data/cache:
	mkdir -p data/cache
remote-cache: data/cache

remote-configure: remote-cache remote-setup remote-nginx remote-systemd remote-dependencies

configure: upload
	$(REMOTE_EXEC) "cd $(DEPLOY_TARGET); make remote-configure"

.PHONY: new bootstrap remote-setup remote-nginx remote-systemd remote-configure configure

# Deployment

buildjs: dependencies
	-NODE_ENV=production $(NODE_BIN)/webpack -p \
		--module-bind ts=awesome-typescript-loader \
		src/client/main.ts public/main.js \
		--resolve-extensions '.ts,.js'

buildcss: dependencies
	$(NODE_BIN)/stylus -U -c -u nib public/css/screen.styl -o public/css/screen.css

buildserver:
	-$(NODE_BIN)/tsc --module commonjs

build: buildserver buildjs buildcss formations

deploy: configure build
	$(REMOTE_EXEC) systemctl daemon-reload
	$(REMOTE_EXEC) systemctl restart swarmation

ssl:
	$(REMOTE_EXEC) certbot certonly

ssl-backup:
	$(REMOTE_COPY) $(DEPLOY_SERVER):/etc/letsencrypt etc

ssl-upload:
	$(REMOTE_COPY) etc/letsencrypt/ $(DEPLOY_SERVER):/etc/letsencrypt/

renew:
	$(REMOTE_EXEC) certbot renew

.PHONY: buildjs buildcss buildserver build deploy ssl ssl-backup ssl-upload renew
