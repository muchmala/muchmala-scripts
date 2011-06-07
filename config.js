var path = require('path');
var config = exports;

config.rcFile = process.env.HOME + '/.muchmala_scripts_rc';

config.mongodb = {
    host:     '127.0.0.1',
    user:     'mongodb',
    database: 'muchmala'
};

config.storage = {
    type: 'file',
    file: {
        location: './webroot'
    },
    s3: {
        key:    null,
        secret: null,
        bucket: 'taras.muchmala.com'
    }
};


var localConfigPath = './config.local.js';
if (path.existsSync(localConfigPath)) {
    var localConfig = require(localConfigPath),
        deepExtend = require('muchmala-common').misc.deepExtend;

    deepExtend(config, localConfig);

} else if (path.existsSync(config.rcFile)) {
    var localConfig = JSON.parse(require('fs').readFileSync(config.rcFile, 'utf8')),
        deepExtend = require('muchmala-common').misc.deepExtend;

    deepExtend(config, localConfig);
}
