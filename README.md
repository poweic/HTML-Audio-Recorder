===== Install mongodb-10gen =====
Ref: http://askubuntu.com/questions/61503/how-to-start-mongodb-server-on-system-start
1) sudo apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10
2) add "deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen"
   to /etc/apt/sources.list
3) sudo apt-get update && sudo apt-get install mongodb-10gen

===== Run mongodb server =====
sudo mongod --dbpath /var/lib/mongodb/ --smallfiles&

Just `./go` to run server
