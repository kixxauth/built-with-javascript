#!/bin/bash

# Must be run from the built-with-javascript/edge-server/ directory.
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

scp ./package.json wall-e-admin:/home/kris/webserver/edge-server/
scp ./start.js wall-e-admin:/home/kris/webserver/edge-server/
scp ./README.md wall-e-admin:/home/kris/webserver/edge-server/

rsync $opts ./config/ wall-e-admin:/home/kris/webserver/edge-server/config/
rsync $opts ./lib/ wall-e-admin:/home/kris/webserver/edge-server/lib/

