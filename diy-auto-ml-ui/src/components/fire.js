import * as firebase from 'firebase'
import 'firebase/firestore'

const config = {
    apiKey: "AIzaSyD-NrtmOnZq8XBKu_6n0xJHIB_TttNRRtY",
    authDomain: "diy-auto-ml.firebaseapp.com",
    databaseURL: "https://diy-auto-ml.firebaseio.com",
    projectId: "diy-auto-ml",
    storageBucket: "diy-auto-ml.appspot.com",
    messagingSenderId: "485587965804",
    appId: "1:485587965804:web:2d93c36a4f3e7df4880549",
    measurementId: "G-RCFBF26SPV"
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
