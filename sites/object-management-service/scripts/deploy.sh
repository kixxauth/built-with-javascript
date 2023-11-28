#!/bin/bash

# Must be run from the built-with-javascript/sites/object-management-service/ directory.
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

scp ./package.json wall-e-admin:/home/kris/webserver/sites/object-management-service/
scp ./README.md wall-e-admin:/home/kris/webserver/sites/object-management-service/
scp ./dependencies.js wall-e-admin:/home/kris/webserver/sites/object-management-service/
scp ./routes.js wall-e-admin:/home/kris/webserver/sites/object-management-service/
scp ./server.js wall-e-admin:/home/kris/webserver/sites/object-management-service/

rsync $opts ./config/ wall-e-admin:/home/kris/webserver/sites/object-management-service/config/
rsync $opts ./lib/ wall-e-admin:/home/kris/webserver/sites/object-management-service/lib/
rsync $opts ./vendor/ wall-e-admin:/home/kris/webserver/sites/object-management-service/vendor/

