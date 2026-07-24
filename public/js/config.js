// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCo2C4wAtqOmST_0xQoAgB8dx9LYsIbuts",
  authDomain: "thearkplatform.firebaseapp.com",
  projectId: "thearkplatform",
  storageBucket: "thearkplatform.firebasestorage.app",
  messagingSenderId: "1436735808",
  appId: "1:1436735808:web:ee7116aaabb7a8970902a5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();