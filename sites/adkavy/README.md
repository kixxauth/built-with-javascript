ADK Avy
=======

Database Schema
---------------
Using AWS DynamoDB and AWS S3 as the backing datastores; DynamoDB for structured data (Page data and Observations), and S3 for text data (IncidentReports and content snippets).

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
1. Put Photo to Entities Table; set PK = id, SK = type, queryId = "photos-by-creation-date", queryKey = creationDate.
2. Put updated item to Entities Table.

### List IncidentReports by page, sorted by incident date.
Query Entities Index PK = "incident-reports-by-report-date".

### View an IncidentReport
Get the text blob from S3 by key.

### Create or update an IncidentReport.
1. Create the text blob and store it on S3 at `incident-reports/*`.
2. Put item to Entities Table; set PK = id, SK = type, queryId = "incident-reports-by-report-date", queryKey = reportDate.

### Add photos or videos to an IncidentReport.
1. Put Photo to Entities Table; set PK = id, SK = type, queryId = "photos-by-creation-date", queryKey = creationDate.
2. Put updated text blob to S3 at `incident-reports/*`.

### Get a Page and parent Page objects in a single request.
Get item from Entities table where PK = id.

### Update Page attributes.
1. Put item to Entities Table; set PK = id, SK = type, queryId = "page-parent", queryKey = parentId.
2. Get all pages which consider this page as parent; Query Entities Index PK = "page-parent", SK = this.id.
3. Recompute child pages. Then for each child page, goto #2 above.

### Add Photos or Videos to a page.
1. Put Photo to Entities Table; set PK = id, SK = type, queryId = "photos-by-creation-date", queryKey = creationDate.
2. Put item to Entities Table; set PK = id, SK = type, queryId = "page-parent", queryKey = parentId.
3. Get all pages which consider this page as parent; Query Entities Index PK = "page-parent", SK = this.id.
4. Recompute child pages. Then for each child page, goto #3 above.
