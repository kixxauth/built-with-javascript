#!/bin/bash

# Must be run from the built-with-javascript/sites/test/ directory.
# The wall-e-admin SSH alias must be set up.

scp ./package.json wall-e-admin:/home/kris/webserver/sites/test/
scp ./server.js wall-e-admin:/home/kris/webserver/sites/test/
scp ./index.html wall-e-admin:/home/kris/webserver/sites/test/
scp ./README.md wall-e-admin:/home/kris/webserver/sites/test/

