'use strict';

const action = process.argv[2];
const feature = process.argv[3];
const target = process.argv[4];

function usage() {
    console.log('Usage: node examples/util.js [action] [feature] [regex]');
    console.log('   node examples/util.js enable blueText "bob.*"');
    console.log('   node examples/util.js disable blueText "bob.*"');
    console.log('   node examples/util.js enable showPhoto "bob.*"');
    console.log('   node examples/util.js disable showPhoto "bob.*"');
    console.log('   node examples/util.js enable testRoute ".*"');
    console.log('   node examples/util.js disable testRoute ".*"');
    process.exit();
}
if (!action || !feature || !target) {
    usage();
} else if (action !== 'enable' && action !== 'disable') {
    usage();
} else if (feature !== 'blueText' && feature !== 'showPhoto' && feature !== 'testRoute') {
    usage();
}

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

console.log(action, feature, target);
const toggles = require('../index')(config);
toggles.init((err) => {
    if (err) {
        throw err;
    }
    const currentSetting = toggles.toggles[feature] || [];
    const i = currentSetting.indexOf(target);
    if (action === 'enable') {
        if (i < 0) {
            currentSetting.push(target);
        }
    } else {
        currentSetting.splice(i, 1);
    }
    toggles.put(feature, currentSetting, (err) => {
        if (err) {
            console.error(err);
        }
        console.log('Updated', feature, currentSetting);
    });
});
