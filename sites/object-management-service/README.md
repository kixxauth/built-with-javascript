# Object Management Service
A web service for processing and storing objects we use on the web like images, video, and asset files.

Installation
------------
Copy `package.json`, `server.js`, `routes.js`, `dependencies.js`, `lib/**`, `vendor/**` and `config/**` to the install target directory. It *is* necessary to run `npm install --omit=dev` to install required dependencies.

Deployment
----------
```
$ ./scripts/deploy.sh
```

Read the comments in `./scripts/deploy.sh` for more information.

Run the Server
--------------
Specify an environment. Allowed values for the `environment` option are "development" or "production". The default value is "development".

### Development
```
$ node server.js
```

Will start in the default "development" environment.

### Production

```
$ node ./sites/object-management-service/server.js --environment production
```

Will start in the the "production" environment.

Designed to be run behind the Edge Server proxy server. See the [Edge Server README](../../edge-server/README.md) for more information.

Configuration
-------------
The `--environment` option is used to load the config file by the same name from `./sites/object-management-service/config/`.

Development and Testing
-----------------------

### Linting
- Linting is provided by eslint and the `.eslintrc.cjs` config file.
- Run `npm run lint` to run the linter.

### Unit Tests
- Unit tests are in the `tests/` folder.
- Run `npm run unit-tests` to run the tests.
- This project uses an ad-hoc "test framework" to run tests. Check in `tests/run-tests.js` to see how it works.
- New tests must be added to `tests/run-tests.js`. There is no automatic test file importing.

### End to End Tests and Sanity Checks
- End to end tests are in `end-to-end-tests/`. The folder contains standalone scripts for each test or sanity check.
- Most tests require the database to be seeded. To seed the database, manually upload the file(s) from `seeds/` to the appropriate AWS S3 bucket location.

Copyright
---------
[Built With JavaScript](https://wwww.builtwithjavascript.us) © 2023 by [Kris Walker](https://www.kriswalker.me) is licensed under [Attribution-ShareAlike 4.0 International](http://creativecommons.org/licenses/by-sa/4.0/). To view a copy of this license, visit [http://creativecommons.org/licenses/by-sa/4.0/](http://creativecommons.org/licenses/by-sa/4.0/)
