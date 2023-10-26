TODO
====

- [x] Mark public methods on all classes. Assume unmarked methods should be considered private.
- [x] In AdminRPCTarget:createScopedToken(), if the requested scope does not exist, then create it.
- [ ] Update the design docs.
- [ ] Update the API docs.
- [ ] Solve race condition when uploading an object: Avoid writing an object while a current write is in progress to the same object.
