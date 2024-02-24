TODO
====

- [x] Process a poster thumbnail image for processed videos.
- [x] Solve race condition when uploading an object: Avoid writing an object while a current write is in progress to the same object.
- [ ] Do not use an application config attribute like "environment". This must go (used for redirect to HTTPS).
- [ ] Return the full object, including media links and processed poster images, when the object upload is a no-op (object already exists).
- [ ] Validate the scope and key URL pathname parts to ensure safety and naming rules.
- [ ] Ensure contentLength is always included in write server responses.
- [ ] How do we inform clients when a job is complete or has aborted with an error?
