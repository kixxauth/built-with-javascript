Test Site
=========
A simple HTTP server for testing new Edge Proxy Server deployments.

Designed to be run behind the Edge Server proxy server. See the [Edge Server README](../../edge-server/README.md) for more information.

## Installation
Copy `server.js`, `package.json` (to put Node.js into module loading mode instead of cjs), and `index.html` to the install target directory. It is *NOT* necessary to run `npm install`.

Deployment
----------
```
$ ./scripts/deploy.sh
```

Read the comments in `./scripts/deploy.sh` for more information.

Copyright
---------
[Built With JavaScript](https://wwww.builtwithjavascript.us) © 2023 by [Kris Walker](https://www.kriswalker.me) is licensed under [Attribution-ShareAlike 4.0 International](http://creativecommons.org/licenses/by-sa/4.0/). To view a copy of this license, visit [http://creativecommons.org/licenses/by-sa/4.0/](http://creativecommons.org/licenses/by-sa/4.0/)
