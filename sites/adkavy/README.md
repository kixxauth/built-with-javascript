ADK Avy
=======

Installation
------------
Copy `package.json`, `server.js`, `routes.js`, `dependencies.js`, `lib/**`, `vendor/**`, `pages/**`, `templates/**`, `public/**` and `config/**` to the install target directory. It *is* necessary to run `npm install` or `npm install --omit=dev` to install required dependencies.

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
$ node ./sites/adkavy/server.js --environment production
```

Will start in the the "production" environment.

Designed to be run behind the Edge Server proxy server. See the [Edge Server README](../../edge-server/README.md) for more information.

Configuration
-------------
The `--environment` option is used to load the config file by the same name from `./sites/adkavy/config/`.

Development and Testing
-----------------------

### Linting
- Linting is provided by eslint and the `.eslintrc.cjs` config file.
- Run `npm run lint` to run the linter.


Database Schema
---------------
Using AWS DynamoDB, AWS S3, and local file system as the backing datastores; DynamoDB for structured data (Observations and Events), and S3 for text data (content snippets) and local file system for page data.

### Operations
- List Observations by page, sorted by observation date.
- View an Observation, including associated images and videos.
- Create or update an Observation.
- Add photos or videos to an Observation.
- List IncidentReports by page, sorted by creation date.
- View an IncidentReport, including associated images and videos.
- Create or update an IncidentReport.
- Add photos or videos to an IncidentReport.
- Get a Page and parent Page objects in a single request.
- Update Page attributes.
- Add Photos or Videos to a page.

### Entities Table

| Specialty     | Attribute | Type   |
|---------------|-----------|--------| 
| Partitian Key |        id | String |
| Sort Key      |      type | String |

### Entities Index

| Specialty     | Attribute | Type   |
|---------------|-----------|--------| 
| Partitian Key |   queryId | String |
| Sort Key      |  queryKey | String |

### List Observations by page, sorted by obsevation date.
Query Entities Index PK = "observations-by-observation-date".

### View an Observation
Get item from Entities Table where PK = id.

### Create or update an Observation.
Put item to Entities Table; set PK = id, SK = type, queryId = "observations-by-observation-date", queryKey = observationDate.

### Add photos or videos to an Observtion.
Photos are nested on Observations. See *Create or Update and Observation*.

### List IncidentReports by page, sorted by incident date.
Query Entities Index PK = "incident-reports-by-report-date".

### View an IncidentReport
Get the text blob from S3 by key.

### Create or update an IncidentReport.
1. Create the text blob and store it on S3 at `incident-reports/*`.
2. Put item to Entities Table; set PK = id, SK = type, queryId = "incident-reports-by-report-date", queryKey = reportDate.

### Add photos or videos to an IncidentReport.
Photos are nested on Incident Reports. See *Create or Update and IncidentReport*.

Uploading Observation Photos
----------------------------
User generated content

### Sequence Diagram
title Observation Photo Upload

participant Browser
participant ADK Avy Server
participant Object Management Service

note over Browser: Upload photo to Observation
Browser->ADK Avy Server: POST /observations/:id/photos
ADK Avy Server->Object Management Service: Passthrough photo
note over Object Management Service: Store to S3 and process video
Object Management Service->ADK Avy Server: Return ID and URLs
note over ADK Avy Server: Store photo info on Observation
ADK Avy Server->Browser: Return photo ID
note over Browser: Upload photo metadata
Browser->ADK Avy Server: PATCH /observations/:id/photos/:id
note over ADK Avy Server: Update photo info
