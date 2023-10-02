HTTP API
========
__TODO:__ These docs will need to be updated based on the actual approach taken.

Write Server API
----------------
The PutObject endpoint requires an HTTP Authorization header with a bearer token to allow access to any admin endpoint.

The token will be checked against the database to ensure it has write access to the specified scope. The token is checked by getting the admin database from S3 and checking for a simple `===` match. We are not concerned about replay attacks over HTTPS or lost access tokens for the first version of this service.

Tokens can be created by an admin using the Admin:ProvisionScopedToken API.

### PutObject
```
PUT /objects/:scope/:key

Authorization: Bearer [String token]
Content-Type: [MimeString contentType]
Content-Length: [Integer contentLength]
x-kc-storage-class: [Enum String STANDARD,INFREQUENT_ACCESS]
x-kc-video-processing: [Base64 encoded JSON]
```

- Authorization: Use the provided API token.
- Conent-Type: Use a standard mime string.
- Content-Length: Standard HTTP content-length header measured in bytes.
- x-kc-storage-class: A String included in the enum STANDARD or INFREQUENT_ACCESS.
- x-kc-video-processing: A JSON object String serialized as a Base64 String.

Validate the scope and key URL pathname parts to ensure safety and naming rules.

Read the admin database from S3. Check to ensure the provided token has access to the given scope.

If the content type is a video, then check the `x-kc-video-processing` instructions to set up a MediaConvert job. When setting up the MediaConvert job use the `x-kc-storage-class` value to set the output storage class for S3. If there are no `x-kc-video-processing` instructions then follow the normal procedure to store the object in S3.

__NOTE:__ For the first version of this service there we do not provide a way for clients to obtain status updates for the video processing jobs.

#### VideoProcessingInstructions
Base64 encode the JSON string. These are the defaults:

```json
{
    "type": "MP4_H264_AAC",
    "video": {
        "width": 852,
        "height": 480,
        "qualityLevel": 7,
        "autoRotate": true,
    },
    "audio": {}
}
```

For more information about resolution and QVBR see the [MediaConvert documentation](https://docs.aws.amazon.com/mediaconvert/latest/ug/cbr-vbr-qvbr.html).

If the content type is not a video or there are no `x-kc-video-processing` instructions then check the `x-kc-storage-class` and put the object to S3.

Admin Server API
----------------
Each admin endpoint requires an HTTP Authorization header with a bearer token to allow access to any admin endpoint.

The token is checked by getting the admin database from S3 and checking for a simple `===` match. We are not concerned about replay attacks over HTTPS or lost access tokens for the first version of this service.

### Admin:Home
`GET /admin`

Returns HTML; List all scopes in the database and provides a tool for creating scoped tokens for write API access.

The entire admin database is stored as a JSON object in S3. In this database object all the scopes are listed. Render the first Admin:ListObjects page link for each scope in the database.

### Admin:ListObjects
`GET /admin/objects?page_limit=integer&start_after_key=encodedString&scope=string`

Returns HTML; a list of links to object keys which can be used to view objects with `Admin:ViewObject`. Each object key can be expanded to show the available versions for the object.

Uses the S3 REST API listVersions action to list object keys and versions using the scope, startAfterKey, and pageLimit parameters. Parses the XML response from the S3 REST API, which returns the key and version IDs for each object, but *not* the metadata. Resolve the Admin:ViewObject link for each key and print it out in the HTML.

__NOTE:__ This will return keys for all versions of a particular object.

### Admin:ViewObject
`GET /admin/objects/:key/:version?`

Returns HTML; Display the object. Images and video are shown along with metadata, while other objects show only metadata. Objects in the ARCHIVE and DEEP_ARCHIVE storage classes are not shown, but provide a link to download them.

Uses the S3 REST API. Make a HEAD request to S3 to get metadata for the specified key and version. If no version is specified, then get the latest version by default. Use object metadata to render the appropriate HTML for each instance of the object, and provide download or playable links from the CDN or origin server.

### Admin:CreateScopedToken
```
POST /admin-rpc

{"method": "createScopedToken", "params": {"scopeId": "SCOPE_ID"}}
```

Returns JSON; `{ "result": {"scopeId": "SCOPE_ID","token": "TOKEN_STRING"}}`

Fetch the admin database object. If the scope does not exist in the database, then create it. Then generate a UUID as a token and accociate it with the scope in the database before saving it back to S3.

Origin Server API
-----------------
The origin server has one purpose: Serve objects from S3 out on HTTP for CDNs to consume.

### GET
`GET /origin/:scope/:pathname/:version/:filename`

Fetch the latest version of the object from S3 and stream it back out. The :pathname + :filename make up the S3 key. The :version can be set to the string "latest" to get the latest version.
