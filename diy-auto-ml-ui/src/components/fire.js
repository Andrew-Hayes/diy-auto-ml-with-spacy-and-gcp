import * as firebase from 'firebase'
import 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyAuePfI3z2-bgwuwoRTD9fZoPVll3FDXiU",
    authDomain: "build-your-own-automl-ca739.firebaseapp.com",
    databaseURL: "https://build-your-own-automl-ca739.firebaseio.com",
    projectId: "build-your-own-automl-ca739",
    storageBucket: "build-your-own-automl-ca739.appspot.com",
    messagingSenderId: "841701320649",
    appId: "1:841701320649:web:1cbb969427c94d0665ea18",
    measurementId: "G-SN3CBE8NNC"
  };

const firebaseApp = firebase.initializeApp(firebaseConfig);
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
