#!/bin/bash

# Must be run from the built-with-javascript/sites/adkavy/ directory.
# The wall-e-admin SSH alias must be set up.

opts="\
--delete \
--recursive \
--update \
--links \
--perms \
--times \
--owner \
--group \
--progress \
--omit-dir-times \
--checksum \
--human-readable \
"

scp ./package.json wall-e-admin:/home/kris/webserver/sites/adkavy/
scp ./README.md wall-e-admin:/home/kris/webserver/sites/adkavy/
scp ./dependencies.js wall-e-admin:/home/kris/webserver/sites/adkavy/
scp ./routes.js wall-e-admin:/home/kris/webserver/sites/adkavy/
scp ./server.js wall-e-admin:/home/kris/webserver/sites/adkavy/

rsync $opts ./config/ wall-e-admin:/home/kris/webserver/sites/adkavy/config/
rsync $opts ./lib/ wall-e-admin:/home/kris/webserver/sites/adkavy/lib/
rsync $opts ./vendor/ wall-e-admin:/home/kris/webserver/sites/adkavy/vendor/

