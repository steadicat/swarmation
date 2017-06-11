#!/bin/sh

replace() {
  cat $1 | sed "$2" > ~/tmp
  chmod 0644 ~/tmp
  mv -f ~/tmp $1
}

apt-get update -y
apt-get upgrade -y
apt-get autoremove -y
apt-get autoclean -y
which make || apt-get install -y make

#apt-get install -y build-essential
which unattended-upgrades || apt-get install -y unattended-upgrades

unattended-upgrades
dpkg-reconfigure -plow -f noninteractive unattended-upgrades

replace /etc/ssh/sshd_config 's/Port 22/Port 243/g'
service ssh restart

which nginx || apt-get install -y nginx
which node || apt-get install -y nodejs-legacy
which npm || apt-get install -y npm
which fail2ban || apt-get install -y fail2ban
#which pkg-config || apt-get install -y pkg-config

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

