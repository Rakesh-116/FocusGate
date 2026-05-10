Being Zero Coding Guidelines
(Original Doc)


“Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live”
― John Woods (https://groups.google.com/g/comp.lang.c++/c/rYCO5yn4lXw/m/oITtSkZOtoUJ)
Coding Guidelines
While configuring API urls, only use the API URL (without URI) in config.url. Don’t use API (URI) calls in the variable. 
Example: Instead of JUDGE0_API=https://api.judge0.com/api/problem. Set JUDGE0_API_ENDPONT=api.judge0.com and then use it as https://$api.judge0.com/api/problem
Have comments in your code. Comments should be brief and concise to explain what is being done. 
(Ref: https://daily.dev/blog/10-code-commenting-best-practices-for-developers)
Title. Each file should have a title comment, giving a brief description of what this file does.
Abstraction for DB and API connections.
Essentially, not just use variables for connection end-points. Expose the functionalities via functions and use them in the code, instead of implementing them directly inside the business logic. This way, if we have to replace the API service provider, we just have to change the functions and not the business logic.
Function and variable names should be self explanatory and avoid using generic names.
Ref: https://dev.to/pacheco/how-do-you-name-things-3jae
Don’t create too many functions.
Exception handling at every external connection or possibility of failure
Assume every external call will fail and handle it accordingly. API/DB (Exceptions as well as logic should be built to deal with connection failures).
For external API calls, have keepalive & timeouts to ensure threads are not waiting forever for response in case of an issue on the other side.
Log information instead of just dumping exceptions. In case of exception, give some error message (should include the function and class name which has failed) along with the exception.
Support log levels. Logging should support log levels of INFO, ERROR and DEBUG with the ability to enable/disable each level from the config file. (DEBUG should include detailed contents of all the activity and its data in each step).
Do not put sensitive information (password, keys, secrets, etc.) in logs.
Support log destinations. A parameter in the config file to set the destination of logs, it can be console or a file on the local system.
Standardized spacing in the code.
Do not store credentials/keys/secrets in code. Keep them in configurable environments.
Don’t hardcode values in the code. Instead use variables. For example: Timeouts/keepalives, Values of external sites data (language id and status id for Judge0)
Reduce DB calls. Wherever possible cache data, optimize logic to reduce DB calls.
Cache invalidation should be done whenever data is modified/deleted.
Cached data should have appropriate expiry times.
Make use of client side storage (session and local).
When doing joins in DB query, always mention the table name while using the columns. (eg: if you want the status column of the problem table, use it as problem.status instead of just status. This will ensure that things don’t break if we add new columns in future.)
While sending data in API response, send only required data (formatted properly in json), instead of dumping the entire database query response.
While fetching data from DB, apply appropriate filters to only fetch the required data, instead of fetching all and filtering in the app.
While using libraries use Lazy Loading (specifically for frontend). This ensures the main.js file is lightweight and the site is more responsive. Ref article on Lazy loading - https://certificates.dev/blog/dynamic-imports-in-javascript-load-smarter-not-sooner
Optimizing Java Script
Prefer using int instead of strings if possible. ( faster compare)
Strictly define arguments of a function to avoid optional params. 
Define interfaces for object input and avoid optional fields. ( better engine performance as object shape is presumed by engine)
In arrays, use imperative loops instead of functional loops(map, filter, reduce) ( less memory taken)
Use direct access(store child value in a separate variable) instead of nested access  for object when using the same object child value repeatedly in a loop. 
Retrieve smallest amount of data possible (L1, L2, L3, RAM)
Iterate object values directly instead of fetching each of them by key 
Use data structures wherever possible
Refer https://twitter.com/adamwathan/status/1773668592325722362?t=80VUCkMvF0F4TTo-86d8og&s=19 (https://romgrk.com/posts/optimizing-javascript) for detailed explanation.
API documentation guidelines:
Registration
Authenticated - Yes
Method - POST
Endpoint  - /api/firebase/register/mobile
Parameters - None
Payload ( json) - 
{
 email:”abc@gmail.com”,
 deviceToken:”123abdkcb$wiwe”
}

Headers - 
Key: Google-Token
Value: Complete “credential” object in json format.

Responses
400 - Invalid payload (email, token missing).
401 - Unauthorized user. Register on mentorpick.com
500 - Internal server error. Please retry later or contact admin.
200 - Device registration successful

Fetch Notification History 
Authenticated - Yes
Method - GET
Endpoint  - /api/firebase/mobile/fetch/notification/history
Payload - None
Parameters - ?deviceToken=<DEVICETOKEN>

Headers - 
Key: Google-Token
Value: Complete “credential” object in json format.

Responses (Codes)
400 - Invalid payload (token missing).
401 - Device Token not found.
500 - Internal server error. Please retry later or contact admin.
200 - success

Response (Data is list of notifications sent in last 30 days)
{ 
  “message”: [
     {
        “title”: “Hello World”,
        “body”: “Hellow World”,
        “timestamp”: “IST time of message”
     },
    {
        “title”: “Hello World2”,
        “body”: “Hellow World2”,
        “timestamp”: “IST time of message”
     }
  ]
}

