#!/usr/bin/env node

var fs = require('fs'),
    async = require('async'),
    muchmalaCommon = require('muchmala-common'),
    config = require('../config'),
    logger = muchmalaCommon.logger,
    generator = muchmalaCommon.puzzleGenerator,
    storageFactory = muchmalaCommon.storage,
    db = muchmalaCommon.db,
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
    .boolean('h'),

    argv = optimist.argv;

var PUZZLES_DIR = '/puzzles';
var COVERS_DIR = '/covers';

function main() {
    if (argv.help) {
        printHelp();
    }

    if (!argv._.length) {
        console.error('You did not specify any image.\n');
        printHelp();
    }

    logger.setLevel(argv.verbose ? logger.debug : logger.warning);

    var options = {
        private: argv.private
    };

    if (argv.name) {
        options.name = qrgv.name;
    }

    if (argv.piecesize) {
        options.pieceSize = argv.piecesize;
    }

    async.waterfall([function(callback) {
        storageFactory.createStorage(config.storage.type, config.storage[config.storage.type], callback);

    }, function(stor, callback){
        storage = stor;
        callback();

    }, function(callback) {
        db.connect(config.mongodb, callback);

    }, function(callback) {
        generatePuzzles(argv._, options, callback);

    }, function(imagesMetadata, callback) {
        var dirsToPutIntoStorage = [];

        for (var i = imagesMetadata.length; i--; ) {
            imagesMetadata[i].puzzleId = db.generateId();

            dirsToPutIntoStorage.push({
                src: imagesMetadata[i].resultDir,
                dst: PUZZLES_DIR + '/' + imagesMetadata[i].puzzleId
            });
        }

        saveToStorage(dirsToPutIntoStorage, imagesMetadata, callback);

    }, function(imagesMetadata, callback) {
        saveToDb(imagesMetadata, callback);

    }, function(imagesMetadata, callback) {
        var coversSizes = {};

        for (var i = imagesMetadata.length; i--; ) {
            coversSizes[imagesMetadata[i].pieceSize] = '';
        }

        callback(null, Object.keys(coversSizes));

    }, function(coversSizes, callback) {
        checkCoversExistence(coversSizes, function(err, coversToGenerate) {
            callback(null, coversToGenerate);
        });

    }, function(coversToGenerate, callback) {
        generateCovers(coversToGenerate, callback);

    }, function(coversMetadata, callback) {
        var dirsToPutIntoStorage = [];

        for (var i = coversMetadata.length; i--; ) {
            dirsToPutIntoStorage.push({
                src: coversMetadata[i].resultDir,
                dst: COVERS_DIR + '/' + coversMetadata[i].size
            });
        }

        saveToStorage(dirsToPutIntoStorage, {}, callback);

    }], function(err) {
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

function saveToStorage(dirs, imagesMetadata, callback) {
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
        callback(null, imagesMetadata);
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

function checkCoversExistence(coversSizes, callback) {
    var nonExistentCovers = [];
    async.forEachSeries(coversSizes, function(coversSize, callback) {
        storage.exists(COVERS_DIR + '/' + coversSize + '/default_covers.png', function(err, exists) {
            if (!exists) {
                nonExistentCovers.push(coversSize);
            }

            callback();
        });
    }, function() {
        callback(null, nonExistentCovers);
    });
}

function generateCovers(coversSizes, callback) {
    var coversMetadata = [];
    async.forEachSeries(coversSizes, function(coversSize, callback) {
        generator.createCovers(coversSize, function(err, metadata) {
            coversMetadata.push(metadata);
            callback();
        });
    }, function() {
        callback(null, coversMetadata);
    });
}

main();
