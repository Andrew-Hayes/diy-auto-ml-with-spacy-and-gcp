const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase)
const db = admin.firestore();
const path = require('path');
const os = require('os');
const fs = require('fs');
const csv = require('csv-parser')
const { GoogleAuth } = require('google-auth-library');

let auth;

const projectID = "diy-auto-ml"
const datasetBucket = "diy-auto-ml-dataset-datasets"

exports.build_updated = functions.region('europe-west1').pubsub.topic('cloud-builds').onPublish((message) => {
    // These options will allow temporary read access to the file
    const buildMessage = message.json ? message.json : undefined;
    console.log(buildMessage);
    if (buildMessage) {
        const datasetID = buildMessage.tags[0]
        const datasetRef = db.collection('datasets').doc(datasetID)
        const modelRef = db.collection('models').doc()
        if (buildMessage.status == "FAILURE") {
            return datasetRef.update({
                state: "ERROR",
                message: "Error building model",
                last_update: Math.round((new Date()).getTime() / 1000)
            }).catch((err) => {
                console.error(err)
            })
        } else if (buildMessage.status == "SUCCESS") {
            console.log("getting auth client")
            if (!auth) {
                auth = new GoogleAuth({
                    scopes: 'https://www.googleapis.com/auth/cloud-platform'
                });
            }
            let model_url;
            let model_stats;
            return auth.getClient()
                .then((client) => {
                    console.log("got client, getting url for model")
                    var options = { url: `https://europe-west1-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${projectID}/services/${buildMessage.tags[1]}` };
                    return client.request(options);
                }).then((res) => {
                    console.log("got cloud run data")
                    console.log(res.data)
                    model_url = res.data.status.url
                    var options = { url: `${model_url}/stats` };
                    return client.request(options);
                }).then((res) => {
                    console.log("got cloud run stats")
                    console.log(res.data)
                    model_stats = res.data
                    return datasetRef.get()
                }).then((doc) => {
                    const datasetData = doc.data()
                    return modelRef.set({
                        owner: datasetData.owner,
                        dataset: datasetData.name,
                        datasetDoc: doc.id,
                        created_at: Math.round((new Date()).getTime() / 1000),
                        last_update: Math.round((new Date()).getTime() / 1000),
                        model_url: model_url,
                        model_stats: model_stats,
                        modelName: buildMessage.tags[1],
                    })
                }).then(() => {
                    return datasetRef.update({
                        state: "MODEL_READY",
                        last_update: Math.round((new Date()).getTime() / 1000),
                        model_url: model_url,
                        model_name: buildMessage.tags[1],
                        model_id: modelRef.id,
                        model_stats: model_stats
                    })
                }).then(() => {
                    console.log("FIN")
                }).catch((err) => {
                    reject(err)
                })
        }
    }
});

exports.test_model = functions.region('europe-west1').https.onCall((data, context) => {
    if (!context.auth) {
        console.log('Not authed');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    // Message text passed from the client.
    const modelURL = data.modelURL || "";
    if (modelURL === "") {
        console.log('empty model url!');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a valid model url');
    }

    const text = data.text || "";
    if (text === "") {
        console.log('empty text!');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with valid text');
    }

    if (!auth) {
        auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
    }
    return auth.getClient()
        .then((client) => {
            console.log("got client")
            var options = { 
                method: 'POST',
                url: `${modelURL}/`,
                data: {
                    payload: text
                }
            };
            return client.request(options);
        }).then((res) => {
            console.log(res.data)
            return res.data
        }).catch((err) => {
            console.error(err)
        })
});

exports.train_model = functions.region('europe-west1').https.onCall((data, context) => {
    if (!context.auth) {
        console.log('Not authed');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    // Message text passed from the client.
    const datasetID = data.datasetID || "";
    if (datasetID === "") {
        console.log('empty document!');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a valid document id');
    }
    // Authentication / user information is automatically added to the request.
    let signedURL = ""
    const email = context.auth.token.email || null;
    let docData = {}
    return db.collection('datasets').doc(datasetID).get().then((doc) => {
        if (!doc.exists) {
            console.log('No such document!');
            // Throwing an HttpsError so that the client gets the error details.
            throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
                'with a valid document id');
        }
        docData = doc.data()
        if (email !== docData.owner) {
            console.log('Not the owner');
            // Throwing an HttpsError so that the client gets the error details.
            throw new functions.https.HttpsError('failed-precondition', 'Owner of the document must' +
                'initiate training');
        }
        return db.collection('datasets').doc(datasetID).update({
            state: "TRAINING",
            last_update: Math.round((new Date()).getTime() / 1000)
        })
    }).then(() => {
        // doc is legit and user is the owner...
        console.log('creating url');
        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 20 * 60 * 1000, // 15 minutes
        };
        // Get a v4 signed URL for reading the file
        return admin.storage().bucket("diy-auto-ml-dataset-datasets").file(`${docData.id}.csv`).getSignedUrl(options)
    }).then(([url]) => {
        console.log('Generated GET signed URL:');
        console.log(url);
        signedURL = url
        if (!auth) {
            auth = new GoogleAuth({
                scopes: 'https://www.googleapis.com/auth/cloud-platform'
            });
        }
        return auth.getClient()
    }).then((client) => {
        const buildRequest = {
            "source": {
                "repoSource": {
                    "projectId": "diy-auto-ml",
                    "repoName": "github_andrew-hayes_diy-auto-ml-with-spacy-and-gcp",
                    "dir": "containers/classifier",
                    "branchName": "master"
                }
            },
            "steps": [
                {
                    "name": "gcr.io/cloud-builders/docker",
                    "args": [
                        "build",
                        "-t",
                        `gcr.io/diy-auto-ml/classifier:${datasetID}`,
                        ".",
                        "--build-arg",
                        `dataset_url=${signedURL}`
                    ]
                },
                {
                    "name": "gcr.io/cloud-builders/docker",
                    "args": [
                        "push",
                        `gcr.io/diy-auto-ml/classifier:${datasetID}`
                    ]
                },
                {
                    "name": "gcr.io/cloud-builders/gcloud",
                    "args": [
                        "run",
                        "deploy",
                        `model-${datasetID.toLowerCase()}`,
                        "--image",
                        `gcr.io/diy-auto-ml/classifier:${datasetID}`,
                        "--region",
                        "europe-west1",
                        "--platform",
                        "managed",
                        "--memory",
                        "2G",
                        "--max-instances",
                        "1",
                        "--allow-unauthenticated"
                    ]
                }
            ],
            "images": [
                `gcr.io/diy-auto-ml/classifier:${datasetID}`
            ],
            "tags": [
                `${datasetID}`,
                `model-${datasetID.toLowerCase()}`
            ]
        }
        console.log("request")
        console.log(`${JSON.stringify(buildRequest)}`)

        var options = {
            method: 'POST',
            url: 'https://cloudbuild.googleapis.com/v1/projects/diy-auto-ml/builds',
            data: buildRequest,
        };
        return client.request(options);
    }).then((res) => {
        console.log("request sent ok")
        console.log(res.data)
    }).catch((err) => {
        console.log("caught error")
        console.error(err)
        return db.collection('datasets').doc(datasetID).update({
            state: "ERROR",
            last_update: Math.round((new Date()).getTime() / 1000),
            message: "error training model"
        })
    });

});

exports.validate_upload = functions.region('europe-west1').storage.object().onFinalize(async (object) => {
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const fileName = path.basename(object.name); // File path in the bucket.
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const [metadata] = await admin.storage().bucket(fileBucket).file(fileName)
        .getMetadata();
    console.log(`Owner: ${metadata.metadata.owner}`);
    console.log(`original name: ${metadata.metadata.name}`);
    console.log(`id: ${metadata.metadata.id}`)
    let datasetStats = {}
    let entries = 0;
    let newLocation = "";
    const datasetRef = db.collection('datasets').doc()
    return datasetRef.set({
        owner: metadata.metadata.owner,
        name: metadata.metadata.name,
        id: metadata.metadata.id,
        created_at: Math.round((new Date()).getTime() / 1000),
        last_update: Math.round((new Date()).getTime() / 1000),
        entries: 0,
        label_stats: {},
        state: "AWAITING_ANALYSIS",
        message: "",
        location: ""
    }).then(() => {
        console.log("added to db, now downloading")
        return admin.storage().bucket(fileBucket).file(fileName).download({ destination: tempFilePath });
    }).then(() => {
        console.log('File saved locally to', tempFilePath);
        let results = []
        return new Promise((resolve, reject) => {
            fs.createReadStream(tempFilePath)
                .pipe(csv({
                    headers: false
                }))
                .on('data', (data) => results.push(data))
                .on('end', () => {
                    resolve(results);
                }).on('error', () => {
                    reject("Unable to parse csv. Is it in the correct format?")
                });
        })
    }).then((dataset) => {
        return new Promise((resolve, reject) => {
            let labels = {}
            dataset.forEach((data_entry, index) => {
                console.log(data_entry)
                if (Object.keys(data_entry).length != 2) {
                    reject(`line ${index} has incorrect number of columns`)
                } else {
                    if (data_entry[1].trim().toLowerCase() in labels) {
                        labels[data_entry[1].trim().toLowerCase()] += 1
                    } else {
                        labels[data_entry[1].trim().toLowerCase()] = 1
                    }
                }
            })
            resolve(labels)
        })
    }).then((stats) => {
        console.log(stats)
        datasetStats = stats
        Object.keys(stats).forEach((key) => {
            entries += stats[key]
        })
        const newFile = admin.storage().bucket(fileBucket).file(fileName)
        newLocation = `gs://${datasetBucket}/${fileName}`;
        return newFile.move(newLocation);
    }).then(() => {
        return db.collection('datasets').doc(datasetRef.id).update({
            last_update: Math.round((new Date()).getTime() / 1000),
            state: "READY_FOR_TRAINING",
            label_stats: datasetStats,
            location: newLocation,
            entries: entries
        })
    }).catch((err) => {
        let message = ""
        if (typeof (err) === "string") {
            message = err
        } else {
            message = "unknown error"
            console.error(err)
        }
        return db.collection('datasets').doc(datasetRef.id).update({
            last_update: Math.round((new Date()).getTime() / 1000),
            state: "ERROR",
            message: `${message}`
        })
    })
});