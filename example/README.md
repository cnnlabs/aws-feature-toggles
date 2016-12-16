## running the examples

To run the examples, you'll need to open 2 terminals and open a browser to http://localhost:3000/

```
# run the server in the first terminal
DEBUG=aws-feature-toggles:* AWS_PROFILE=<Your AWS profile name> node example/server.js

# run the utility in the second terminal
AWS_PROFILE=snssqs node example/util.js
```

####notes:####
The page is hard coded to use the username "bob@gmail.com".

The utility allows you to enable and disable 3 demo features. You use a regular expression to specify who is allowed to access each feature. The system allows multiple regular expressions for matching multiple users, etc.

The page should refresh automatically when you toggle the features "blueText" or "showPhoto", using a websocket.

The page also has a link to a "/test" route, behind the toggle "testRoute" that can be toggled on and off. (This requires a refresh to see.)
