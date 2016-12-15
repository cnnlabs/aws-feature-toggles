'use strict';

const sinon = require('sinon');
const chai = require('chai');
chai.should();

const config = {};

config.dynamodb = {
    region: 'us-west-2',
    endpoint: 'http://localhost:8000'
};

config.sns = {
    region: 'us-west-2',
};

config.sqs = {
    region: 'us-west-2',
};

config.toggles = {
    system: 'aws-feature-toggles-test'
};

const toggles = require('../index')(config);


describe('feature toggles', function () {

    after(function (cb) {
        const AWS = require('aws-sdk');
        const dbClient = new AWS.DynamoDB(config.dynamodb);
        dbClient.deleteTable({TableName: 'features'}, cb);
    });

    it('should initialize if table does not exist', function (done) {
        toggles.init((err) => {
            done(err);
        });
    });

    it('should initialize if table does exist', function (done) {
        toggles.init((err) => {
            done(err);
        });
    });

    it('should create toggles', function (done) {
        toggles.put('testFeature', ['sarah.*'], (err) => {
            done(err);
        });
    });

    it('should return true if a toggle is enabled', function () {
        const enabled = toggles.check('testFeature', 'sarah@gmail.com');
        (enabled).should.be.true;
    });

    it('should return false if a toggle is not enabled', function () {
        const enabled = toggles.check('testFeature', 'bob@gmail.com');
        (enabled).should.be.false;
    });

    it('should return false if a toggle does not exist', function () {
        const enabled = toggles.check('testFeature2', 'bob@gmail.com');
        (enabled).should.be.false;
    });

    it('should update toggles', function (done) {
        toggles.put('testFeature', ['bob.*'], () => {
            const enabled = toggles.check('testFeature', 'bob@gmail.com');
            (enabled).should.be.true;
            done();
        });
    });

    it('should load data', function (done) {
        toggles.load((err) => {
            done(err);
        });
    });

    describe('listening for changes from other systems', function () {
        const toggles2 = require('../index')(config);
        sinon.spy(toggles2, 'load');

        it('should process reload messages', function (done) {
            toggles2.init(() => {
                toggles.put('testFeature3', ['sarah.*'], (err) => {
                    (toggles2.load.callCount === 2).should.be.true;
                    done(err);
                });
            });
        });

        it('should continue to process after 20 secs', function (done) {
            setTimeout(function () {
                toggles.put('testFeature4', ['sarah.*'], (err) => {
                    setTimeout(function () {
                        (toggles2.load.callCount >= 4).should.be.true;
                        done(err);
                    }, 3 * 1000);
                });
            }, 21 * 1000);
        });
    });
});
