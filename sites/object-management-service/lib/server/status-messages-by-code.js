export const statusMessagesByCode = new Map();

statusMessagesByCode.set(200, 'OK');
statusMessagesByCode.set(201, 'Created');
statusMessagesByCode.set(202, 'Accepted');
statusMessagesByCode.set(204, 'No Content');
statusMessagesByCode.set(301, 'Moved Permanently');
statusMessagesByCode.set(302, 'Found');
statusMessagesByCode.set(400, 'Bad Request');
statusMessagesByCode.set(401, 'Unauthorized');
statusMessagesByCode.set(403, 'Forbidden');
statusMessagesByCode.set(404, 'Not Found');
statusMessagesByCode.set(405, 'Method Not Allowed');
statusMessagesByCode.set(409, 'Conflict');
statusMessagesByCode.set(500, 'Internal Server Error');

/**
   10.1  Informational 1xx ...........................................57
   10.1.1   100 Continue .............................................58
   10.1.2   101 Switching Protocols ..................................58
   10.2  Successful 2xx ..............................................58
   10.2.1   200 OK ...................................................58
   10.2.2   201 Created ..............................................59
   10.2.3   202 Accepted .............................................59
   10.2.4   203 Non-Authoritative Information ........................59
   10.2.5   204 No Content ...........................................60
   10.2.6   205 Reset Content ........................................60
   10.2.7   206 Partial Content ......................................60
   10.3  Redirection 3xx .............................................61
   10.3.1   300 Multiple Choices .....................................61
   10.3.2   301 Moved Permanently ....................................62
   10.3.3   302 Found ................................................62
   10.3.4   303 See Other ............................................63
   10.3.5   304 Not Modified .........................................63
   10.3.6   305 Use Proxy ............................................64
   10.3.7   306 (Unused) .............................................64
   10.3.8   307 Temporary Redirect ...................................65
   10.4  Client Error 4xx ............................................65
   10.4.1    400 Bad Request .........................................65
   10.4.2    401 Unauthorized ........................................66
   10.4.3    402 Payment Required ....................................66
   10.4.4    403 Forbidden ...........................................66
   10.4.5    404 Not Found ...........................................66
   10.4.6    405 Method Not Allowed ..................................66
   10.4.7    406 Not Acceptable ......................................67
   10.4.8    407 Proxy Authentication Required .......................67
   10.4.9    408 Request Timeout .....................................67
   10.4.10   409 Conflict ............................................67
   10.4.11   410 Gone ................................................68
   10.4.12   411 Length Required .....................................68
   10.4.13   412 Precondition Failed .................................68
   10.4.14   413 Request Entity Too Large ............................69
   10.4.15   414 Request-URI Too Long ................................69
   10.4.16   415 Unsupported Media Type ..............................69
   10.4.17   416 Requested Range Not Satisfiable .....................69
   10.4.18   417 Expectation Failed ..................................70
   10.5  Server Error 5xx ............................................70
   10.5.1   500 Internal Server Error ................................70
   10.5.2   501 Not Implemented ......................................70
   10.5.3   502 Bad Gateway ..........................................70
   10.5.4   503 Service Unavailable ..................................70
   10.5.5   504 Gateway Timeout ......................................71
   10.5.6   505 HTTP Version Not Supported ...........................71
 */
