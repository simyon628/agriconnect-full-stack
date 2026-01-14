const { db } = require('./firebaseConfig');
const { collection, addDoc, getDocs } = require('firebase/firestore');

const testFirebase = async () => {
    console.log("Testing Firebase Connection...");
    try {
        const testCol = collection(db, 'test_connection');

        // Write
        console.log("Attempting to write...");
        const docRef = await addDoc(testCol, {
            message: "Hello from Agriconnect Backend!",
            timestamp: Date.now()
        });
        console.log("Write successful! Doc ID:", docRef.id);

        // Read
        console.log("Attempting to read...");
        const snapshot = await getDocs(testCol);
        if (!snapshot.empty) {
            console.log(`Read successful! Found ${snapshot.size} documents.`);
            snapshot.forEach(d => console.log(" - ", d.data()));
        } else {
            console.log("Read successful but collection is empty (unexpected after write).");
        }

        console.log("Firebase Test PASSED.");
        process.exit(0);
    } catch (error) {
        console.error("Firebase Test FAILED:", error.message);
        if (error.code === 'permission-denied') {
            console.error("Reason: Permission Denied. Check your Firestore Security Rules in the Firebase Console.");
        }
        process.exit(1);
    }
};

testFirebase();
