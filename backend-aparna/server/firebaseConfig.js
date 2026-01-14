const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

// Configuration from frontend/config.ts
// Note: In a production environment, these should be environment variables.
const firebaseConfig = {
    apiKey: "AIzaSyCQGwqm7XI2CoHlFoXIBgd0KPqua9Ijyr0",
    authDomain: "agriconnect-18c94.firebaseapp.com",
    projectId: "agriconnect-18c94",
    storageBucket: "agriconnect-18c94.firebasestorage.app",
    messagingSenderId: "6646490296",
    appId: "1:6646490296:web:cf7156fbc41f24afd5004d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db };
