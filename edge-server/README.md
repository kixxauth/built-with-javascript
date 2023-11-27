Edge Server
===========

Public facing server which acts as a proxy server to the application servers.

Built on Node.js, designed to be extremely simple, with no dependencies.

Installation
------------
Copy `start.js`, `package.json` (to put Node.js into module loading mode instead of cjs), `lib/**`, and `config/**` to the install target directory. It is *NOT* necessary to run `npm install`.

Deployment
----------
```
$ ./scripts/deploy.sh
```

Read the comments in `./scripts/deploy.sh` for more information.

Run the Server
--------------
Point it at a configuration file:

### Development

```
$ node start.js test-configs/echo-command-line-args.json
```

### Production

```
$ authbind --deep node ./edge-server/start.js config/production.json
```

The `authbind` command allows us to run the server on port 80 and 443 without root privileges.

### Production with detatched session

```
$ nohup authbind --deep node ./edge-server/start.js config/production.json &
```

The `nohup` command allows us to exit the terminal without killing the server; also made possible by the `&` at the end.

Configuration
-------------
```json
{
    // Directory where SSL certificates are kept.
    "certDirectory": "/Users/kwalker/Projects/Kris/bwj/edge-server/test-configs/certificates",
    // An encryptedServer port MUST be provided.
    "encryptedServer": {
        "port": 3443
    },
    // An unencryptedServer port MUST be provided.
    "unencryptedServer": {
        "port": 3080
    },
    "virtualHosts": [
        {
            // The port the application server is expected to be running on.
            "port": 8001,
            // The command to invoke in the shell.
            "command": "node test-configs/servers/echo-command-line-args.js arg-1 arg-2",
            // Hostnames and corresponding certificate names which get routed to this virtual host.
            "hostnames": [
                {
                    "hostname": "localhost",
                    "certname": "self-signed"
                }
            ]
        }
    ]
}
```

__SSL Certificates__ in the certDirectory must be named by the `virtualHosts[].hostnames[].certname` string. Using the example config above:

```
test-configs/certificates/
├── self-signed.cert
└── self-signed.key
```

This server actually runs 2 servers: __1 Encrypted (SSL) Server__ and __1 Unencrypted Server__. Both `encryptedServer.port` and `unencryptedServer.port` must be defined. There are no defaults for these values.

Any number of __Virtual Hosts__ can be run. Each one must have a configured `port`, CLI `command`, and `hostnames` for which it answers, including the relavant `certname` if applicable.

The system process for each virtual host will be invoked in the default shell using the `command` string, complete with command line arguments. File paths are relative to the current working directory. Both stdout and stderr are piped through to the parent process (the "edge server").

Starting, Stopping, and Restarting Processes
--------------------------------------------
At this point there is no way to start, stop, or restart child processes independently of the main edge server process. To restart a process, all processes must be restarted.

Copyright
---------
[Built With JavaScript](https://wwww.builtwithjavascript.us) © 2023 by [Kris Walker](https://www.kriswalker.me) is licensed under [Attribution-ShareAlike 4.0 International](http://creativecommons.org/licenses/by-sa/4.0/). To view a copy of this license, visit [http://creativecommons.org/licenses/by-sa/4.0/](http://creativecommons.org/licenses/by-sa/4.0/)
