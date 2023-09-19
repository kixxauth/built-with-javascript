Admin:CreateScopedToken
-----------------------
```
POST /admin-rpc

{"method": "createScopedToken", "params": {"scope": "SCOPE_ID"}}
```
An HTTPRequestEventTarget processes and validate the incoming HTTP request. It then creates an HTTPRequest object, HTTPResponse object, and attaches them to a RequestContext object. Lastly, the HTTPRequestEventTarget hands off the RequestContext object to a RoutesTable for routing to the appropriate endpoint on the AdminAPI singleton. Along the way, the HTTPRequestEventTarget wraps the endpoint to catch errors and route them back to the AdminAPI.

The AdminAPI has a single endpoint called handleRemoteProcedureCall which validates the JSON RPC and passes it along to the correct method.

Admin.createScopedToken
-----------------------

WriteServer:PutObject
---------------------
```
PUT /objects/:scope/:key

Authorization: Bearer [String token]
Content-Type: [MimeString contentType]
Content-Length: [Integer contentLength]
x-kc-storage-class: [Enum String STANDARD,INFREQUENT_ACCESS]
x-kc-video-processing: [Base64 encoded JSON]
```

### HTTPRequestEventTarget
An HTTPRequestEventTarget processes and validate the incoming HTTP request. It then creates an HTTPRequest object, HTTPResponse object, and attaches them to a RequestContext object. Lastly, the HTTPRequestEventTarget hands off the RequestContext object to a RoutesTable for routing to the appropriate endpoint on the HTTPWriteAPI singleton. Along the way, the HTTPRequestEventTarget wraps the endpoint to catch errors and route them back to the HTTPWriteAPI.

### HTTPWriteAPI.putObject(RequestContext)
userToken = RequestContext.getUserToken()
if not userToken then:
    throw AuthenticationError

user = await this.dataStore.fetch('user', userToken)
if not user then:
    throw AuthenticationError

scopeId = RequestContext.request.getPathnameParameter('scope')

assert.isNonEmptyString(scopeId)

scope = await this.dataStore.fetch('scope', scopeId)
if not scope then:
    throw NotFoundError

if not user.isAuthorizedForScope(scope) then:
    throw ForbiddenError

key = RequestContext.request.getPathnameParameter('key')

assert.isNonEmptyString(key)

contentType = RequestContext.request.getHeader('content-type')
storageClass = RequestContext.request.getHeader('x-kc-storage-class')
videoProcessingParameters = JSON.parse(base64Decode(RequestContext.request.getHeader('x-kc-video-processing')))
localObject = new StorageObject({ key, contentType, storageClass })

existingObjectPromise = this.objectStore.fetchHead(scope.id, key)

localObjectPromise = this.localStore.createObject(localObject, RequestContext.request.getReadStream())

existingObject, localObject = await Promise.all(existingObjectPromise, localObjectPromise)

if existingObject.etag equals localObject.etag then:
    return RequestContext.respondWithJSON(noop)

remoteObject = await this.objectStore.putObject(localObject, localObject.getReadStream())

if contentType.isVideo() and videoProcessingParameters then:
    job = new VideoProcessingJob({
        secrets: this.globalSecrets,
        object: remoteObject,
    })

    job.whenComplete.then(logSuccess, logFailure)

    job.enqueue()

    mediaObject = MediaObject.fromJob(job)

return RequestContext.respondWithJSON({
    etag: remoteObject.etag,
    version: remoteObject.version,
    urls: scope.getUrlsForObject(remoteObject),
    originUrls: remoteObject.createOriginUrls(this.globalConfig.getOriginBaseUrl()),
    processedMediaUrls: mediaObject.createOriginUrls(this.globalConfig.getOriginBaseUrl()),
})

OriginServer:GetObject
----------------------
`GET /origin/:scope/:pathname/:version/:filename`

### HTTPRequestEventTarget
An HTTPRequestEventTarget processes and validate the incoming HTTP request. It then creates an HTTPRequest object, HTTPResponse object, and attaches them to a RequestContext object. Lastly, the HTTPRequestEventTarget hands off the RequestContext object to a RoutesTable for routing to the appropriate endpoint on the HTTPOriginAPI singleton. Along the way, the HTTPRequestEventTarget wraps the endpoint to catch errors and route them back to the HTTPOriginAPI.

### HTTPOriginAPI.getObject(RequestContext)
originUrl = new OriginURL(RequestContext.request.url)

if not originUrl.filename then:
    throw NotFoundError

version = validateVersion(originUrl.version);
if not version then:
    throw NotFoundError

if not originUrl.scope then:
    throw NotFoundError

key = originUrl.pathname + originUrl.filename

object = await this.objectStore.fetchObject(originUrl.scope, key, version)

if not object then:
    throw NotFoundError

return RequestContext.respondWithStream(object)

