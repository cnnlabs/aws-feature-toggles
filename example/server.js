'use strict';

const region = 'us-west-2';
const config = {
    dynamodb: {
        region,
        endpoint: 'http://localhost:8000'
    },
    sns: {region},
    sqs: {region},
    toggles: {
        system: 'aws-feature-toggles-example' // this needs to be unique per environment!
    }
};
const toggles = require('../index')(config);

const express = require('express');
const app = express();
app.use(express.static('example/public'));
// express route example:
// will enable the route when toggled on
function testRoute(req, res, next) {
    if (toggles.check('testRoute', 'public')) {
        return res.status(200).send('Route enabled');
    }
    next();
}
app.use('/test', testRoute);
const server = require('http').createServer(app);

// socket.io example:
// use the utility to enable things on the page without a page refresh
const io = require('socket.io')(server);
toggles.init((err) => {
    if (err) {
        throw err;
    }
    server.listen(3000);
});

io.on('connection', function (client) {
    console.log('client connected');

    // when client requests the status of a feature
    // respond with the status
    client.on('toggles:check', function (data) {
        const featureName = data.featureName;
        const target = data.target;
        console.log('client sent toggles:check', featureName, target);
        if (featureName && target) {
            io.emit('toggles:check', {
                featureName,
                target,
                response: toggles.check(featureName, target)
            });
        }
    });
    client.on('disconnect', function () {
        console.log('client disconnected');
    });
    toggles.on('toggles:loaded', function () {
        console.log('server got toggles:loaded, emitting to client');
        io.emit('toggles:reload');
    });
});
