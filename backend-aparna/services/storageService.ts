
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

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 4000) => {
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

export const storageService = {
  getUserByPhone: async (phone: string): Promise<User | null> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/users/lookup?phone=${phone}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log("Backend lookup failed/timeout, checking local.");
    }
    const users = getLocalList<User>(LOCAL_USERS_KEY);
    const user = users.find(u => u.phone === phone);
    return user || null;
  },

  saveUser: async (user: User): Promise<User> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      console.log("Backend offline/timeout. Saving user locally.");
      const users = getLocalList<User>(LOCAL_USERS_KEY);
      const existingIdx = users.findIndex(u => u.phone === user.phone);
      if (existingIdx >= 0) {
        const updated = { ...users[existingIdx], ...user };
        users[existingIdx] = updated;
        saveLocalList(LOCAL_USERS_KEY, users);
        return updated;
      } else {
        const newUser = { ...user, available: true };
        users.push(newUser);
        saveLocalList(LOCAL_USERS_KEY, users);
        return newUser;
      }
    }
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User | null> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      const users = getLocalList<User>(LOCAL_USERS_KEY);
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        saveLocalList(LOCAL_USERS_KEY, users);
        return users[idx];
      }
      return null;
    }
  },

  getWorkers: async (lat: number, lng: number, radius: number = 50): Promise<WorkerProfile[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/workers?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) throw new Error('Backend unavailable');
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
    } catch (error) {
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
    }
  },

  getStores: async (lat: number, lng: number, radius: number = 50): Promise<any[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/stores?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
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
    }
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
    try {
      const response = await fetchWithTimeout(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (error) {
      const jobs = getLocalList<Job>(LOCAL_JOBS_KEY);
      const newJob = { ...job, id: `job_local_${Date.now()}`, status: 'OPEN' as const };
      jobs.push(newJob);
      saveLocalList(LOCAL_JOBS_KEY, jobs);
      return newJob;
    }
  },

  updateJobStatus: async (id: string, status: string): Promise<void> => {
    try {
      await fetchWithTimeout(`${API_URL}/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (error) {
      const jobs = getLocalList<Job>(LOCAL_JOBS_KEY);
      const idx = jobs.findIndex(j => j.id === id);
      if (idx !== -1) {
        jobs[idx].status = status as any;
        saveLocalList(LOCAL_JOBS_KEY, jobs);
      }
    }
  },

  deleteJob: async (id: string): Promise<void> => {
    try {
      await fetchWithTimeout(`${API_URL}/jobs/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      const jobs = getLocalList<Job>(LOCAL_JOBS_KEY);
      const filtered = jobs.filter(j => j.id !== id);
      saveLocalList(LOCAL_JOBS_KEY, filtered);
    }
  },

  getJobs: async (lat: number, lng: number, radius: number = 50): Promise<Job[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/jobs?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      const localJobsRaw = getLocalList<Job>(LOCAL_JOBS_KEY);
      return localJobsRaw.map(j => ({
        ...j,
        distance: calculateDistance(lat, lng, j.lat, j.lng)
      }))
        .filter(j => j.distance <= radius && j.status === 'OPEN')
        .sort((a, b) => a.distance - b.distance);
    }
  },

  getMyJobs: async (farmerId: string): Promise<Job[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/jobs?farmerId=${farmerId}`);
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      const localJobs = getLocalList<Job>(LOCAL_JOBS_KEY);
      return localJobs.filter(j => j.farmerId === farmerId);
    }
  },

  addEquipment: async (item: Equipment) => {
    try {
      await fetchWithTimeout(`${API_URL}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (error) {
      const equip = getLocalList<Equipment>(LOCAL_EQUIP_KEY);
      const newItem = { ...item, id: `eq_local_${Date.now()}` };
      equip.push(newItem);
      saveLocalList(LOCAL_EQUIP_KEY, equip);
    }
  },

  getEquipment: async (lat: number, lng: number, radius: number = 50): Promise<Equipment[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/equipment?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      const localEquipRaw = getLocalList<Equipment>(LOCAL_EQUIP_KEY);
      return localEquipRaw.map(e => ({
        ...e,
        distance: calculateDistance(lat, lng, e.lat, e.lng)
      }))
        .filter(e => e.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }
  },

  updateEquipment: async (id: string, updates: Partial<Equipment>): Promise<void> => {
    try {
      await fetchWithTimeout(`${API_URL}/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      const equip = getLocalList<Equipment>(LOCAL_EQUIP_KEY);
      const idx = equip.findIndex(e => e.id === id);
      if (idx !== -1) {
        equip[idx] = { ...equip[idx], ...updates };
        saveLocalList(LOCAL_EQUIP_KEY, equip);
      }
    }
  },

  getNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/notifications?userId=${userId}`);
      if (!response.ok) throw new Error('Backend unavailable');
      return await response.json();
    } catch (error) {
      return [];
    }
  }
};
