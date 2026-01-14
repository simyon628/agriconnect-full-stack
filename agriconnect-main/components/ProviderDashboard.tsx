
import React, { useState, useEffect, useRef } from 'react';
import { Tractor, Plus, TrendingUp, Settings, MapPin, CheckCircle, XCircle, X, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { suggestEquipmentMaintenance } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Equipment, Language, User } from '../types';

interface DashboardProps {
    language: Language;
    currentUser: User;
}

const ProviderDashboard: React.FC<DashboardProps> = ({ language, currentUser }) => {
  const [tips, setTips] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [myFleet, setMyFleet] = useState<Equipment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Expanded Form State with Images
  const [equipForm, setEquipForm] = useState<{
    name: string;
    type: string;
    rent: string;
    manufacturer: string;
    model: string;
    year: string;
    images: string[];
  }>({ 
      name: '', type: 'Tractor', rent: '', manufacturer: '', model: '', year: '', images: [] 
  });

  useEffect(() => {
    let isMounted = true;
    const fetchFleet = async () => {
        try {
            const allEquip = await storageService.getEquipment(currentUser.lat, currentUser.lng, 1000);
            if (isMounted) setMyFleet(allEquip.filter(e => e.providerId === currentUser.id));
        } catch (e) {
            console.error("Fetch fleet error", e);
        }
    };

    fetchFleet();
    const intervalId = setInterval(fetchFleet, 5000);
    return () => {
        isMounted = false;
        clearInterval(intervalId);
    };
  }, [currentUser]);

  const activeRentals = myFleet.filter(item => !item.available).length;

  const handleGetMaintenanceTips = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTips("Loading AI suggestions...");
    const result = await suggestEquipmentMaintenance(name);
    setTips(result);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    if (equipForm.images.length + files.length > 3) {
      alert("Maximum 3 images allowed.");
      return;
    }

    // Cast file as File to fix the 'unknown' assignment to 'Blob' error
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEquipForm(prev => ({
          ...prev,
          images: [...prev.images, reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setEquipForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!equipForm.name || !equipForm.rent) return;

      // Fixed: Added missing 'phone' property from currentUser to satisfy Equipment interface
      const newItem: Equipment = {
          id: '', 
          providerId: currentUser.id,
          phone: currentUser.phone,
          name: equipForm.name,
          type: equipForm.type,
          rentPerDay: parseInt(equipForm.rent),
          available: true,
          image: equipForm.images[0] || 'https://images.unsplash.com/photo-1592601249767-a2f0a82753a6?q=80&w=600&auto=format&fit=crop', 
          images: equipForm.images,
          location: currentUser.location,
          lat: currentUser.lat,
          lng: currentUser.lng,
          distance: 0,
          rating: 0,
          manufacturer: equipForm.manufacturer,
          model: equipForm.model,
          year: equipForm.year
      };

      await storageService.addEquipment(newItem);
      
      const allEquip = await storageService.getEquipment(currentUser.lat, currentUser.lng, 1000);
      setMyFleet(allEquip.filter(e => e.providerId === currentUser.id));
      
      setIsAdding(false);
      setEquipForm({ name: '', type: 'Tractor', rent: '', manufacturer: '', model: '', year: '', images: [] });
  };

  return (
    <div className="pb-24">
      <div className="bg-blue-600 px-4 pt-6 pb-8 rounded-b-[2rem] shadow-xl shadow-blue-200/50 mb-6">
        <div className="flex justify-between items-center text-white mb-6">
             <h2 className="text-xl font-bold flex items-center">
                <Tractor className="mr-2 h-6 w-6" /> My Fleet
             </h2>
             <button 
                onClick={() => setIsAdding(true)}
                className="bg-white/20 p-2 rounded-full hover:bg-white/30 backdrop-blur-md transition-colors"
             >
                <Plus className="h-5 w-5 text-white" />
             </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Total Items</p>
                <h3 className="text-2xl font-extrabold text-white flex items-baseline">
                    {myFleet.length}
                    <TrendingUp className="h-4 w-4 ml-2 text-green-300" />
                </h3>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Active Rentals</p>
                <h3 className="text-2xl font-extrabold text-white">{activeRentals} <span className="text-sm font-normal text-blue-200">/ {myFleet.length}</span></h3>
            </div>
        </div>
      </div>

      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-lg">Manage Equipment</h3>
        </div>

        <div className="space-y-4">
            {myFleet.length === 0 ? (
                <div className="text-center py-10 bg-white/60 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">No equipment added yet.</p>
                    <button onClick={() => setIsAdding(true)} className="mt-2 text-blue-600 font-bold text-sm">Add your first item</button>
                </div>
            ) : (
                myFleet.map(item => (
                    <div key={item.id} className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/50 relative overflow-hidden transition-all hover:shadow-md">
                        <div className="flex space-x-4">
                            <img 
                                src={(item.images && item.images.length > 0) ? item.images[0] : item.image} 
                                alt={item.name} 
                                className="w-20 h-20 rounded-xl object-cover bg-gray-100 shadow-inner"
                            />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                                <p className="text-xs text-gray-500 mb-1">{item.manufacturer} {item.model}</p>
                                <div className="flex items-center text-xs text-gray-400 mb-3">
                                    <MapPin className="h-3 w-3 mr-1" /> {item.location}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-blue-600">₹{item.rentPerDay}<span className="text-gray-400 font-normal text-xs">/day</span></span>
                                    <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${item.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {item.available ? <CheckCircle className="h-3 w-3 mr-1"/> : <XCircle className="h-3 w-3 mr-1"/>}
                                        {item.available ? 'Available' : 'Rented'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                            <button 
                                onClick={(e) => handleGetMaintenanceTips(item.type, e)}
                                className="text-xs font-bold text-gray-500 flex items-center hover:text-blue-600 transition-colors"
                            >
                                <Settings className="h-3.5 w-3.5 mr-1" /> AI Maintenance
                            </button>
                            <button className="text-xs font-bold text-blue-600 hover:underline">
                                Edit Details
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
             <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-gray-800">Add New Equipment</h3>
                     <button onClick={() => setIsAdding(false)} className="p-2 bg-gray-100 rounded-full"><X className="h-5 w-5 text-gray-500"/></button>
                 </div>
                 <form onSubmit={handleAddEquipment} className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Equipment Name (Nickname)</label>
                         <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. Big Red" 
                             value={equipForm.name} onChange={e => setEquipForm({...equipForm, name: e.target.value})}
                         />
                     </div>
                     
                     {/* Image Upload Section */}
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Photos (Up to 3)</label>
                        <div className="flex flex-wrap gap-2">
                           {equipForm.images.map((img, idx) => (
                             <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border">
                                <img src={img} className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                             </div>
                           ))}
                           {equipForm.images.length < 3 && (
                             <button 
                               type="button"
                               onClick={() => fileInputRef.current?.click()}
                               className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all"
                             >
                               <Camera className="w-6 h-6" />
                               <span className="text-[10px] mt-1 font-bold">Add Photo</span>
                             </button>
                           )}
                           <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*" 
                              multiple 
                              onChange={handleFileChange}
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                             <select className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600"
                                value={equipForm.type} onChange={e => setEquipForm({...equipForm, type: e.target.value})}
                             >
                                 <option>Tractor</option>
                                 <option>Harvester</option>
                                 <option>Seeder</option>
                                 <option>Sprayer</option>
                                 <option>Drone</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rent/Day (₹)</label>
                             <input required type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" 
                                 value={equipForm.rent} onChange={e => setEquipForm({...equipForm, rent: e.target.value})}
                             />
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Manufacturer</label>
                             <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. Mahindra"
                                 value={equipForm.manufacturer} onChange={e => setEquipForm({...equipForm, manufacturer: e.target.value})}
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model</label>
                             <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. 575 DI"
                                 value={equipForm.model} onChange={e => setEquipForm({...equipForm, model: e.target.value})}
                             />
                        </div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year of Manufacture</label>
                         <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600" placeholder="e.g. 2020"
                             value={equipForm.year} onChange={e => setEquipForm({...equipForm, year: e.target.value})}
                         />
                     </div>

                     <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 mt-4">
                         Add Equipment
                     </button>
                 </form>
             </div>
          </div>
      )}

      {tips && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100 border border-white/20">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Settings className="mr-2 h-5 w-5 text-blue-600" /> Maintenance Tips
                </h4>
                
                <div className="bg-blue-50 p-4 rounded-2xl text-sm text-gray-700 leading-relaxed mb-6 border border-blue-100">
                    {tips === "Loading AI suggestions..." ? (
                        <div className="flex items-center justify-center py-4 space-x-2">
                             <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                             <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                             <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                        </div>
                    ) : (
                       tips
                    )}
                </div>
                
                <button 
                    onClick={() => setTips(null)}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                >
                    Got it
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
