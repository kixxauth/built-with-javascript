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
- [ ] Handle aborted requests in Kixx (see TODO in server.js)
- [ ] Redirect to HTTPS. In the Kixx router?
- [ ] Ensure pages are cacheable when appropriate.
- [ ] Add a pageImage to each page record (for social card image - get from site owners).
- [ ] Use dynamic page title and description for observation detail pages.
- [ ] Implement BlobStore for content management of snippets.

### Pick my Poison

1. Disable the Back/Save/Next buttons - User Experience Ok - Requires creating an object to track all photo uploads
2. Update media items in the background - User Experience Good - Requires creating an object to track all photo uploads (super fragile)
3. Update media items 1 by 1 - User Experience Good - Requires updating the service to remove media items in a different way. Will still require tracking uploads to enable navigating away from the observation photos form section.
