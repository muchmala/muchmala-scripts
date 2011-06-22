#!/usr/bin/env node

var fs = require('fs'),
    async = require('async'),
    config = require('../config'),
    common = require('muchmala-common'),
    generator = common.puzzleGenerator,
    logger = common.logger,
    db = common.db,
    storage;
    
var optimist = require('optimist')
    .usage('Usage: $0 <path/to/image> [-n "Puzzle Name"] [-x <num>] [-p] [-v]')

    .describe('n', 'Puzzle name. If not specified, file name will be used.')
    .alias('n', 'name')

    .describe('x', 'Size of a puzzle element.')
    .alias('x', 'piecesize')

    .describe('p', 'Flag, marks puzzle as private.')
    .alias('p', 'private')
    .boolean('p')

    .describe('v', 'Flag, makes output verbose')
    .alias('v', 'verbose')
    .boolean('v')

    .describe('h', 'Prints this message')
    .alias('h', 'help')
    .boolean('h');

var PUZZLES_DIR = '/puzzles';
var COVERS_DIR = '/covers';
var FRAMES_DIR = '/frames';

function main(argv) {
    
    if (argv.help || argv._.length == 0) {
        printHelp();
    }

    logger.setLevel(argv.verbose ? logger.debug : logger.warning);

    var options = {
        private: argv.private
    };

    if (argv.name) {
        options.name = argv.name;
    }
    if (argv.piecesize) {
        options.pieceSize = argv.piecesize;
    }

    async.waterfall([function(callback) {
        async.waterfall([
            function(callback) {
                var type = config.storage.type;
                var credentials = config.storage[type];
                common.storage.createStorage(type, credentials, callback);        
            },
            function(createdStorage, callback) {
                storage = createdStorage;
                db.connect(config.mongodb, callback);    
            }
        ], callback);
    }, 
    function(callback) {
        generatePuzzles(argv._, options, callback);
    },
    function(imagesMetadata, callback) {
        imagesMetadata.forEach(function(metadata) {
            metadata.puzzleId = db.generateId();
        });
        
        var dirsToPutIntoStorage = imagesMetadata.map(function(metadata) {
            return {src: metadata.resultDir, dst: PUZZLES_DIR + '/' + metadata.puzzleId};
        });

        async.waterfall([
            function(callback) {
                saveToStorage(dirsToPutIntoStorage, callback);
            },
            function(callback) {
                saveToDb(imagesMetadata, callback);
            }
        ], function() {
            callback(null, imagesMetadata);
        });
    }, 
    function(imagesMetadata, callback) {
        var pieceSizes = imagesMetadata.reduce(function(memo, metadata) {
            if (memo.indexOf(metadata.pieceSize) == -1) {
                memo.push(metadata.pieceSize);
            }
            return memo;
        }, []);
        
        async.waterfall([
            function(callback) {
                checkCoversExistence(pieceSizes, function(err, notExist) {
                    generateCovers(notExist, callback);
                });
            },
            function(coversMetadata, callback) {
                var dirsToPutIntoStorage = coversMetadata.map(function(metadata) {
                    return {src: metadata.resultDir, dst: COVERS_DIR + '/' + metadata.size};
                });

                saveToStorage(dirsToPutIntoStorage, callback);
            },
            function(callback) {
                checkFramesExistence(pieceSizes, function(err, notexist) {
                    generateFrames(notexist, callback);
                });
            },
            function(framesMetadata, callback) {
                var dirsToPutIntoStorage = framesMetadata.map(function(metadata) {
                    return {src: metadata.resultDir, dst: FRAMES_DIR + '/' + metadata.size};
                });

                saveToStorage(dirsToPutIntoStorage, callback);
            }
        ], callback);
    }], 
    function(err) {
        if (err) {
            logger.error(err);
            process.exit(1);
        }

        console.log('DONE!');
        process.exit(0);
    });
}

function printHelp() {
    optimist.showHelp(console.error);
    process.exit();
}

function generatePuzzles(images, options, callback) {
    var imagesMetadata = [];

    async.forEachSeries(images, function(image, callback) {
        generator.createPuzzle(image, options, function(err, metadata) {
            if (err) {
                logger.error("Failed to generate puzzle from image", image);
                logger.error(err);
            } else {
                logger.info('Image ' + image + ' is processed');
                imagesMetadata.push(metadata);
            }

            callback();
        });
    }, function() {
        logger.info("All images are generated");
        callback(null, imagesMetadata);
    });
}

function saveToStorage(dirs, callback) {
    async.forEachSeries(dirs, function(dir, callback) {
        fs.readdir(dir.src, function(err, files) {
            if (err) {
                return callback(err);
            }

            async.forEachSeries(files, function(file, callback) {
                logger.debug("Saving ", dir.src + '/' + file, "to storage");
                storage.put(dir.src + '/' + file, dir.dst + '/' + file, callback);
            }, callback);
        });
    }, function(err) {
        if (err) {
            logger.error(err);
            return callback(err);
        }

        logger.info("All images are saved to storage");
        callback(null);
    });
}

function saveToDb(imagesMetadata, callback) {
    var queueIndexes = {};
    logger.info("Saving metadata to db");

    async.forEachSeries(imagesMetadata, function(metadata, callback) {
        db.Puzzles.add(metadata.piecesMap, {
            id: metadata.puzzleId,
            name: metadata.name,
            invisible: metadata.invisible,
            pieceSize: metadata.pieceSize,
            spriteSize: metadata.spriteSize,
            hLength: metadata.hLength,
            vLength: metadata.vLength
        }, function(added, queueIndex) {
            logger.info("Puzzle " + metadata.puzzleId + " is added to database. Queue index: " + queueIndex);
            queueIndexes[metadata.puzzleId] = queueIndex;
            callback();
        });
    }, function() {
        logger.info("All images are saved to db");
        console.log('Queue indexes:', queueIndexes);
        callback(null, imagesMetadata);
    });
}

function checkCoversExistence(sizes, callback) {
    var nonExistentCovers = [];
    async.forEachSeries(sizes, function(size, callback) {
        storage.exists(COVERS_DIR + '/' + size + '/default_covers.png', function(err, exists) {
            if (!exists) {
                nonExistentCovers.push(parseInt(size));
            }
            callback();
        });
    }, function() {
        callback(null, nonExistentCovers);
    });
}

function checkFramesExistence(sizes, callback) {
    var nonExistentFrames = [];
    async.forEachSeries(sizes, function(size, callback) {
        storage.exists(FRAMES_DIR + '/' + size + '/frame.png', function(err, exists) {
            if (!exists) {
                nonExistentFrames.push(parseInt(size));
            }
            callback();
        });
    }, function() {
        callback(null, nonExistentFrames);
    });
}

function generateCovers(sizes, callback) {
    var coversMetadata = [];
    async.forEachSeries(sizes, function(size, callback) {
        generator.createCovers(size, function(err, metadata) {
            coversMetadata.push(metadata);
            callback();
        });
    }, function() {
        callback(null, coversMetadata);
    });
}

function generateFrames(sizes, callback) {
    var framesMetadata = [];
    async.forEachSeries(sizes, function(size, callback) {
        generator.createFrame(size, function(err, metadata) {
            framesMetadata.push(metadata);
            callback();
        });
    }, function() {
        callback(null, framesMetadata);
    });
}

main(optimist.argv);
