
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- IN-MEMORY DATABASE ---
let users = [];
let jobs = [];
let equipment = [];
let notifications = [];

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

const createNotification = (targetUserId, message, type) => {
  notifications.push({
    id: `notif_${Date.now()}_${Math.random()}`,
    userId: targetUserId,
    message,
    type,
    read: false,
    timestamp: Date.now()
  });
};

app.post('/api/login', (req, res) => {
  const { id, name, phone, role, location, lat, lng } = req.body;
  if (!phone || !role) return res.status(400).json({ error: "Phone and Role are required" });

  const existingIndex = users.findIndex(u => u.phone === phone);
  const userObj = {
    id: id || `user_${Date.now()}`,
    name,
    phone,
    role,
    location,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    available: true
  };

  if (existingIndex >= 0) {
    userObj.id = users[existingIndex].id;
    if (users[existingIndex].available !== undefined) userObj.available = users[existingIndex].available;
    users[existingIndex] = { ...users[existingIndex], ...userObj };
    if (!name) users[existingIndex].name = users[existingIndex].name || "Unknown";
    res.json(users[existingIndex]);
  } else {
    users.push(userObj);
    if (role === 'WORKER') {
      const nearbyFarmers = users.filter(u => u.role === 'FARMER' && calculateDistance(userObj.lat, userObj.lng, u.lat, u.lng) <= 20);
      nearbyFarmers.forEach(farmer => {
        createNotification(farmer.id, `New worker ${name} joined near ${location}`, 'WORKER');
      });
    }
    res.json(userObj);
  }
});

app.get('/api/users/lookup', (req, res) => {
  const { phone } = req.query;
  const user = users.find(u => u.phone === phone);
  if (user) res.json(user);
  else res.status(404).json({ error: "User not found" });
});

app.patch('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: "User not found" });
  users[index] = { ...users[index], ...updates };
  res.json(users[index]);
});

app.get('/api/workers', (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const nearbyWorkers = users
    .filter(u => u.role === 'WORKER')
    .map(u => {
      const dist = calculateDistance(userLat, userLng, u.lat, u.lng);
      return { ...u, distance: parseFloat(dist.toFixed(1)) };
    })
    .filter(u => u.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);
  res.json(nearbyWorkers);
});

app.get('/api/stores', (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const nearbyStores = users
    .filter(u => u.role === 'STORE')
    .map(u => {
      const dist = calculateDistance(userLat, userLng, u.lat, u.lng);
      return { ...u, distance: parseFloat(dist.toFixed(1)) };
    })
    .filter(u => u.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);
  res.json(nearbyStores);
});

app.post('/api/jobs', (req, res) => {
  const job = { ...req.body, id: `job_${Date.now()}`, status: 'OPEN' };
  jobs.push(job);
  const nearbyWorkers = users.filter(u => u.role === 'WORKER' && calculateDistance(job.lat, job.lng, u.lat, u.lng) <= 20);
  nearbyWorkers.forEach(worker => {
    createNotification(worker.id, `New Job: ${job.workType} at ${job.farmerName}`, 'JOB');
  });
  res.json(job);
});

app.patch('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const jobIdx = jobs.findIndex(j => j.id === id);
  if (jobIdx !== -1) {
    jobs[jobIdx].status = status;
    res.json(jobs[jobIdx]);
  }
  else res.status(404).json({ error: "Job not found" });
});

app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = jobs.length;
  jobs = jobs.filter(j => j.id !== id);
  if (jobs.length < initialLength) {
    res.status(204).send();
  } else {
    res.status(404).json({ error: "Job not found" });
  }
});

app.get('/api/jobs', (req, res) => {
  const { lat, lng, radius = 10, farmerId } = req.query;
  if (farmerId) {
    return res.json(jobs.filter(j => j.farmerId === farmerId).sort((a, b) => b.id.localeCompare(a.id)));
  }
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const nearbyJobs = jobs
    .filter(j => j.status === 'OPEN')
    .map(j => {
      const dist = calculateDistance(userLat, userLng, j.lat, j.lng);
      return { ...j, distance: parseFloat(dist.toFixed(1)) };
    })
    .filter(j => j.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);
  res.json(nearbyJobs);
});

app.post('/api/equipment', (req, res) => {
  const item = { ...req.body, id: `equip_${Date.now()}` };
  equipment.push(item);
  res.json(item);
});

app.patch('/api/equipment/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const equipIdx = equipment.findIndex(e => e.id === id);
  if (equipIdx !== -1) {
    equipment[equipIdx] = { ...equipment[equipIdx], ...updates };
    res.json(equipment[equipIdx]);
  } else {
    res.status(404).json({ error: "Equipment not found" });
  }
});

app.get('/api/equipment', (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const nearbyEquipment = equipment
    .map(e => {
      const dist = calculateDistance(userLat, userLng, e.lat, e.lng);
      return { ...e, distance: parseFloat(dist.toFixed(1)) };
    })
    .filter(e => e.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);
  res.json(nearbyEquipment);
});

app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  res.json(notifications.filter(n => n.userId === userId).sort((a, b) => b.timestamp - a.timestamp));
});

app.listen(PORT, () => console.log(`AgriConnect Backend running on http://localhost:${PORT}`));
