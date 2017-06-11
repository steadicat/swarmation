NODE=ts-node --compilerOptions '{"module": "commonjs"}'
NODE_BIN=./node_modules/.bin

PORT=243
DEPLOY_FILES=etc public server Makefile package.json formations.txt
DEPLOY_TARGET=/opt/swarmation
DEPLOY_SERVER=root@104.236.28.138
REMOTE_EXEC=ssh $(DEPLOY_SERVER) -p $(PORT)
REMOTE_COPY=rsync -e "ssh -p $(PORT)" -a --delete

NAME=swarmation-1
REGION=nyc3
SIZE=512mb
IMAGE=ubuntu-16-04-x64
SSH_KEY=122656

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
	ssh $(DEPLOY_SERVER) sed -i -e '"s/Port 22/Port 243/g"' /etc/ssh/sshd_config
	ssh $(DEPLOY_SERVER) service ssh restart

setup-done: etc/setup.sh
	sh ./etc/setup.sh
	touch setup-done
remote-setup: setup-done

nginx-done: etc/nginx.conf etc/swarmation.com.crt
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

remote-configure: remote-setup remote-nginx remote-systemd remote-dependencies remote-cache

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

.PHONY: buildjs buildcss buildserver build deploy
