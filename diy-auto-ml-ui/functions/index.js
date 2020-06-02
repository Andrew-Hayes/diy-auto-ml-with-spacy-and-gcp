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

const projectID = "make-your-own-automl"
const repositoryName = "github_my-name_diy-auto-ml-with-spacy-and-gcp"
const region = "europe-west1" // limited to: asia-east1, europe-west1, us-central1, asia-northeast1, europe-north1, europe-west4, us-east1, us-east4, us-west1

const runtimeOpts = {
    timeoutSeconds: 300,
    memory: '128MB'
}

const runtimeOptsLarge = {
    timeoutSeconds: 540,
    memory: '2GB'
}

const runtimeOptsSmall = {
    timeoutSeconds: 60,
    memory: '128MB'
}

exports.build_updated = functions.region(region).runWith(runtimeOpts).pubsub.topic('cloud-builds').onPublish((message) => {
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
            let authClient;
            return auth.getClient()
                .then((client) => {
                    authClient = client
                    console.log("got client, getting url for model")
                    var options = { url: `https://${region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${projectID}/services/${buildMessage.tags[1]}` };
                    return authClient.request(options);
                }).then((res) => {
                    console.log("got cloud run data")
                    console.log(JSON.stringify(res.data))
                    model_url = res.data.status.url
                    // sleep for a bit to allow the deployment to complete
                    return sleep(60000)
                }).then(() => {
                    var options = { url: `${model_url}/stats` };
                    console.log(options)
                    return authClient.request(options);
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
                        dataset_doc: doc.id,
                        created_at: Math.round((new Date()).getTime() / 1000),
                        last_update: Math.round((new Date()).getTime() / 1000),
                        model_url: model_url,
                        model_stats: model_stats,
                        entries: datasetData.entries,
                        model_name: buildMessage.tags[1],
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
                    console.log("caught error")
                    console.error(err)
                    return db.collection('datasets').doc(datasetID).update({
                        state: "ERROR",
                        last_update: Math.round((new Date()).getTime() / 1000),
                        message: "error deploying model"
                    })
                })
        } else {
            // this is for states like "working"
            return Promise.resolve()
        }
    }
});

exports.delete_dataset = functions.region(region).runWith(runtimeOptsSmall).https.onCall((data, context) => {
    if (!context.auth) {
        console.log('Not authed');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    const email = context.auth.token.email || null;
    // Message text passed from the client.
    const datasetID = data.datasetID || "";
    if (datasetID === "") {
        console.log('empty dataset ID!');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a valid dataset ID');
    }

    if (!auth) {
        auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
    }
    let datasetData;
    let authClient;
    const datasetRef = db.collection('datasets').doc(datasetID)
    return datasetRef.get().then((doc) => {
        if (!doc.exists) {
            console.log('No such document!');
            // Throwing an HttpsError so that the client gets the error details.
            throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
                'with a valid dataset id');
        }
        datasetData = doc.data()
        if (email !== datasetData.owner) {
            console.log('Not the owner');
            // Throwing an HttpsError so that the client gets the error details.
            throw new functions.https.HttpsError('failed-precondition', 'Owner of the document must' +
                'initiate deletion');
        }
        return auth.getClient()
    }).then((client) => {
        authClient = client
        console.log("got client")
        if (datasetData.model_id && datasetData.model_id !== "") {
            return delete_dataset_model(authClient, datasetData.model_id)
        } else {
            return Promise.resolve()
        }
    }).then(() => {
        console.log("deleting file")
        return admin.storage().bucket(datasetData.bucket).file(`${datasetData.id}.csv`).delete()
    }).then((res) => {
        console.log(res.data)
        return datasetRef.delete()
    }).then(() => {
        console.log("FIN")
    }).catch((err) => {
        console.error(err)
    })
});

function delete_dataset_model(authClient, modelID) {
    console.log(`deleting model ${modelID}`)
    const modelRef = db.collection('models').doc(modelID)
    return modelRef.get().then((doc) => {
        modelData = doc.data()
        console.log("got client")
        var options = {
            method: 'DELETE',
            url: `https://${region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${projectID}/services/${modelData.model_name}`
         };
        return authClient.request(options);
    }).then((res) => {
        console.log(`model service deleted`)
        console.log(res.data)
        return modelRef.delete()
    })
}

exports.delete_model = functions.region(region).runWith(runtimeOptsSmall).https.onCall((data, context) => {
    if (!context.auth) {
        console.log('Not authed');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    const email = context.auth.token.email || null;
    // Message text passed from the client.
    const modelID = data.modelID || "";
    if (modelID === "") {
        console.log('empty model ID!');
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a valid model ID');
    }

    if (!auth) {
        auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
    }
    let docData;
    let authClient;
    const modelRef = db.collection('models').doc(modelID)
    return modelRef.get().then((doc) => {
        if (!doc.exists) {
            console.log('No such document!');
            // Throwing an HttpsError so that the client gets the error details.
            throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
                'with a valid model id');
        }
        docData = doc.data()
        if (email !== docData.owner) {
            console.log('Not the owner');
            // Throwing an HttpsError so that the client gets the error details.
            throw new functions.https.HttpsError('failed-precondition', 'Owner of the document must' +
                'initiate deletion');
        }
        return auth.getClient()
    }).then((client) => {
        authClient = client
        console.log("got client")
        var options = {
            method: 'DELETE',
            url: `https://${region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${projectID}/services/${docData.model_name}`
         };
        return authClient.request(options);
    }).then((res) => {
        console.log(res.data)
        return modelRef.delete()
    }).then(() => {
        return db.collection("datasets").doc(docData.dataset_doc).update({
            state: "READY_FOR_TRAINING",
            last_update: Math.round((new Date()).getTime() / 1000),
            model_url: "",
            model_name: "",
            model_id: "",
            model_stats: {}
        })
    }).then(() => {
        console.log("FIN")
    }).catch((err) => {
        console.error(err)
    })
});

exports.test_model = functions.region(region).runWith(runtimeOptsSmall).https.onCall((data, context) => {
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

exports.train_model = functions.region(region).runWith(runtimeOptsSmall).https.onCall((data, context) => {
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
        return admin.storage().bucket(docData.bucket).file(`${docData.id}.csv`).getSignedUrl(options)
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
                    "projectId": projectID,
                    "repoName": repositoryName,
                    "dir": "containers/classifier",
                    "branchName": "v1.0.0"
                }
            },
            "steps": [
                {
                    "name": "gcr.io/cloud-builders/docker",
                    "args": [
                        "build",
                        "-t",
                        `gcr.io/${projectID}/classifier:${datasetID}`,
                        ".",
                        "--build-arg",
                        `dataset_url=${signedURL}`
                    ],
                    "timeout": "3600s"
                },
                {
                    "name": "gcr.io/cloud-builders/docker",
                    "args": [
                        "push",
                        `gcr.io/${projectID}/classifier:${datasetID}`
                    ]
                },
                {
                    "name": "gcr.io/cloud-builders/gcloud",
                    "args": [
                        "run",
                        "deploy",
                        `model-${datasetID.toLowerCase()}`,
                        "--image",
                        `gcr.io/${projectID}/classifier:${datasetID}`,
                        "--region",
                        region,
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
                `gcr.io/${projectID}/classifier:${datasetID}`
            ],
            "tags": [
                `${datasetID}`,
                `model-${datasetID.toLowerCase()}`
            ],
            "timeout": "3900s"
        }
        console.log("request")
        console.log(`${JSON.stringify(buildRequest)}`)

        var options = {
            method: 'POST',
            url: `https://cloudbuild.googleapis.com/v1/projects/${projectID}/builds`,
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

exports.validate_upload = functions.region(region).runWith(runtimeOptsLarge).storage.object().onFinalize(async (object) => {
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
        bucket: fileBucket
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
        return db.collection('datasets').doc(datasetRef.id).update({
            last_update: Math.round((new Date()).getTime() / 1000),
            state: "READY_FOR_TRAINING",
            label_stats: datasetStats,
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


function sleep(milliseconds) {
    console.log(`sleeping for ${milliseconds} ms`)
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}