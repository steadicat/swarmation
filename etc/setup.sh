#!/bin/sh

apt-get update -y
apt-get upgrade -y
apt-get autoremove -y
apt-get autoclean -y
apt-get install -y build-essential
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow -f noninteractive unattended-upgrades

which nginx || apt-get install -y nginx
#which node || curl -sL https://deb.nodesource.com/setup_0.12 | bash -
which node || apt-get install -y nodejs #&& npm install -g npm
which make || apt-get install -y make
#which redis-server || apt-get install -y redis-server
which fail2ban || apt-get install -y fail2ban
#apt-get install -y logwatch
#mv /etc/cron.daily/00logwatch /etc/cron.weekly/

which pkg-config || apt-get install -y pkg-config
#curl -s https://raw.githubusercontent.com/lovell/sharp/master/preinstall.sh | bash -

replace() {
  cat $1 | sed "$2" > ~/tmp
  chmod 0644 ~/tmp
  mv -f ~/tmp $1
}

ufw default deny incoming
ufw default allow outgoing
ufw deny 22
ufw allow 243/tcp
ufw allow 80/tcp
ufw allow 443/tcp
#for s in ${SERVERS}
#do
#  ufw allow from ${s} to any port 3003 proto tcp
#done

replace /etc/ufw/ufw.conf 's/ENABLED=no/ENABLED=yes/g'
service ufw restart

#replace /etc/init.d/redis-server 's/\/etc\/redis\/redis\.conf/\/opt\/captured\/etc\/redis.conf/g'
#mkdir -p /opt/captured/data/redis
#chown redis:redis /opt/captured/data/redis
#chmod 775 /etc/init.d/redis-server
#/etc/init.d/redis-server restart

