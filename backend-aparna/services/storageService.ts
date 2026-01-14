import { User, Job, Equipment, WorkerProfile, Notification, UserRole, StoreProduct } from '../types';
import { calculateDistance } from '../constants';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const storageService = {
  // USER OPERATIONS

  // 1. Fetch User by Phone (For Login)
  getUserByPhone: async (phone: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/lookup?phone=${phone}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch user');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user by phone:', error);
      return null;
    }
  },

  // 2. Save/Register User (For Signup)
  saveUser: async (user: User): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      if (!response.ok) throw new Error('Failed to save user');

      const savedUser = await response.json();
      console.log('✅ User saved to Backend:', savedUser.id);
      return savedUser;
    } catch (error) {
      console.error('❌ Error saving user to Backend:', error);
      throw error;
    }
  },

  updateUser: async (id: string, updates: Partial<User> | { available: boolean }): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },

  getWorkers: async (lat: number, lng: number, radius: number = 50): Promise<WorkerProfile[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/workers?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) return [];

      const workers = await response.json();
      // The backend returns users, we need to map them to WorkerProfile if needed
      // But based on current backend usage, it likely returns compatible objects
      // We might need to transform them slightly if types mismatch, but backend seems aligned.
      return workers.map((w: any) => ({
        ...w,
        skills: w.skills || ['General Labor'], // Default skills if missing
        rating: w.rating || 5.0,
        image: w.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=random`
      }));
    } catch (error) {
      console.error('Error fetching workers:', error);
      return [];
    }
  },

  // JOB OPERATIONS
  postJob: async (job: Job) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });

      if (!response.ok) throw new Error('Failed to post job');

      const result = await response.json();
      console.log('✅ Job posted to Backend:', result.id);
    } catch (error) {
      console.error('❌ Error posting job to Backend:', error);
      throw error;
    }
  },

  updateJobStatus: async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update job status');

      console.log('✅ Job status updated:', id, status);
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  },

  getJobs: async (lat: number, lng: number, radius: number = 50): Promise<Job[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
  },

  getMyJobs: async (farmerId: string): Promise<Job[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs?farmerId=${farmerId}`);
      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      console.error('Error fetching my jobs:', error);
      return [];
    }
  },

  // STORE OPERATIONS
  getUserById: async (id: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user by id:', error);
      return null;
    }
  },

  getStoreProducts: async (storeId: string): Promise<StoreProduct[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${storeId}`);
      if (!response.ok) return [];
      const user = await response.json();
      return user.products || [];
    } catch (error) {
      console.error('Error fetching store products:', error);
      return [];
    }
  },

  addStoreProduct: async (storeId: string, product: StoreProduct): Promise<StoreProduct[]> => {
    try {
      // 1. Get current user to get current products
      const response = await fetch(`${API_BASE_URL}/users/${storeId}`);
      if (!response.ok) throw new Error('User not found');
      const user = await response.json();

      const currentProducts = user.products || [];
      const updatedProducts = [...currentProducts, product];

      // 2. Update user with new products list
      const updateResponse = await fetch(`${API_BASE_URL}/users/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updatedProducts })
      });

      if (!updateResponse.ok) throw new Error('Failed to update store products');
      return updatedProducts;
    } catch (error) {
      console.error('Error adding store product:', error);
      throw error;
    }
  },

  deleteStoreProduct: async (storeId: string, productId: string): Promise<StoreProduct[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${storeId}`);
      if (!response.ok) throw new Error('User not found');
      const user = await response.json();

      const currentProducts = user.products || [];
      const updatedProducts = currentProducts.filter((p: StoreProduct) => p.id !== productId);

      const updateResponse = await fetch(`${API_BASE_URL}/users/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updatedProducts })
      });

      if (!updateResponse.ok) throw new Error('Failed to delete store product');
      return updatedProducts;
    } catch (error) {
      console.error('Error deleting store product:', error);
      throw error;
    }
  },

  // EQUIPMENT OPERATIONS
  addEquipment: async (item: Equipment) => {
    try {
      const response = await fetch(`${API_BASE_URL}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      if (!response.ok) throw new Error('Failed to add equipment');

      const result = await response.json();
      console.log('✅ Equipment added to Backend:', result.id);
    } catch (error) {
      console.error('❌ Error adding equipment to Backend:', error);
      throw error;
    }
  },

  getEquipment: async (lat: number, lng: number, radius: number = 50): Promise<Equipment[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/equipment?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
  },

  // NOTIFICATIONS
  getNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications?userId=${userId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }
};

