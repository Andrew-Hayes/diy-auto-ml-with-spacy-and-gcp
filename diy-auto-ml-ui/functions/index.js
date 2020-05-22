const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp()
const db = admin.firestore();
const path = require('path');
const os = require('os');
const fs = require('fs');
const csv = require('csv-parser')
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const datasetBucket = "diy-auto-ml-dataset-datasets"

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
        name:  metadata.metadata.name,
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
        return admin.storage().bucket(fileBucket).file(fileName).download({destination: tempFilePath});
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
        if (typeof(err) === "string") {
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