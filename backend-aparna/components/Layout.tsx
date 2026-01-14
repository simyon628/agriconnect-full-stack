
import React, { useEffect, useState, useCallback } from 'react';
import { LogOut, MapPin, ChevronDown, Bell, User as UserIcon, X, Edit2, Loader2 } from 'lucide-center';
import { UserRole, Language, Notification, User } from '../types';
import { TRANSLATIONS } from '../constants';
import { storageService } from '../services/storageService';
import { LogOut as LogOutIcon, MapPin as MapPinIcon, ChevronDown as ChevronDownIcon, Bell as BellIcon, User as UserIconComp, X as XIcon, Edit2 as EditIcon, Loader2 as LoaderIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
  currentUser?: User | null;
  onUserUpdate?: (user: User) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role, language, onLanguageChange, onLogout, currentUser, onUserUpdate }) => {
  const t = TRANSLATIONS[language];
  const [locationName, setLocationName] = useState<string>(() => localStorage.getItem('agri_location_name') || t.detecting);
  const [isLocating, setIsLocating] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const [editForm, setEditForm] = useState({ name: '', location: '' });

  const detectLocation = useCallback(async (force = false) => {
    if (isLocating) return;
    
    const cached = localStorage.getItem('agri_location_name');
    if (cached && !force && locationName !== t.detecting) {
        return;
    }

    setIsLocating(true);
    setLocationName(t.detecting);

    if (!navigator.geolocation) {
        setLocationName("Not Supported");
        setIsLocating(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const data = await response.json();
            const address = data.address;
            const loc = address.village || address.town || address.city || address.county || "Detected Location";
            
            setLocationName(loc);
            localStorage.setItem('agri_location_name', loc);
            
            // IMPROVED AUTOMATIC LANGUAGE SWITCHING BY STATE
            if (!localStorage.getItem('agri_language')) {
                const state = (address.state || '').toLowerCase();
                const countryCode = (address.country_code || '').toLowerCase();
                
                // Specific State Mapping for India
                if (state.includes('tamil nadu')) {
                    onLanguageChange(Language.TA);
                } else if (state.includes('karnataka')) {
                    onLanguageChange(Language.KN);
                } else if (state.includes('kerala')) {
                    onLanguageChange(Language.ML);
                } else if (state.includes('maharashtra')) {
                    onLanguageChange(Language.MR);
                } else if (state.includes('gujarat')) {
                    onLanguageChange(Language.GU);
                } else if (state.includes('west bengal')) {
                    onLanguageChange(Language.BN);
                } else if (state.includes('punjab') || state.includes('haryana')) {
                    onLanguageChange(Language.PA);
                } else if (state.includes('telangana') || state.includes('andhra pradesh')) {
                    onLanguageChange(Language.TE);
                } else if (countryCode === 'in') {
                    onLanguageChange(Language.HI); // Default for other parts of India
                } else if (['es', 'mx', 'ar', 'co', 'cl', 'pe'].includes(countryCode)) {
                    onLanguageChange(Language.ES);
                }
            }

            if (currentUser) {
              storageService.updateUser(currentUser.id, { lat: latitude, lng: longitude, location: loc });
            }
        } catch (e) {
            setLocationName(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        }
        setIsLocating(false);
      },
      () => {
        setLocationName("Set Location");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [t.detecting, isLocating, locationName, currentUser, onLanguageChange]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  useEffect(() => {
      if (currentUser?.id) {
          const fetchNotifs = async () => {
              const data = await storageService.getNotifications(currentUser.id);
              setNotifications(data);
          };
          fetchNotifs();
          const interval = setInterval(fetchNotifs, 15000);
          return () => clearInterval(interval);
      }
  }, [currentUser]);

  useEffect(() => {
      if (currentUser) {
          setEditForm({ name: currentUser.name, location: currentUser.location });
      }
  }, [currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      const updatedUser = await storageService.updateUser(currentUser.id, editForm);
      if (updatedUser && onUserUpdate) {
          onUserUpdate(updatedUser);
          setShowProfile(false);
      }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 px-4 py-3 flex justify-between items-center h-16 transition-all duration-300">
        <div 
          className="flex flex-col justify-center flex-1 cursor-pointer group" 
          onClick={() => detectLocation(true)}
          onMouseEnter={() => detectLocation()}
        >
          <div className="flex items-center text-agri-dark font-bold text-xs uppercase tracking-wider mb-0.5 group-hover:text-agri-green transition-colors">
             <MapPinIcon className={`h-3 w-3 mr-1 text-agri-green ${isLocating ? 'animate-pulse' : ''}`} />
             {isLocating ? "Locating..." : t.location}
          </div>
          <div className="flex items-center text-sm font-bold text-gray-800 truncate max-w-[150px]">
            {isLocating ? (
                <span className="flex items-center text-agri-green">
                    <LoaderIcon className="h-3 w-3 mr-1 animate-spin" /> {t.detecting}
                </span>
            ) : locationName} 
            {!isLocating && <ChevronDownIcon className="h-4 w-4 ml-1 text-agri-green opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
        </div>

        <div className="flex items-center space-x-2">
           {role !== UserRole.NONE && (
               <div className="relative">
                   <button onClick={() => setShowNotif(!showNotif)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 relative">
                       <BellIcon className="h-5 w-5 text-gray-600" />
                       {notifications.length > 0 && (
                           <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border border-white"></span>
                       )}
                   </button>
                   {showNotif && (
                       <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[60]">
                           <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-bold text-sm text-gray-700">Notifications</div>
                           <div className="max-h-60 overflow-y-auto">
                               {notifications.length === 0 ? (
                                   <div className="p-4 text-center text-xs text-gray-500">No new notifications</div>
                               ) : (
                                   notifications.map(n => (
                                       <div key={n.id} className="p-3 border-b border-gray-50 hover:bg-gray-50">
                                           <p className="text-sm text-gray-800">{n.message}</p>
                                           <p className="text-[10px] text-gray-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                       </div>
                                   ))
                               )}
                           </div>
                       </div>
                   )}
               </div>
           )}

           {role !== UserRole.NONE && (
               <button onClick={() => setShowProfile(true)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                   <UserIconComp className="h-5 w-5 text-gray-600" />
               </button>
           )}

           <div className="relative">
             <select 
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as Language)}
                className="bg-gray-100/50 text-gray-700 text-sm font-bold py-1.5 px-3 rounded-lg border-none focus:ring-0 cursor-pointer outline-none appearance-none pr-8 max-w-[60px]"
              >
                {Object.keys(Language).map(key => (
                  <option key={key} value={(Language as any)[key]}>{key}</option>
                ))}
             </select>
             <ChevronDownIcon className="absolute right-2 top-2 h-3 w-3 text-gray-500 pointer-events-none" />
           </div>
           
           {role !== UserRole.NONE && (
              <button onClick={onLogout} className="text-gray-400 hover:text-red-500 bg-gray-100/50 p-1.5 rounded-full">
                <LogOutIcon className="h-4 w-4" />
              </button>
           )}
        </div>
      </header>

      <main className="flex-grow w-full max-w-lg mx-auto pb-20">
        {children}
      </main>

      {showProfile && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold flex items-center"><EditIcon className="mr-2 h-5 w-5"/> Edit Profile</h2>
                      <button onClick={() => setShowProfile(false)} className="bg-gray-100 p-2 rounded-full"><XIcon className="h-5 w-5"/></button>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                          <input type="text" className="w-full border rounded-lg p-2 mt-1 bg-gray-50" 
                              value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                          <input type="text" className="w-full border rounded-lg p-2 mt-1 bg-gray-50" 
                              value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})}
                          />
                      </div>
                      <button type="submit" className="w-full bg-agri-green text-white py-3 rounded-xl font-bold">Save Changes</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Layout;
