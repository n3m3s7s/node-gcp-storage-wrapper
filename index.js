import path from 'path';
import fs from 'fs';

function getArg(key, defaultValue) {
    var index = process.argv.indexOf(key);
    var next = process.argv[index + 1];
    return (index < 0) ? (defaultValue ? defaultValue : null) : (!next || next[0] === "-") ? true : next;
}

const params = {
    "action": getArg("action", 'listBuckets'),
    "keyFilename": getArg("keyFilename", path.dirname('.') + "/key.json"),
    "bucket": getArg("bucket"),
    "input": getArg("input"),
    "output": getArg("output"),
}

let action = null;

switch (params.action) {
    case 'list':
    case 'listBuckets':
        action = 'list';
        break;

    case 'upload':
        action = 'upload';
        break;
}

//console.log(params, 'PARAMS:');

if (null === action) {
    response(400, `You have to specify a valid action among: list|upload`);
}

// Imports the Google Cloud client library
import { Storage } from '@google-cloud/storage';

// Creates a client
const storage = new Storage({
    keyFilename: params.keyFilename
});

if ('list' === action) {
    list();
}

if ('upload' === action) {
    upload();
}

function response(status, data){
    const payload = {status, data};
    console.log(JSON.stringify(payload));
    process.exit();
}

function responseError(message){
    response(400, message);
}

async function list() {
    // [START storage_list_buckets]  
    
    async function listBuckets() {
        let list = [];
        const [buckets] = await storage.getBuckets();
        
        buckets.forEach(bucket => {
            list.push(bucket.name);
        });
        return list;
    }

    let list = await listBuckets().catch((e) => responseError(e.message));

    response(200, list);
    // [END storage_list_buckets]
}


async function upload() {
    // [START storage_upload_buckets]  
    if (null === params.input) {
        responseError(`You have to specify a valid "input" parameter`);
    }

    if (null === params.output) {
        responseError(`You have to specify a valid "output" parameter`);
    }

    if (null === params.bucket) {
        responseError(`You have to specify a valid "bucket" parameter`);
    }

    let filePath = params.input;
    const bucketName = params.bucket;
    const destFileName = params.output;
    const generationMatchPrecondition = 0;
    let message = null;

    async function uploadFile() {
        const options = {
            destination: destFileName,
            // Optional:
            // Set a generation-match precondition to avoid potential race conditions
            // and data corruptions. The request to upload is aborted if the object's
            // generation number does not match your precondition. For a destination
            // object that does not yet exist, set the ifGenerationMatch precondition to 0
            // If the destination object already exists in your bucket, set instead a
            // generation-match precondition using its generation number.
            //preconditionOpts: { ifGenerationMatch: generationMatchPrecondition },
        };

        await storage.bucket(bucketName).upload(filePath, options);
        return `${filePath} uploaded to gs://${bucketName}/${destFileName}`;
    }

    message = await uploadFile().catch((e) => responseError(e.message));

    response(200, message);
    // [END storage_copy_file]
}
