// Firebase Configuration
// Values loaded from .env.local (not committed to git)
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCFrwK1tF-i55N8sidQ9Sk5C6FbBjb7Ijc",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "agriconnect-8c0f3.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "agriconnect-8c0f3",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "agriconnect-8c0f3.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1059362325401",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1059362325401:web:add0ea71a8f999c2ed4908"
};

// OpenWeatherMap Configuration
export const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || "cdce5979270bcd697a41e74ddd16ad6a";

