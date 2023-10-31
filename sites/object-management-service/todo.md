TODO
====

- [x] Mark public methods on all classes. Assume unmarked methods should be considered private.
- [x] In AdminRPCTarget:createScopedToken(), if the requested scope does not exist, then create it.
- [x] Record HTTP request ID in logs when applicable.
- [x] Include the origin server URLs in the write object response.
- [x] Include the imgIX URLs in the write object response.
- [x] Update the API docs.
- [ ] Redirect admin and write server API endpoints to https:
- [ ] Implement the origin server endpoint.
- [ ] Validate the scope and key URL pathname parts to ensure safety and naming rules.
- [ ] Solve race condition when uploading an object: Avoid writing an object while a current write is in progress to the same object.
