TODO
====

- [x] Implement DataStore events used for cache busting.
- [x] Optionally turn off static asset HTTP caching (for development).
- [x] Observation travel mode is not saving.
- [x] Remove photo does not do anything.
- [x] Disable remove button until images upload.
- [x] Disable buttons while images and videos upload.
- [x] Why can't we upload HEIF images? (observation 58)
- [x] Add a save button.
- [ ] Videos which have already been processed are not returned with posterURLs (Leaving open: This is only an issue when the same file is uploaded more than once. It will need to be fixed in the Object Management Service).
- [ ] Redirect to HTTPS. In the Kixx router?
- [ ] Ensure pages are cacheable when appropriate.
- [ ] Handle aborted requests in Kixx (see TODO in server.js). Also need to abort any requests in progress (ex: to the Object Management Service).
- [ ] Add a pageImage to each page record (for social card image - get from site owners).
- [ ] Use dynamic page title and description for observation detail pages.
- [ ] Implement BlobStore for content management of snippets.
