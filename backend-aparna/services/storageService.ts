
import { User, Job, Equipment, WorkerProfile, Notification, UserRole, StoreProduct } from '../types';
import { calculateDistance } from '../constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const LOCAL_USERS_KEY = 'agri_users';
const LOCAL_JOBS_KEY = 'agri_jobs';
const LOCAL_EQUIP_KEY = 'agri_equipment';
const LOCAL_STORE_PRODUCTS_KEY = 'agri_store_products';

const getLocalList = <T>(key: string): T[] => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch { return []; }
};

const saveLocalList = <T>(key: string, list: T[]) => {
  localStorage.setItem(key, JSON.stringify(list));
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 1500) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const backgroundSync = async (url: string, options: RequestInit) => {
  try {
    await fetch(url, options); // No timeout needed for background sync, let it take its time
  } catch (e) {
    console.warn("Background sync failed:", e);
  }
};

export const storageService = {
  getUserByPhone: async (phone: string): Promise<User | null> => {
    // Reads still need to try network first to get fresh data, but with short timeout
    try {
      const response = await fetchWithTimeout(`${API_URL}/users/lookup?phone=${phone}`, {}, 1500);
      if (response.ok) return await response.json();
    } catch (error) {
      console.log("Backend lookup skipped (timeout/offline), checking local.");
    }
    const users = getLocalList<User>(LOCAL_USERS_KEY);
    return users.find(u => u.phone === phone) || null;
  },

  saveUser: async (user: User): Promise<User> => {
    // 1. Optimistic: Save Local IMMEDIATELY
    const users = getLocalList<User>(LOCAL_USERS_KEY);
    const existingIdx = users.findIndex(u => u.phone === user.phone);
    let savedUser = user;

    if (existingIdx >= 0) {
      savedUser = { ...users[existingIdx], ...user };
      users[existingIdx] = savedUser;
    } else {
      savedUser = { ...user, available: true };
      users.push(savedUser);
    }
    saveLocalList(LOCAL_USERS_KEY, users);

    // 2. Background: Sync to Backend (Fire & Forget)
    backgroundSync(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    // 3. Return Instant Result
    return savedUser;
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User | null> => {
    // 1. Optimistic Local Update
    const users = getLocalList<User>(LOCAL_USERS_KEY);
    const idx = users.findIndex(u => u.id === id);
    let updatedUser: User | null = null;

    if (idx !== -1) {
      updatedUser = { ...users[idx], ...updates };
      users[idx] = updatedUser;
      saveLocalList(LOCAL_USERS_KEY, users);
    }

    // 2. Background Backend Update (if local update worked)
    if (updatedUser) {
      backgroundSync(`${API_URL}/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    }

    return updatedUser; // Return immediately
  },

  getWorkers: async (lat: number, lng: number, radius: number = 50): Promise<WorkerProfile[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/workers?lat=${lat}&lng=${lng}&radius=${radius}`, {}, 1500);
      if (response.ok) {
        const workers = await response.json();
        return workers.map((u: any) => ({
          id: u.id,
          name: u.name,
          phone: u.phone,
          skills: ['General Labor'],
          rating: 5.0,
          distance: u.distance,
          available: u.available !== undefined ? u.available : true,
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
          lat: u.lat,
          lng: u.lng
        }));
      }
    } catch (e) { /* Fallback */ }

    // Fallback to local
    const localUsers = getLocalList<User>(LOCAL_USERS_KEY);
    return localUsers
      .filter(u => u.role === UserRole.WORKER)
      .map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        skills: ['General Labor'],
        rating: 5.0,
        distance: calculateDistance(lat, lng, u.lat, u.lng),
        available: (u as any).available ?? true,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
        lat: u.lat,
        lng: u.lng
      }))
      .filter(w => w.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  },

  getStores: async (lat: number, lng: number, radius: number = 50): Promise<any[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/stores?lat=${lat}&lng=${lng}&radius=${radius}`, {}, 1500);
      if (response.ok) return await response.json();
    } catch (e) { /* Fallback */ }

    const localUsers = getLocalList<User>(LOCAL_USERS_KEY);
    const storeProductsMap = JSON.parse(localStorage.getItem(LOCAL_STORE_PRODUCTS_KEY) || '{}');

    return localUsers
      .filter(u => u.role === UserRole.STORE)
      .map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        location: u.location,
        shopImages: u.shopImages || [],
        distance: calculateDistance(lat, lng, u.lat, u.lng),
        products: storeProductsMap[u.id] || [],
        lat: u.lat,
        lng: u.lng
      }))
      .filter(s => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  },

  getStoreProducts: async (storeId: string): Promise<StoreProduct[]> => {
    const storeProductsMap = JSON.parse(localStorage.getItem(LOCAL_STORE_PRODUCTS_KEY) || '{}');
    return storeProductsMap[storeId] || [];
  },

  addStoreProduct: async (storeId: string, product: StoreProduct): Promise<StoreProduct[]> => {
    const storeProductsMap = JSON.parse(localStorage.getItem(LOCAL_STORE_PRODUCTS_KEY) || '{}');
    const products = storeProductsMap[storeId] || [];
    products.push(product);
    storeProductsMap[storeId] = products;
    localStorage.setItem(LOCAL_STORE_PRODUCTS_KEY, JSON.stringify(storeProductsMap));
    return products;
  },

  deleteStoreProduct: async (storeId: string, productId: string): Promise<StoreProduct[]> => {
    const storeProductsMap = JSON.parse(localStorage.getItem(LOCAL_STORE_PRODUCTS_KEY) || '{}');
    let products = storeProductsMap[storeId] || [];
    products = products.filter((p: StoreProduct) => p.id !== productId);
    storeProductsMap[storeId] = products;
    localStorage.setItem(LOCAL_STORE_PRODUCTS_KEY, JSON.stringify(storeProductsMap));
    return products;
  },

  postJob: async (job: Job): Promise<Job> => {
    // 1. Optimistic Local Save
    const jobs = getLocalList<Job>(LOCAL_JOBS_KEY);
    const newJob = { ...job, id: `job_local_${Date.now()}`, status: 'OPEN' as const };
    jobs.push(newJob);
    saveLocalList(LOCAL_JOBS_KEY, jobs);

    // 2. Background Sync
    backgroundSync(`${API_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    });

    return newJob;
  },

  updateJobStatus: async (id: string, status: string): Promise<void> => {
    // 1. Optimistic Local Update
    const jobs = getLocalList<Job>(LOCAL_JOBS_KEY);
    const idx = jobs.findIndex(j => j.id === id);
    if (idx !== -1) {
      jobs[idx].status = status as any;
      saveLocalList(LOCAL_JOBS_KEY, jobs);
    }

    // 2. Background Sync
    backgroundSync(`${API_URL}/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  },

  deleteJob: async (id: string): Promise<void> => {
    // 1. Optimistic Local Delete
    const jobs = getLocalList<Job>(LOCAL_JOBS_KEY);
    const filtered = jobs.filter(j => j.id !== id);
    saveLocalList(LOCAL_JOBS_KEY, filtered);

    // 2. Background Sync
    backgroundSync(`${API_URL}/jobs/${id}`, {
      method: 'DELETE'
    });
  },

  getJobs: async (lat: number, lng: number, radius: number = 50): Promise<Job[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/jobs?lat=${lat}&lng=${lng}&radius=${radius}`, {}, 1500);
      if (response.ok) return await response.json();
    } catch (e) { /* Fallback */ }

    const localJobsRaw = getLocalList<Job>(LOCAL_JOBS_KEY);
    return localJobsRaw.map(j => ({
      ...j,
      distance: calculateDistance(lat, lng, j.lat, j.lng)
    }))
      .filter(j => j.distance <= radius && j.status === 'OPEN')
      .sort((a, b) => a.distance - b.distance);
  },

  getMyJobs: async (farmerId: string): Promise<Job[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/jobs?farmerId=${farmerId}`, {}, 1500);
      if (response.ok) return await response.json();
    } catch (e) { /* Fallback */ }

    const localJobs = getLocalList<Job>(LOCAL_JOBS_KEY);
    return localJobs.filter(j => j.farmerId === farmerId);
  },

  addEquipment: async (item: Equipment) => {
    // 1. Optimistic Local Save
    const equip = getLocalList<Equipment>(LOCAL_EQUIP_KEY);
    const newItem = { ...item, id: `eq_local_${Date.now()}` };
    equip.push(newItem);
    saveLocalList(LOCAL_EQUIP_KEY, equip);

    // 2. Background Sync
    backgroundSync(`${API_URL}/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  },

  getEquipment: async (lat: number, lng: number, radius: number = 50): Promise<Equipment[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/equipment?lat=${lat}&lng=${lng}&radius=${radius}`, {}, 1500);
      if (response.ok) return await response.json();
    } catch (e) { /* Fallback */ }

    const localEquipRaw = getLocalList<Equipment>(LOCAL_EQUIP_KEY);
    return localEquipRaw.map(e => ({
      ...e,
      distance: calculateDistance(lat, lng, e.lat, e.lng)
    }))
      .filter(e => e.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  },

  updateEquipment: async (id: string, updates: Partial<Equipment>): Promise<void> => {
    // 1. Optimistic Local Update
    const equip = getLocalList<Equipment>(LOCAL_EQUIP_KEY);
    const idx = equip.findIndex(e => e.id === id);
    if (idx !== -1) {
      equip[idx] = { ...equip[idx], ...updates };
      saveLocalList(LOCAL_EQUIP_KEY, equip);
    }

    // 2. Background Sync
    backgroundSync(`${API_URL}/equipment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  getNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/notifications?userId=${userId}`, {}, 1500);
      if (response.ok) return await response.json();
    } catch (e) { /* Fallback */ }
    return [];
  },
};
