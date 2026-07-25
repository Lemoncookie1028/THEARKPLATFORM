// Firebase Web App Config (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyCo2C4wAtqOmST_0xQoAgB8dx9LYsIbuts",
  authDomain: "thearkplatform.firebaseapp.com",
  projectId: "thearkplatform",
  storageBucket: "thearkplatform.firebasestorage.app",
  messagingSenderId: "1436735808",
  appId: "1:1436735808:web:ee7116aaabb7a8970902a5"
};

// API URL - change to your Vercel URL when deployed
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : 'https://thearkplatform.vercel.app/api';

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, API_URL };
}