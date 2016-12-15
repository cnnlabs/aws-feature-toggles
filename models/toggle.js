'use strict';

const pkg = require('../package');
const debug = require('debug')(`${pkg.name}:model`);
const AWS = require('aws-sdk');

const tableSchema = {
    TableName: 'features',
    KeySchema: [
        {
            AttributeName: 'system',
            KeyType: 'HASH' // Partition key
        },
        {
            AttributeName: 'feature',
            KeyType: 'RANGE' // Sort key
        }
    ],
    AttributeDefinitions: [
        {
            AttributeName: 'system',
            AttributeType: 'S' // String
        },
        {
            AttributeName: 'feature',
            AttributeType: 'S' // String
        }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 100,
        WriteCapacityUnits: 10
    }
};

function ToggleDB(config) {
    this.config = config;
    this.dbClient = new AWS.DynamoDB(config.dynamodb);
    this.docClient = new AWS.DynamoDB.DocumentClient(config.dynamodb);
}

ToggleDB.prototype.createTable = function createTable(cb) {
    this.dbClient.createTable(tableSchema, cb);
};

ToggleDB.prototype.describeTable = function describeTable(cb) {
    this.dbClient.describeTable({TableName: tableSchema.TableName}, cb);
};

ToggleDB.prototype.init = function init(cb) {
    this.describeTable((err) => {
        if (err && err.name === 'ResourceNotFoundException') {
            return this.createTable(cb);
        } else if (err) {
            return cb(err);
        }
        return cb();
    });
};

ToggleDB.prototype.put = function put(feature, targets, cb) {
    const params = {
        TableName: tableSchema.TableName,
        Item: {
            system: this.config.toggles.system,
            feature: feature,
            targets: targets
        }
    };
    debug(`put ${JSON.stringify(params)}`);
    this.docClient.put(params, cb);
};

ToggleDB.prototype.load = function load(cb) {
    debug('Loading toggles from dynamoDB');
    this.docClient.scan({TableName: tableSchema.TableName}, (err, data) => {
        if (err) {
            return cb(err);
        }
        debug(`data ${JSON.stringify(data)}`);
        const response = {};
        data.Items.forEach((item) => {
            if (item.system === this.config.toggles.system) {
                response[item.feature] = item.targets;
            }
        });
        cb(null, response);
    });
};

module.exports = ToggleDB;
