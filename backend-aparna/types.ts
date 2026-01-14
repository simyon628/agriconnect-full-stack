
export enum UserRole {
  FARMER = 'FARMER',
  WORKER = 'WORKER',
  PROVIDER = 'PROVIDER',
  STORE = 'STORE',
  NONE = 'NONE'
}

export enum Language {
  EN = 'English',
  HI = 'Hindi',
  TE = 'Telugu',
  TA = 'Tamil',
  KN = 'Kannada',
  ML = 'Malayalam',
  MR = 'Marathi',
  BN = 'Bengali',
  GU = 'Gujarati',
  PA = 'Punjabi',
  ES = 'Spanish'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  location: string;
  lat: number;
  lng: number;
  available?: boolean;
  shopImages?: string[]; 
}

export interface StoreProduct {
  id: string;
  name: string;
  category: 'Seeds' | 'Fertilizer' | 'Pesticide' | 'Tools';
  price?: string;
  images?: string[]; 
}

export interface Job {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string; 
  workType: string;
  date: string;
  wage: number;
  location: string; 
  distance: number; 
  rating: number;
  description?: string;
  status: 'OPEN' | 'FILLED' | 'COMPLETED' | 'CANCELLED';
  lat: number;
  lng: number;
}

export interface WorkerProfile {
  id: string;
  name: string;
  phone: string; 
  skills: string[];
  rating: number;
  distance: number; 
  available: boolean;
  image?: string;
  lat: number;
  lng: number;
}

export interface Equipment {
  id: string;
  providerId: string;
  phone: string; 
  type: string;
  name: string;
  image: string; 
  images?: string[]; 
  rentPerDay: number;
  available: boolean;
  location: string;
  distance: number; 
  rating: number;
  lat: number;
  lng: number;
  manufacturer?: string;
  model?: string;
  year?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'JOB' | 'WORKER' | 'SYSTEM' | 'STORE';
  read: boolean;
  timestamp: number;
}
