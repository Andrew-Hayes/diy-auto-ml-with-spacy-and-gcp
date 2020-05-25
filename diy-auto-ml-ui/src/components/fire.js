import * as firebase from 'firebase'
import 'firebase/firestore'

const config = {
    apiKey: "<api key>",
    authDomain: "<auth domain>",
    databaseURL: "<db url>",
    projectId: "<project id>",
    storageBucket: "<storage bucket>",
    messagingSenderId: "<message sender id>",
    appId: "<app id>",
    measurementId: "<meassurement id>"
};

const firebaseApp = firebase.initializeApp(config);
let db = firebase.firestore();
const settings = {};
db.settings(settings);

// firebase.firestore().enablePersistence()
//   .then(function() {
//     // Initialize Cloud Firestore through firebase
//     db = firebase.firestore();
//   });

const auth = firebase.auth();
const storage = firebase.storage();
const functions = firebaseApp.functions('europe-west1');
export {
    auth,
    db,
    functions,
    storage
};
