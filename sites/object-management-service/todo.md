TODO
====

- [x] Mark public methods on all classes. Assume unmarked methods should be considered private.
- [x] In AdminRPCTarget:createScopedToken(), if the requested scope does not exist, then create it.
- [x] Record HTTP request ID in logs when applicable.
- [x] Include the origin server URLs in the write object response.
- [x] Include the imgIX URLs in the write object response.
- [x] Update the API docs.
- [x] Redirect admin and write server API endpoints to https:
- [x] Implement the origin server endpoint.
- [x] Use default LastModified date in RemoteObject.updateFromS3Put()
- [x] Handle written objects with no key (only a filename).
- [x] Include processed video endpoints in WriteServer response.
- [x] Process a poster thumbnail image for processed videos.
- [x] Allow users to set MaxBitrate on video transcode.
- [ ] Set the environment when starting the server.
- [ ] Validate the scope and key URL pathname parts to ensure safety and naming rules.
- [x] Solve race condition when uploading an object: Avoid writing an object while a current write is in progress to the same object.
