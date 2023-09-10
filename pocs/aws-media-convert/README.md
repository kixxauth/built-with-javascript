# POC: AWS MediaConvert

## Objectives

- [x] Capture and upload videos from mobile and desktop to our POC Node.js server.
- [x] Forward uploaded video files to S3 storage using the AWS JavaScript SDK.
- ~~[ ] Trigger several different MediaConvert jobs to output each video file into several different formats we want to test.~~
- ~~[ ] Store the access information for each media output to disk from the Node.js server so we can list them out later.~~
- ~~[ ] Serve a page from the Node.js server which lists out all the completed MediaConvert jobs.~~
- ~~[ ] Include a video player in the web page which allows us to playback each media output to compare them.~~
- ~~[ ] Display metrics on the web page as the video plays to read out video start time, resolution, and bitrate.~~

## Approach

- [x] Create a Node.js server which serves a static `index.html` file from disk.
- [x] Add file upload capability using an HTML form in the `index.html` page.
- [x] Use the Node.js server to write the file to disk just to prove it is working as expected.
- [x] Add a file name field to the upload form in the `index.html` page.
- [x] Use the Node.js server and AWS SDK to upload the file to S3.
- ~~[ ] Write the file metadata to disk as a Video object in JSON.~~
- [x] Use the Node.js server and AWS SDK to start a simple AWS MediaConvert job to transcode the video file to an mp4 for testing.
- ~~[ ] Update the Video JSON object on disk with the MediaConvert job info.~~
- ~~[ ] Move the file upload form from `index.html` to `upload.html`.~~
- ~~[ ] Update the `index.html` page to read the Video objects from disk and list them.~~
- ~~[ ] When a user chooses a video object listed on `index.html` then stream the video mp4 file from S3 through the Node.js server to play in the browser.~~
