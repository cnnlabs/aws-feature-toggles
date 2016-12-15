'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;
const AWS = require('aws-sdk');
const pkg = require('../package');
const debug = require('debug')(`${pkg.name}:messenger`);
const async = require('async');
const NodeCache = require('node-cache');

function Messenger(config) {
    this.sns = new AWS.SNS(config.sns);
    this.sqs = new AWS.SQS(config.sqs);
    this.config = config;
    this.cache = new NodeCache({stdTTL: 60, checkperiod: 20});
    this.instanceId = config.instanceId;
    EventEmitter.call(this);
}

util.inherits(Messenger, EventEmitter);

Messenger.prototype.subscribe = function subscribe() {
    const messenger = this;
    const receiveMessageParams = {
        QueueUrl: this.config.QueueUrl,
        MaxNumberOfMessages: 1
    };

    function getMessages() {
        messenger.sqs.receiveMessage(receiveMessageParams, receiveMessageCallback);
    }

    function receiveMessageCallback(err, data) {
        if (data && data.Messages && data.Messages.length > 0) {
            data.Messages.forEach((messageObject) => {
                const messageBody = JSON.parse(messageObject.Body);
                const messageId = messageBody.MessageId;
                const instanceId = messageBody.Message;
                messenger.cache.get(messageId, (err, value) => {
                    if (!err && value === undefined && instanceId !== messenger.instanceId) {
                        debug(`Received non-cached messageId: ${messageId}`);
                        messenger.cache.set(messageId, instanceId);
                        messenger.emit('toggles:reload', messageId, instanceId);
                    }
                });
            });

        }
        setTimeout(getMessages, 1000).unref();
    }
    getMessages();
};

Messenger.prototype.publish = function publish(message, cb) {
    const publishParams = {
        TopicArn: this.config.TopicArn,
        Message: message
    };

    debug(`Publishing message ${JSON.stringify(publishParams)}`);

    this.sns.publish(publishParams, cb);
};

Messenger.prototype.init = function init(cb) {
    const messenger = this;
    // create sns topic
    function createTopic(cb) {
        messenger.sns.createTopic({
            Name: messenger.config.toggles.system
        }, function (err, result) {
            if (err) {
                debug(`Error creating Topic ${messenger.config.toggles.system}: ${err}`);
                return cb(err);
            }
            debug(`Create SNS Topic result: ${JSON.stringify(result)}`);
            messenger.config.TopicArn = result.TopicArn;
            cb();
        });
    }
    // create sqs queue
    function createQueue(cb) {
        messenger.sqs.createQueue({
            QueueName: messenger.config.toggles.system,
            Attributes: {
                VisibilityTimeout: '0', // allows other systems to get the message immediately
                ReceiveMessageWaitTimeSeconds: '20',
                MessageRetentionPeriod: '60'
            }
        }, function (err, result) {
            if (err) {
                debug(`Error creating Queue: ${err}`);
                return cb(err);
            }
            debug(`Create SQS Queue result: ${JSON.stringify(result)}`);
            messenger.config.QueueUrl = result.QueueUrl;
            cb();
        });
    }
    // get queue attributes
    function getQueueAttr(cb) {
        messenger.sqs.getQueueAttributes({
            QueueUrl: messenger.config.QueueUrl,
            AttributeNames: ['QueueArn']
        }, function (err, result) {
            if (err) {
                debug(`Error getting queue attributes: ${err}`);
                return cb(err);
            }
            debug(`Get SQS Queue Attributes result: ${JSON.stringify(result)}`);
            messenger.config.QueueArn = result.Attributes.QueueArn;
            cb();
        });

    }
    // subscribe queue to sns topic
    function snsSubscribe(cb) {
        messenger.sns.subscribe({
            TopicArn: messenger.config.TopicArn,
            Protocol: 'sqs',
            Endpoint: messenger.config.QueueArn
        }, function (err, result) {
            if (err) {
                debug(`Error subscribing to topic: ${err}`);
                return cb(err);
            }
            debug(`SNS Subscribe result: ${JSON.stringify(result)}`);
            cb();
        });

    }
    // update queue attributes to set policy
    function setQueueAttr(cb) {
        const queueUrl = messenger.config.QueueUrl;
        const topicArn = messenger.config.TopicArn;
        const sqsArn = messenger.config.QueueArn;

        const attributes = {
            Version: '2008-10-17',
            Id: `${sqsArn}/SQSDefaultPolicy`,
            Statement: [{
                Sid: `Sid${new Date().getTime()}`,
                Effect: 'Allow',
                Principal: {
                    AWS: '*'
                },
                Action: 'SQS:SendMessage',
                Resource: sqsArn,
                Condition: {
                    ArnEquals: {
                        'aws:SourceArn': topicArn
                    }
                }
            }]
        };

        messenger.sqs.setQueueAttributes({
            QueueUrl: queueUrl,
            Attributes: {
                Policy: JSON.stringify(attributes)
            }
        }, function (err, result) {
            if (err) {
                debug(`Error setting queue attributes: ${err}`);
                return cb(err);
            }
            debug(`SQS Set Queue Attributes result: ${JSON.stringify(result)}`);
            cb();
        });

    }

    async.series([createTopic, createQueue, getQueueAttr, snsSubscribe, setQueueAttr], cb);
};

module.exports = Messenger;
