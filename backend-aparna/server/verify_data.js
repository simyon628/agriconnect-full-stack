const { db } = require('./firebaseConfig');
const { collection, addDoc, getDocs, query, where } = require('firebase/firestore');

// Function to simulate a full user flow
const verifyDataFlow = async () => {
    console.log("--- STARTING VERIFICATION ---")

    // 1. Create a Fake User (User Registration Scope)
    const newFarmer = {
        name: "Test Farmer John",
        phone: "9998887776",
        role: "FARMER",
        location: "Test Village",
        lat: 16.5,
        lng: 80.6,
        available: true,
        test_data: true // Flag to easily identify test data
    };

    console.log(`\n1. Registering new farmer: ${newFarmer.name}...`);
    try {
        const usersCol = collection(db, 'users');
        const docRef = await addDoc(usersCol, newFarmer);
        console.log(`✅ Success! User saved with ID: ${docRef.id}`);

        // 2. Fetch Data Back (Login Scope)
        console.log(`\n2. Verifying data by searching for phone: ${newFarmer.phone}...`);
        const q = query(usersCol, where("phone", "==", newFarmer.phone));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            console.log(`✅ Success! Found ${snapshot.size} user(s).`);
            snapshot.forEach(doc => {
                console.log("   Data from Cloud:", doc.data());
            });
        } else {
            console.error("❌ Error: Could not find the user we just added!");
        }

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
    }
    console.log("\n--- VERIFICATION COMPLETE ---");
    console.log("You can verify this in the Firebase Console: https://console.firebase.google.com/project/agriconnect-18c94/firestore/data/~2Fusers");
    process.exit(0);
};

verifyDataFlow();
