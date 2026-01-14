
import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Star, Filter, Tractor, Users, Plus, X, Briefcase, ShoppingBag, ChevronLeft, ChevronRight, Camera, Tag, MapPin, CalendarCheck, CheckCircle2, Trash2, RefreshCcw, UserCheck } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { storageService } from '../services/storageService';
import { Language, User, Job, Equipment, StoreProduct } from '../types';

interface DashboardProps {
  language: Language;
  currentUser: User;
}

const ImageCarousel = ({ images }: { images: string[] }) => {
  const [index, setIndex] = useState(0);
  if (!images || images.length === 0) return null;
  
  return (
    <div className="relative w-full h-full">
      <img src={images[index]} className="w-full h-full object-cover" />
      {images.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + images.length) % images.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/30 text-white p-1 rounded-full backdrop-blur-sm"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % images.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/30 text-white p-1 rounded-full backdrop-blur-sm"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
};

const FarmerDashboard: React.FC<DashboardProps> = ({ language, currentUser }) => {
  const t = TRANSLATIONS[language]; 
  const [activeTab, setActiveTab] = useState<'workers' | 'equipment' | 'stores' | 'my_jobs'>('workers');
  const [sortBy, setSortBy] = useState<'nearest' | 'rating'>('nearest');
  const [radius, setRadius] = useState<number>(50);
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [jobForm, setJobForm] = useState({ workType: '', wage: '', description: '' });

  const [realWorkers, setRealWorkers] = useState<any[]>([]);
  const [realEquipment, setRealEquipment] = useState<Equipment[]>([]);
  const [realStores, setRealStores] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoadingData(true);
    try {
      const workers = await storageService.getWorkers(currentUser.lat, currentUser.lng, radius);
      setRealWorkers(workers);
      const equipment = await storageService.getEquipment(currentUser.lat, currentUser.lng, radius);
      setRealEquipment(equipment);
      const stores = await storageService.getStores(currentUser.lat, currentUser.lng, radius);
      setRealStores(stores);
      const jobs = await storageService.getMyJobs(currentUser.id);
      setMyJobs(jobs);
    } catch (e) {
      console.error("Error fetching dashboard data", e);
    } finally {
      if (isInitial) setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const intervalId = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(intervalId);
  }, [currentUser, radius]); 

  const handlePostJob = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!jobForm.workType || !jobForm.wage) return;
      const jobPayload: Job = {
          id: '',
          farmerId: currentUser.id,
          farmerName: currentUser.name,
          farmerPhone: currentUser.phone,
          workType: jobForm.workType,
          wage: parseInt(jobForm.wage),
          description: jobForm.description,
          date: new Date().toLocaleDateString(),
          location: currentUser.location,
          distance: 0,
          lat: currentUser.lat,
          lng: currentUser.lng,
          rating: 0,
          status: 'OPEN'
      };
      
      const savedJob = await storageService.postJob(jobPayload);
      
      // Instant feedback for My Jobs
      setMyJobs(prev => [savedJob, ...prev]);
      
      setIsPostingJob(false);
      setJobForm({ workType: '', wage: '', description: '' });
      setActiveTab('my_jobs');
      fetchData(false);
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: Job['status']) => {
    // Instant local update
    setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    await storageService.updateJobStatus(jobId, newStatus);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (confirm("Are you sure you want to delete this job posting?")) {
      setMyJobs(prev => prev.filter(j => j.id !== jobId));
      await storageService.deleteJob(jobId);
    }
  };

  const handleBookEquipment = async (item: Equipment) => {
      if (!item.available) return;
      if (confirm(`Do you want to book ${item.name}?`)) {
          // Instant local update
          setRealEquipment(prev => prev.map(e => e.id === item.id ? {...e, available: false} : e));
          
          await storageService.updateEquipment(item.id, { available: false });
          alert("Booking successful!");
          fetchData(false);
      }
  };

  const displayedList = useMemo(() => {
      if (activeTab === 'my_jobs') return myJobs;
      let list = activeTab === 'workers' ? realWorkers : activeTab === 'equipment' ? realEquipment : realStores;
      return [...list].sort((a, b) => {
        if (sortBy === 'nearest') return (a.distance || 0) - (b.distance || 0);
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return 0;
      });
  }, [activeTab, realWorkers, realEquipment, realStores, myJobs, sortBy]);

  return (
    <div className="pb-24">
      <div className="bg-white/90 backdrop-blur-sm p-2 sticky top-16 z-40 shadow-sm flex space-x-1 border-b border-gray-100 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('workers')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center whitespace-nowrap transition-all duration-200 ${activeTab === 'workers' ? 'bg-agri-dark text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <Users className="h-4 w-4 mr-1.5" /> {t.workers}
        </button>
        <button onClick={() => setActiveTab('equipment')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center whitespace-nowrap transition-all duration-200 ${activeTab === 'equipment' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <Tractor className="h-4 w-4 mr-1.5" /> {t.equipment}
        </button>
        <button onClick={() => setActiveTab('stores')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center whitespace-nowrap transition-all duration-200 ${activeTab === 'stores' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <ShoppingBag className="h-4 w-4 mr-1.5" /> {t.stores}
        </button>
        <button onClick={() => setActiveTab('my_jobs')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center whitespace-nowrap transition-all duration-200 ${activeTab === 'my_jobs' ? 'bg-agri-accent text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <Briefcase className="h-4 w-4 mr-1.5" /> {t.myJobs}
        </button>
      </div>

      <div className="px-4 py-4">
        <button onClick={() => setIsPostingJob(true)} className="w-full bg-agri-green text-white py-4 rounded-2xl font-extrabold shadow-lg shadow-green-100 hover:bg-agri-dark transition-all flex justify-center items-center active:scale-95">
            <Plus className="h-6 w-6 mr-2" /> {t.postJob}
        </button>
      </div>

      <div className="px-4 space-y-4">
          {displayedList.length === 0 ? (
             <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">
                {t.noResults}
             </div>
          ) : (
            displayedList.map((item: any) => (
                <div 
                  key={item.id} 
                  className={`bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/50 flex flex-col transition-all ${(!item.available && activeTab === 'equipment') || (item.status === 'FILLED' && activeTab === 'my_jobs') ? 'opacity-70' : ''}`}
                >
                    <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden border flex-shrink-0">
                          {item.images && item.images.length > 0 ? <ImageCarousel images={item.images} /> : (item.shopImages ? <ImageCarousel images={item.shopImages}/> : <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || item.workType)}&background=random`} className="w-full h-full object-cover"/>)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-extrabold text-gray-900 truncate text-lg">{item.name || item.workType}</h3>
                            <p className="text-gray-500 text-sm">
                              <span className="text-agri-green font-bold">{item.distance || 0} {t.km}</span>
                            </p>
                            
                            {(activeTab === 'equipment' || activeTab === 'my_jobs') && (
                                <div className="flex items-center justify-between mt-1">
                                    <p className={`font-extrabold ${activeTab === 'equipment' ? 'text-blue-600' : 'text-amber-600'}`}>
                                        ₹{item.rentPerDay || item.wage}{t.perDay}
                                    </p>
                                    <span className={`text-[10px] px-2 py-1 rounded font-black uppercase ${
                                        (activeTab === 'equipment' && item.available) || (activeTab === 'my_jobs' && item.status === 'OPEN') 
                                        ? 'bg-green-100 text-green-700' 
                                        : item.status === 'FILLED' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                                    }`}>
                                        {activeTab === 'equipment' 
                                          ? (item.available ? 'Ready' : 'Rented') 
                                          : (item.status === 'OPEN' ? 'Open' : item.status === 'FILLED' ? 'Filled' : item.status === 'COMPLETED' ? 'Completed' : 'Cancelled')}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col space-y-2">
                            {item.phone && activeTab !== 'my_jobs' && <button onClick={() => window.location.href = `tel:${item.phone}`} className="p-3 bg-agri-green text-white rounded-full shadow-lg shadow-green-100 active:scale-90 transition-transform"><Phone className="h-4 w-4"/></button>}
                            {activeTab === 'equipment' && item.available && (
                                <button onClick={() => handleBookEquipment(item)} className="p-3 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-100 active:scale-90 transition-transform"><CalendarCheck className="h-4 w-4"/></button>
                            )}
                        </div>
                    </div>

                    {/* My Jobs Management Actions */}
                    {activeTab === 'my_jobs' && (
                        <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {item.status === 'OPEN' && (
                                <button 
                                    onClick={() => handleUpdateJobStatus(item.id, 'FILLED')}
                                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-100 transition-colors"
                                >
                                    <UserCheck className="h-3.5 w-3.5" />
                                    <span>Mark Filled</span>
                                </button>
                            )}
                            {(item.status === 'FILLED' || item.status === 'OPEN') && (
                                <button 
                                    onClick={() => handleUpdateJobStatus(item.id, 'COMPLETED')}
                                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-green-100 transition-colors"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Complete</span>
                                </button>
                            )}
                            {(item.status === 'FILLED' || item.status === 'COMPLETED' || item.status === 'CANCELLED') && (
                                <button 
                                    onClick={() => handleUpdateJobStatus(item.id, 'OPEN')}
                                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 transition-colors"
                                >
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    <span>Re-open</span>
                                </button>
                            )}
                            <button 
                                onClick={() => handleDeleteJob(item.id)}
                                className="flex items-center justify-center space-x-1 px-3 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                            </button>
                        </div>
                    )}
                </div>
            ))
          )}
      </div>

      {isPostingJob && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md">
             <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-2xl font-extrabold text-gray-900">{t.postJob}</h3>
                     <button onClick={() => setIsPostingJob(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X className="h-6 w-6 text-gray-500"/></button>
                 </div>
                 <form onSubmit={handlePostJob} className="space-y-5">
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t.workType}</label>
                        <input required className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold focus:ring-2 focus:ring-agri-green outline-none" placeholder="e.g. Rice Harvesting" value={jobForm.workType} onChange={e => setJobForm({...jobForm, workType: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t.dailyWage} (₹)</label>
                        <input required type="number" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold focus:ring-2 focus:ring-agri-green outline-none" placeholder="0.00" value={jobForm.wage} onChange={e => setJobForm({...jobForm, wage: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t.description}</label>
                        <textarea className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-medium focus:ring-2 focus:ring-agri-green outline-none" placeholder="More details about the work..." value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} />
                     </div>
                     <button type="submit" className="w-full bg-agri-green text-white py-5 rounded-2xl font-extrabold text-lg shadow-xl shadow-green-100 hover:bg-agri-dark transition-all transform active:scale-95">
                        {t.postJob}
                     </button>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
