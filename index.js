import path from "path";
import fs from "fs";
import { EventEmitter } from "events";

// Alza il limite per nascondere il warning interno di GCP
EventEmitter.defaultMaxListeners = 20;

function getArg(key, defaultValue) {
  var index = process.argv.indexOf(key);
  var next = process.argv[index + 1];
  return index < 0
    ? defaultValue
      ? defaultValue
      : null
    : !next || next[0] === "-"
    ? true
    : next;
}

const params = {
  action: getArg("action", "listBuckets"),
  keyFilename: getArg("keyFilename", path.dirname(".") + "/key.json"),
  bucket: getArg("bucket"),
  input: getArg("input"),
  output: getArg("output"),
};

let action = null;

switch (params.action) {
  case "list":
  case "listBuckets":
    action = "list";
    break;

  case "files":
  case "listFiles":
    action = "files";
    break;

  case "upload":
    action = "upload";
    break;

  case "download":
    action = "download";
    break;
}

//console.log(params, 'PARAMS:');

if (null === action) {
  response(
    400,
    `You have to specify a valid action among: list|listBuckets|files|listFiles|upload|download`
  );
}

// Imports the Google Cloud client library
import { Storage } from "@google-cloud/storage";

// Creates a client
process.env.GOOGLE_APPLICATION_CREDENTIALS = params.keyFilename;

// Inizializza il client vuoto (leggerà l'ambiente in automatico senza generare warning)
const storage = new Storage();

if ("list" === action) {
  list();
}

if ("files" === action) {
  files();
}

if ("upload" === action) {
  upload();
}

if ("download" === action) {
  download();
}

function response(status, data) {
  const payload = { status, data };
  console.log(JSON.stringify(payload));
  process.exit();
}

function responseError(message) {
  response(400, message);
}

async function list() {
  // [START storage_list_buckets]

  async function listBuckets() {
    let list = [];
    const [buckets] = await storage.getBuckets();

    buckets.forEach((bucket) => {
      list.push(bucket.name);
    });
    return list;
  }

  let list = await listBuckets().catch((e) => responseError(e.message));

  response(200, list);
  // [END storage_list_buckets]
}

async function files() {
  // [START storage_files]

  if (null === params.bucket) {
    responseError(`You have to specify a valid "bucket" parameter`);
  }
  if (null === params.input) {
    responseError(`You have to specify a valid "input" parameter`);
  }

  const bucketName = params.bucket;
  const options = {
    prefix: params.input
  };

  async function listFiles() {
    let list = [];
    // Lists files in the bucket
    const [files] = await storage.bucket(bucketName).getFiles(options);
    //console.log({bucketName, options, files}, 'Response');

    files.sort((a, b) => {
        if (a.metadata.updated > b.metadata.updated) {
            return 1;
        }
        if (a.metadata.updated < b.metadata.updated) {
            return -1;
        }
        return 0;
    });

    files.forEach((file) => {
      list.push(file.name);
    });
    return list;
  }

  let list = await listFiles().catch((e) => responseError(e.message));

  response(200, list);
  // [END storage_files]
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
  let message = null;
  //console.log({bucketName, filePath, destFileName});

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

async function download() {
  // [START storage_download]
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
  let message = null;

  async function downloadFile() {
    const options = {
      destination: destFileName,
    };

    await storage.bucket(bucketName).file(filePath).download(options);
    return `gs://${bucketName}/${filePath} ${filePath} downloaded to ${destFileName}`;
  }

  message = await downloadFile().catch((e) => responseError(e.message));

  response(200, message);
  // [END storage_download]
}
