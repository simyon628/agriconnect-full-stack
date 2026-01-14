const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

// Configuration from frontend/config.ts
// Note: In a production environment, these should be environment variables.
const firebaseConfig = {
    apiKey: "AIzaSyCFrwK1tF-i55N8sidQ9Sk5C6FbBjb7Ijc",
    authDomain: "agriconnect-8c0f3.firebaseapp.com",
    projectId: "agriconnect-8c0f3",
    storageBucket: "agriconnect-8c0f3.firebasestorage.app",
    messagingSenderId: "1059362325401",
    appId: "1:1059362325401:web:add0ea71a8f999c2ed4908",
    measurementId: "G-9PSDG89YP5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db };
