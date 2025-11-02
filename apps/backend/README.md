### Different Codes

1xx Informational responses: These indicate that the request was received and the server is continuing the process.

- 100 Continue: The client should continue with its request.
- 101 Switching Protocols: The server is switching protocols as requested by the client.

2xx Success responses: These indicate that the client's request was successfully received, understood, and accepted.

- 200 OK: The request succeeded.
- 201 Created: The request succeeded, and a new resource was created.
- 204 No Content: The server successfully processed the request, but there is no content to return.

3xx Redirection messages: These indicate that the client needs to take further action to complete the request, usually by redirecting to a different URL.

- 301 Moved Permanently: The requested resource has been moved permanently to a new URL.
- 302 Found (Temporary Redirect): The requested resource has been temporarily moved to a different URL.
- 304 Not Modified: The resource has not been modified since the last request.

4xx Client error responses: These indicate that there was an error in the client's request.

- 400 Bad Request: The server cannot process the request due to a client error (e.g., malformed syntax).
- 401 Unauthorized: The client needs to authenticate to get the requested response.
- 403 Forbidden: The client does not have access rights to the content.
- 404 Not Found: The server cannot find the requested resource.

5xx Server error responses: These indicate that the server failed to fulfill a valid request.

- 500 Internal Server Error: A generic error message indicating an unexpected condition on the server.
- 502 Bad Gateway: The server, acting as a gateway or proxy, received an invalid response from an upstream server.
- 503 Service Unavailable: The server is currently unable to handle the request due to temporary overload or maintenance.

# Different routes

## User Auth Routes

- /api/send-otp - POST  
  Request -> body : { "email":"example@mail.com" }  
  Response -> Success : code-204 - No content to return.  
  Failure : code-400 : { "success" : false, "message":"Error message" }

- /api/verify-otp - POST  
  Request -> body : { "email":"example@mail.com", "otp":"123456" }  
  Response -> Success : code-200 - { "success" : true, "token":"JWT Token" }  
  Failure : code-400 : { "success" : false, "message":"Error message" }

- /api/logout - POST  
  Request -> header : { "authentication" : "Bearer Token" }, body : { "email":"example@mail.com" }  
  Response -> Success : code-204 - No content to return.  
  Failure : code-400 : { "success" : false, "message":"Error message" }
