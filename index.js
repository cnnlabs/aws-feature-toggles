'use strict';

const pkg = require('./package');
const debug = require('debug')(pkg.name);
const ToggleDB = require('./models/toggle.js');
const Messenger = require('./lib/messenger');
const uuid = require('node-uuid');

function Toggles(config) {
    if (!(this instanceof Toggles)) {
        return new Toggles(config);
    }
    this.model = new ToggleDB(config);
    config.instanceId = uuid.v4();
    this.messenger = new Messenger(config);
    this.toggles = {};
    this.instanceId = config.instanceId;
}

function getRegex(string) {
    return new RegExp(string);
}

Toggles.prototype.init = function (cb) {
    debug('init');
    this.messenger.init((err) => {
        if (err) {
            return cb(err);
        }
        this.messenger.on('toggles:reload', (messageId, instanceId) => {
            debug(`Got msg id: ${messageId} from ${instanceId}, reloading`);
            this.load();
        });
        this.messenger.subscribe();
        this.model.init((err) => {
            if (err) {
                return cb(err);
            }
            return this.load(cb);
        });
    });
};

Toggles.prototype.load = function (cb) {
    debug('load');
    this.model.load((err, data) => {
        this.toggles = data;
        if (cb) {
            return cb();
        }
    });
};

Toggles.prototype.put = function (feature, targets, cb) {
    debug('put');
    this.model.put(feature, targets, (err) => {
        if (err) {
            return cb(err);
        }
        this.toggles[feature] = targets;
        this.messenger.publish(this.instanceId, cb);
    });
};

Toggles.prototype.check = function (feature, target) {
    debug('check');
    debug(`toggles: ${JSON.stringify(this.toggles)}`);
    if (this.toggles[feature]) {
        var status = false;
        this.toggles[feature].forEach((t) => {
            debug(`Checking ${feature}, ${target}, ${t}`);
            var rt = getRegex(t);
            if (target.match(rt)) {
                status = true;
            }
        });
        return status;
    }
    return false;
};

module.exports = Toggles;
