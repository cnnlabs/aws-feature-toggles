# aws-feature-toggles

This is a module that provides feature toggle capability for distributed systems, using only AWS services (DynamoDB, SNS, SQS).

Features can be enabled based on a name, and a regular expression. For example:

```
const config = {
    dynamodb: {
        region: 'us-west-2',
        endpoint: 'http://localhost:8000'
    },
    sns: {
        region: 'us-west-2'
    },
    sqs: {
        region: 'us-west-2'
    },
    toggles: {
        system: 'mocha-test'
    }
}
const toggles = require('aws-feature-toggles')(config);

toggles.init(() => {
    toggles.put('testFeature', ['sarah.*'], () => { // notice the array of regex patterns
        const enabled = toggles.check('testFeature', 'sarah@gmail.com');
        // enabled should be true, because the email address matches the regular expression
    });
});
```

Of course, the target can be anything, not just email addresses. Use ```['.*']``` to match anything.

- **config.toggles** is used internally by this module.
- **config.dynamodb** is passed into the underlying AWS SDK. See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html for options.
- **config.sns** is passed into the underlying AWS SDK. See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SNS.html for options.
- **config.sqs** is passed into the underlying AWS SDK. See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html for options.

## Prep
Log into your AWS console and create a new user in IAM. Make sure you save the users credientials.
Attach the User Policies for Amazon SQS Full Access and Amazon SNS Full Access.  

Create ~/.aws/credentials

Add the access key and secret access key for the IAM user you just created.
```
[snssqs]
aws_access_key_id = <YOUR_ACCESS_KEY_ID>
aws_secret_access_key = <YOUR_SECRET_ACCESS_KEY>
```

## Install Packages

npm install

### Testing

This module requires AWS credentials to run integration tests. Run as follows (using your own AWS profile name):

```
AWS_PROFILE=<aws profile name> npm test
```

This module uses the debug module. If you want to see more of what it is doing internally, run with the DEBUG variable like so:
```
DEBUG=* AWS_PROFILE=<aws profile name> npm test
```

### Inspiration

Borrowed heavily from https://github.com/markcallen/snssqs for SNS and SQS messaging components.
