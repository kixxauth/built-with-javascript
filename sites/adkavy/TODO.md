TODO
====

- [x] Implement DataStore events used for cache busting.
- [x] Optionally turn off static asset HTTP caching (for development).
- [x] Observation travel mode is not saving.
- [x] Remove photo does not do anything.
- [ ] Disable remove button until images upload.
- [ ] Disable buttons while images and videos upload.
- [ ] Why can't we upload HEIF images? (observation 58)
- [ ] Add a save button.
- [ ] Redirect to HTTPS. In the Kixx router?
- [ ] Ensure pages are cacheable when appropriate.
- [ ] Add a pageImage to each page record (for social card image - get from site owners).
- [ ] Use dynamic page title and description for observation detail pages.
- [ ] Handle aborted requests in Kixx (see TODO in server.js)
- [ ] Implement BlobStore for content management of snippets.

### Pick my Poison

1. Disable the Back/Save/Next buttons - User Experience Ok - Requires creating an object to track all photo uploads
2. Update media items in the background - User Experience Good - Requires creating an object to track all photo uploads (super fragile)
3. Update media items 1 by 1 - User Experience Good - Requires updating the service to remove media items in a different way. Will still require tracking uploads to enable navigating away from the observation photos form section.
