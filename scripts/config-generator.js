var pathToConfig = '../config.js';
var config = require(pathToConfig);

var rcFilePath = config.rcFile;

require('fs').writeFileSync(rcFilePath, JSON.stringify(config, null, 1));
