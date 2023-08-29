# Object Management Service
A web service for processing and storing objects we use on the web like images, video, and asset files.

## Use Cases
All use cases are multitenant; meaning that many sites will be using this service and expect data to be segmented into virtual silos.

- Store images which ultimately get vended out to an image processing service like [imgix](https://imgix.com)
- Store web assets like CSS and JavaScript bundles to get vended out to CDNs.
- Process and store videos through [AWS MediaConvert](https://aws.amazon.com/mediaconvert/).

## Enforcing Multitenancy
Each site which hosts objects on the Object Management Service will be assigned a "scope" and must not be allowed to write objects to another site scope. Writing data to the service will require an authentication token. Write URLs (POST and PUT methods) will always indicate the scope as part of the path; example:

```
PUT /api/:scope/images/my-image.jpg
```

When writing to a scoped URL the client must provide an authentication token in the HTTP Authorization header to prevent unauthorized access to their scope.

## Idempotency
Once an object is written to the service it cannot be updated. This is done to preserve strong version control and caching. If we have an updated version of `my-image.jpg` to replace our old one, then we upload it to the service using a PUT request to the same URL, but the service will create a new version of it without overwriting the previous version. It does this by using a hash function to determine if the object has changed.

## Admin Panel
There is an admin panel which allows an authenticated admin user to view all stored objects across all scopes.

Copyright
---------
[Built With JavaScript](https://wwww.builtwithjavascript.us) © 2023 by [Kris Walker](https://www.kriswalker.me) is licensed under [Attribution-ShareAlike 4.0 International](http://creativecommons.org/licenses/by-sa/4.0/). To view a copy of this license, visit [http://creativecommons.org/licenses/by-sa/4.0/](http://creativecommons.org/licenses/by-sa/4.0/)
