
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

// Note: db.js exports individual async functions now, not { readData, writeData }
// We import the whole module as 'db' for cleaner access: db.saveUser, db.getAllJobs etc.
// Wait, the original code used destructive assignments: db.notifications.push...
// Our new db module encapsulates these. We need to adjust logic to call functions instead of mutating arrays.

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- HELPER: Haversine Formula for Distance (km) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- ROUTES ---

// 1. LOGIN / SAVE USER (Upsert)
app.post('/api/login', async (req, res) => {
  try {
    const { id, name, phone, role, location, lat, lng } = req.body;

    if (!phone || !role) {
      return res.status(400).json({ error: "Phone and Role are required" });
    }

    // Check if user exists
    let existingUser = await db.getUserByPhone(phone);

    const userObj = {
      id: id || existingUser?.id || `user_${Date.now()}`,
      name: name || existingUser?.name || "Unknown",
      phone,
      role,
      location,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      available: existingUser ? existingUser.available : true
    };

    // Preserve Firestore ID if updating
    if (existingUser) {
      userObj.firestoreId = existingUser.firestoreId;
    }

    // Save (Upsert)
    const savedUser = await db.saveUser(userObj);

    // New User Notification Logic
    if (!existingUser && role === 'WORKER') {
      const allUsers = await db.getAllUsers(); // Need to fetch all to find farmers nearby? 
      // Optimization: Could Query users by role 'FARMER' directly
      const farmers = allUsers.filter(u => u.role === 'FARMER');

      const nearbyFarmers = farmers.filter(u => calculateDistance(userObj.lat, userObj.lng, u.lat, u.lng) <= 20);

      // We need to loop async to create notifications
      for (const farmer of nearbyFarmers) {
        await db.createNotification({
          id: `notif_${Date.now()}_${Math.random()}`,
          userId: farmer.id,
          message: `New worker ${name} joined near ${location}`,
          type: 'WORKER',
          read: false,
          timestamp: Date.now()
        });
      }
    }

    res.json(savedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 1b. GET USER BY PHONE
app.get('/api/users/lookup', async (req, res) => {
  try {
    const { phone } = req.query;
    const user = await db.getUserByPhone(phone);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1a. UPDATE USER
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await db.getUserById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // We can just call saveUser with merged data, or create specific update fn
    // saveUser handles update if firestoreId is present.
    const updatedUser = { ...user, ...updates };
    const result = await db.saveUser(updatedUser);

    console.log(`User ${result.name} updated:`, updates);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET WORKERS
app.get('/api/workers', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const allUsers = await db.getAllUsers();
    const nearbyWorkers = allUsers
      .filter(u => u.role === 'WORKER')
      .map(u => {
        const dist = calculateDistance(userLat, userLng, u.lat, u.lng);
        return { ...u, distance: parseFloat(dist.toFixed(1)) };
      })
      .filter(u => u.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyWorkers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST JOB
app.post('/api/jobs', async (req, res) => {
  try {
    const job = {
      ...req.body,
      id: `job_${Date.now()}`,
      status: 'OPEN'
    };

    await db.saveJob(job);

    // Notify nearby Workers
    const allUsers = await db.getAllUsers();
    const nearbyWorkers = allUsers.filter(u => u.role === 'WORKER' && calculateDistance(job.lat, job.lng, u.lat, u.lng) <= 20);

    for (const worker of nearbyWorkers) {
      await db.createNotification({
        id: `notif_${Date.now()}_${Math.random()}`,
        userId: worker.id,
        message: `New Job: ${job.workType} at ${job.farmerName}`,
        type: 'JOB',
        read: false,
        timestamp: Date.now()
      });
    }

    console.log(`Job posted: ${job.workType}`);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3a. UPDATE JOB STATUS
app.patch('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedJob = await db.updateJob(id, { status });
    if (updatedJob) {
      res.json(updatedJob);
    } else {
      res.status(404).json({ error: "Job not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET JOBS 
app.get('/api/jobs', async (req, res) => {
  try {
    const { lat, lng, radius = 10, farmerId } = req.query;
    const allJobs = await db.getAllJobs();

    if (farmerId) {
      // Get My Jobs
      const myJobs = allJobs.filter(j => j.farmerId === farmerId);
      return res.json(myJobs);
    }

    // Get Nearby Jobs
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const nearbyJobs = allJobs
      .filter(j => j.status === 'OPEN')
      .map(j => {
        const dist = calculateDistance(userLat, userLng, j.lat, j.lng);
        return { ...j, distance: parseFloat(dist.toFixed(1)) };
      })
      .filter(j => j.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. ADD EQUIPMENT
app.post('/api/equipment', async (req, res) => {
  try {
    const item = {
      ...req.body,
      id: `equip_${Date.now()}`
    };
    await db.saveEquipment(item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET EQUIPMENT
app.get('/api/equipment', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const allEquip = await db.getAllEquipment();
    const nearbyEquipment = allEquip
      .map(e => {
        const dist = calculateDistance(userLat, userLng, e.lat, e.lng);
        return { ...e, distance: parseFloat(dist.toFixed(1)) };
      })
      .filter(e => e.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyEquipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET NOTIFICATIONS
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query;
    const allNotifs = await db.getAllNotifications();
    const userNotifs = allNotifs.filter(n => n.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
    res.json(userNotifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GET STORES
app.get('/api/stores', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const stores = await db.getAllStores(); // Already filters by role=STORE

    // Note: Product fetching logic needs work if products are in subcollection or separate.
    // Current db.js getAllStores returns users. Products logic from original code:
    // const products = db.storeProducts ? (db.storeProducts[u.id] || []) : [];
    // We didn't migrate 'storeProducts' to a collection yet. Assuming stores have products in their doc for now or empty.

    const nearbyStores = stores
      .map(u => {
        const dist = calculateDistance(userLat, userLng, u.lat, u.lng);
        return {
          ...u,
          distance: parseFloat(dist.toFixed(1)),
          products: u.products || [], // Access from user doc
          shopImages: u.shopImages || []
        };
      })
      .filter(u => u.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyStores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`AgriConnect Backend running on http://localhost:${PORT}`);
});
