// Initializes the Firebase client SDK for profile.js's direct Firestore reads.
// Note: this API key is the public *web app* key (safe to expose client-side —
// it's an identifier, not a secret; access control is enforced by Firestore
// security rules, not by hiding this key). This is a different thing from the
// service-account private key in api/_lib/firebase.js, which must stay secret.
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Populated in app.js once we know a user is signed in.
let currentUser = null;
