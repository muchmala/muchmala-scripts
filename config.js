var config = exports;

config.mongodb = {
    host:     process.env.MUCHMALA_MONGODB_HOST || '127.0.0.1',
    user:     process.env.MUCHMALA_MONGODB_USER || 'mongodb',
    database: process.env.MUCHMALA_MONGODB_DATABASE || 'muchmala'
};

config.storage = {
    type: process.env.MUCHMALA_STORAGE_TYPE || 'file',
    file: {
        location: process.env.MUCHMALA_STORAGE_FILE_LOCATION || '/opt/muchmala/webroot'
    },
    s3: {
        key:    process.env.MUCHMALA_STORAGE_S3_KEY || null,
        secret: process.env.MUCHMALA_STORAGE_S3_SECRET || null,
        bucket: process.env.MUCHMALA_STORAGE_S3_BUCKET || 'dev.muchmala.com'
    }
};
