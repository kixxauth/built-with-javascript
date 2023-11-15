export default class StaticFileServer {

    serveFile(request, response, options) {
        console.log('OPTIONS', options);

        return response.respondWithPlainText(200, 'Hello world!');
    }
}
