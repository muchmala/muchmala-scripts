var path = require('path');
var config = exports;

config.mongodb = {
    host:     '127.0.0.1',
    user:     'mongodb',
    database: 'muchmala'
};

config.storage = {
    type: 'file',
    file: {
        location: __dirname + '/webroot'
    },
    s3: {
        aws_key:    null,
        aws_secret: null,
        s3_bucket:  'static.dev.muchmala.com'
    }
};


var localConfigPath = './config.local.js';
if (path.existsSync(localConfigPath)) {
    var localConfig = require(localConfigPath),
        deepExtend = require('muchmala-common').misc.deepExtend;

    deepExtend(config, localConfig);
}
