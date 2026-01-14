
import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, Phone, Star, Filter, ToggleLeft, ToggleRight, CheckCircle2 } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { storageService } from '../services/storageService';
import { Language, User, Job } from '../types';

interface DashboardProps {
    language: Language;
    currentUser: User;
    onUpdateAvailability?: (user: User) => void;
}

const WorkerDashboard: React.FC<DashboardProps> = ({ language, currentUser, onUpdateAvailability }) => {
    const t = TRANSLATIONS[language];
    const [radius, setRadius] = useState<number>(25);
    const [sortBy, setSortBy] = useState<'nearest' | 'rating'>('nearest');
    const [realJobs, setRealJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean>(currentUser.available ?? true);

    useEffect(() => {
        let isMounted = true;

        const fetchJobs = async (isInitial = false) => {
            if (isInitial) setLoading(true);
            try {
                const jobs = await storageService.getJobs(currentUser.lat, currentUser.lng, radius);
                if (isMounted) setRealJobs(jobs.filter(j => j.status === 'OPEN'));
            } catch (e) {
                console.error("Error fetching jobs", e);
            } finally {
                if (isInitial && isMounted) setLoading(false);
            }
        };

        fetchJobs(true);

        const intervalId = setInterval(() => {
            fetchJobs(false);
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [currentUser, radius]);

    const handleToggleAvailability = async () => {
        const newState = !isAvailable;
        setIsAvailable(newState);
        const updatedUser = await storageService.updateUser(currentUser.id, { available: newState });
        if (updatedUser && onUpdateAvailability) {
            onUpdateAvailability(updatedUser);
        }
    };

    const handleCallFarmer = (farmerPhone: string) => {
        if (farmerPhone) {
            window.location.href = `tel:${farmerPhone}`;
        } else {
            alert("Farmer phone number not available.");
        }
    };

    const handleApplyJob = async (job: Job) => {
        if (confirm(`Do you want to apply for ${job.workType} at ₹${job.wage}/day?`)) {
            // Instant local UI update
            setRealJobs(prev => prev.filter(j => j.id !== job.id));

            await storageService.updateJobStatus(job.id, 'FILLED');
            alert("Applied successfully! The farmer has been notified.");
        }
    };

    const handleOpenMap = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    };

    const jobs = [...realJobs].sort((a, b) => {
        if (sortBy === 'nearest') return a.distance - b.distance;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
    });

    return (
        <div className="pb-24">
            {/* Simple Header for Worker Context */}
            <div className="bg-white/80 backdrop-blur-sm px-4 py-3 shadow-sm border-b border-gray-100 flex justify-between items-center sticky top-16 z-30">
                <h1 className="font-bold text-xl text-gray-800 flex items-center">
                    <Briefcase className="mr-2 text-amber-500 h-6 w-6" /> Find Jobs
                </h1>

                {/* Availability Toggle */}
                <button
                    onClick={handleToggleAvailability}
                    className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isAvailable ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-red-100 text-red-700 ring-1 ring-red-300'}`}
                >
                    {isAvailable ? 'I am Available' : 'Not Available'}
                    {isAvailable ? <ToggleRight className="ml-2 h-5 w-5" /> : <ToggleLeft className="ml-2 h-5 w-5" />}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white/60 backdrop-blur-sm px-4 py-4 mb-2 shadow-sm">
                <div className="flex space-x-4 mb-4">
                    <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <input type="radio" name="sortW" className="accent-amber-500 w-4 h-4" checked={sortBy === 'nearest'} onChange={() => setSortBy('nearest')} />
                        <span className="text-sm font-medium text-gray-700">{t.nearest}</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <input type="radio" name="sortW" className="accent-amber-500 w-4 h-4" checked={sortBy === 'rating'} onChange={() => setSortBy('rating')} />
                        <span className="text-sm font-medium text-gray-700">{t.rating}</span>
                    </label>
                </div>
                <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                    {[10, 25, 50, 100].map(r => (
                        <button
                            key={r}
                            onClick={() => setRadius(r)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${radius === r ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-amber-50'}`}
                        >
                            {r} {t.km}
                        </button>
                    ))}
                </div>
            </div>

            {/* Job Feed */}
            <div className="px-4 space-y-4 mt-4">
                {loading ? (
                    <div className="text-center py-10 font-bold text-gray-400 uppercase tracking-widest text-xs">Loading...</div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-2xl mx-4 border border-dashed border-gray-200">
                        <Filter className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 font-bold text-xs">{t.noResults}</p>
                        <p className="text-[10px] text-gray-400 mt-2">Farmers post new jobs every day. Check back soon!</p>
                    </div>
                ) : (
                    jobs.map(job => (
                        <div key={job.id} className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-white/50 hover:border-amber-300 transition-all group active:scale-[0.99]">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-extrabold text-gray-900 text-xl leading-tight">{job.workType}</h3>
                                    <p className="text-amber-600 font-black text-sm mt-0.5">{job.farmerName}</p>
                                </div>
                                <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-2xl text-sm font-black shadow-sm border border-green-100">
                                    ₹{job.wage}{t.perDay}
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 text-xs text-gray-500 font-bold mb-4">
                                <div className="flex items-center">
                                    <MapPin className="h-3.5 w-3.5 mr-1 text-agri-green" />
                                    {job.distance} {t.km}
                                </div>
                                <div className="flex items-center">
                                    <Star className="h-3.5 w-3.5 mr-1 text-yellow-400 fill-current" />
                                    {job.rating || 'New'}
                                </div>
                                <div className="bg-gray-100 px-2 py-0.5 rounded-lg text-gray-600 border border-gray-200">
                                    {job.date}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-5 line-clamp-2 leading-relaxed">{job.description}</p>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleApplyJob(job)}
                                    className="flex-1 bg-agri-dark text-white font-black py-4 rounded-2xl shadow-xl shadow-green-100 flex items-center justify-center transition-all hover:bg-agri-green active:scale-95"
                                >
                                    <CheckCircle2 className="h-5 w-5 mr-2" /> Book Now
                                </button>
                                <button
                                    onClick={() => handleCallFarmer(job.farmerPhone)}
                                    className="w-14 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-amber-100 active:scale-95"
                                >
                                    <Phone className="h-6 w-6" />
                                </button>
                                <button
                                    onClick={() => handleOpenMap(job.lat, job.lng)}
                                    className="w-14 bg-gray-100 hover:bg-blue-100 text-blue-600 font-bold rounded-2xl flex items-center justify-center transition-colors active:scale-95"
                                    title="View on Map"
                                >
                                    <MapPin className="h-6 w-6" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WorkerDashboard;
