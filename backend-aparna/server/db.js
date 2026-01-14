const {
    collection,
    getDocs,
    addDoc,
    setDoc,
    doc,
    query,
    where,
    updateDoc
} = require('firebase/firestore');
const { db } = require('./firebaseConfig');

// Helper to convert Firestore Snapshot to Array
const snapshotToArray = (snapshot) => {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- DATA ACCESS LAYERS ---

// USERS
const getAllUsers = async () => {
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    return snapshotToArray(snapshot);
};

const getUserById = async (id) => {
    // Queries by custom ID field stored in document, or doc ID? 
    // The original app used 'id' inside the object. We'll search for it.
    const q = query(collection(db, 'users'), where('id', '==', id));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { ...snapshot.docs[0].data(), firestoreId: snapshot.docs[0].id }; // Return first match
};

const getUserByPhone = async (phone) => {
    const q = query(collection(db, 'users'), where('phone', '==', phone));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { ...snapshot.docs[0].data(), firestoreId: snapshot.docs[0].id };
};

const saveUser = async (user) => {
    // Upsert logic based on 'id' check in calling code or here?
    // Use setDoc if we want to overwrite, or addDoc for new.
    // Ideally, use the phone or user ID as the document ID for easier lookup.
    // For now, to match old logic, we'll mimic upsert.

    if (user.firestoreId) {
        // Update existing
        const docRef = doc(db, 'users', user.firestoreId);
        const { firestoreId, ...data } = user; // Exclude internal ID
        await updateDoc(docRef, data);
        return user;
    } else {
        // Create new
        const docRef = await addDoc(collection(db, 'users'), user);
        return { ...user, firestoreId: docRef.id };
    }
};

// JOBS
const getAllJobs = async () => {
    const q = query(collection(db, 'jobs'));
    const snapshot = await getDocs(q);
    return snapshotToArray(snapshot);
};

const saveJob = async (job) => {
    // Add new job
    const docRef = await addDoc(collection(db, 'jobs'), job);
    return { ...job, firestoreId: docRef.id };
};

const updateJob = async (id, updates) => {
    // Find job by internal 'id' (not doc id)
    const q = query(collection(db, 'jobs'), where('id', '==', id));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const docRef = snapshot.docs[0].ref;
    await updateDoc(docRef, updates);
    return { ...snapshot.docs[0].data(), ...updates };
};

// EQUIPMENT
const getAllEquipment = async () => {
    const q = query(collection(db, 'equipment'));
    const snapshot = await getDocs(q);
    return snapshotToArray(snapshot);
};

const saveEquipment = async (item) => {
    await addDoc(collection(db, 'equipment'), item);
    return item;
};

// NOTIFICATIONS
const getAllNotifications = async () => {
    const q = query(collection(db, 'notifications'));
    const snapshot = await getDocs(q);
    return snapshotToArray(snapshot);
};

const createNotification = async (notification) => {
    await addDoc(collection(db, 'notifications'), notification);
    return notification;
};

// STORES
const getAllStores = async () => {
    // Stores are just users with role 'STORE'
    // But original code has storeProducts separately.
    // For now we'll fetch all users and filter in memory or query
    const q = query(collection(db, 'users'), where('role', '==', 'STORE'));
    const snapshot = await getDocs(q);
    return snapshotToArray(snapshot);
};


module.exports = {
    getAllUsers,
    getUserById,
    getUserByPhone,
    saveUser,
    getAllJobs,
    saveJob,
    updateJob,
    getAllEquipment,
    saveEquipment,
    getAllNotifications,
    createNotification,
    getAllStores
};
