
import React, { useState, useEffect } from 'react';
import { UserRole, Language, User } from '../types';
import { TRANSLATIONS } from '../constants';
import { storageService } from '../services/storageService';
import { Sprout, HardHat, Tractor, MapPin, Loader2, ArrowRight, X, ChevronRight, Check, ShoppingBag } from 'lucide-react';

interface RoleSelectionProps {
  language: Language;
  onSelectRole: (user: User) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ language, onSelectRole }) => {
  const t = TRANSLATIONS[language];
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginStep, setLoginStep] = useState<'details' | 'otp'>('details');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<{
    name: string,
    phone: string,
    location: string,
    otp: string,
    coords: { lat: number, lng: number } | null
  }>({
    name: '',
    phone: '',
    location: '',
    otp: '',
    coords: null
  });

  const handleRoleClick = (role: UserRole) => {
    setSelectedRole(role);
    setLoginStep('details');
    setAuthMode('login');
    setFormData({ name: '', phone: '', location: '', otp: '', coords: null });
    setShowLogin(true);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const loc = data.address.village || data.address.town || data.address.city || "Nearby";
          setFormData(prev => ({ ...prev, location: loc, coords: { lat: latitude, lng: longitude } }));
        } catch (e) {
          setFormData(prev => ({ ...prev, location: "Detected Location", coords: { lat: latitude, lng: longitude } }));
        }
        setLoading(false);
      },
      (error) => {
        console.error("Location error:", error);
        setLoading(false);
        if (error.code === 1) {
          alert("Location permission denied. Please enter manually.");
        } else if (window.location.protocol !== 'https:') {
          alert("Auto-location requires HTTPS. On mobile/network, please type your location manually.");
        } else {
          alert("Could not detect location. Please enter manually.");
        }
      },
      { timeout: 10000 }
    );
  };

  // Automatically trigger location detection when entering signup mode
  useEffect(() => {
    if (authMode === 'signup' && showLogin && !formData.location) {
      handleDetectLocation();
    }
  }, [authMode, showLogin]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLoginStep('otp');
      // Simulate sending
      alert(`DEMO: OTP sent to ${formData.phone}\nCode: 1234`);
      // Removed auto-fill so user can type it manually
    }, 800);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp.length !== 4) return;
    setLoading(true);

    if (authMode === 'login') {
      const existingUser = await storageService.getUserByPhone(formData.phone);
      if (existingUser) {
        onSelectRole(existingUser);
      } else {
        setAuthMode('signup');
        setLoginStep('details');
        setLoading(false);
      }
    } else {
      if (selectedRole) {
        const newUser: User = {
          id: crypto.randomUUID(),
          name: formData.name || 'Agri User',
          phone: formData.phone,
          role: selectedRole,
          location: formData.location || 'Unknown',
          lat: formData.coords?.lat || 20.59,
          lng: formData.coords?.lng || 78.96
        };

        const savedUser = await storageService.saveUser(newUser);
        localStorage.setItem('agri_location_name', newUser.location);
        onSelectRole(savedUser);
      }
    }
  };

  const RoleCard = ({ role, icon: Icon, title, desc, color }: { role: UserRole, icon: any, title: string, desc: string, color: string }) => (
    <button
      onClick={() => handleRoleClick(role)}
      className="w-full bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/50 flex items-center space-x-4 hover:bg-white active:scale-[0.98] transition-all group"
    >
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
        <Icon className={`h-8 w-8 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className="flex-1 text-left">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">{title}</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">{desc}</p>
      </div>
      <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-agri-green group-hover:translate-x-1 transition-all" />
    </button>
  );

  return (
    <div className="px-4 py-8 max-w-lg mx-auto overflow-y-auto pb-24">
      <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
        <div className="inline-block p-4 bg-white rounded-3xl shadow-xl mb-4 shadow-green-100">
          <Sprout className="h-10 w-10 text-agri-green" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
          AgriConnect
        </h1>
        <p className="text-gray-600 font-medium text-lg px-6">{t.selectRole}</p>
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-700">
        <RoleCard role={UserRole.FARMER} icon={Sprout} title={t.farmer} desc={t.farmerDesc} color="bg-agri-green" />
        <RoleCard role={UserRole.WORKER} icon={HardHat} title={t.worker} desc={t.workerDesc} color="bg-amber-500" />
        <RoleCard role={UserRole.PROVIDER} icon={Tractor} title={t.provider} desc={t.providerDesc} color="bg-blue-600" />
        <RoleCard role={UserRole.STORE} icon={ShoppingBag} title={t.store} desc={t.storeDesc} color="bg-purple-600" />
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h3 className="font-bold text-2xl text-gray-800">
                  {authMode === 'login' ? t.loginTitle : t.signupTitle}
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  {authMode === 'login' ? 'Login as ' : 'Registering as '}
                  <span className="text-agri-green font-extrabold uppercase">
                    {selectedRole === 'FARMER' ? t.farmer : selectedRole === 'WORKER' ? t.worker : selectedRole === 'PROVIDER' ? t.provider : t.store}
                  </span>
                </p>
              </div>
              <button onClick={() => setShowLogin(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-8 bg-white">
              {loginStep === 'details' ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  {authMode === 'signup' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-bold text-gray-600 mb-2">{t.fullName}</label>
                      <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 focus:ring-2 focus:ring-agri-green outline-none font-medium"
                        placeholder={t.enterName} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">{t.phoneNumber}</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 rounded-l-2xl border border-r-0 border-gray-200 bg-gray-100 text-gray-600 font-extrabold">+91</span>
                      <input required type="tel" maxLength={10} className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-r-2xl p-4 focus:ring-2 focus:ring-agri-green outline-none font-bold tracking-wider"
                        placeholder="00000 00000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} />
                    </div>
                  </div>

                  {authMode === 'signup' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
                      <label className="block text-sm font-bold text-gray-600 mb-2">{t.location}</label>
                      <div className="relative">
                        <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-agri-green outline-none font-medium"
                          placeholder="Village / Town" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        <button type="button" onClick={handleDetectLocation} className="absolute right-3 top-3.5 p-1 text-agri-green hover:bg-green-50 rounded-xl transition-all">
                          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <MapPin className="h-6 w-6" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="w-full bg-agri-green text-white py-5 rounded-2xl font-extrabold text-lg shadow-xl shadow-green-100 hover:bg-agri-dark transition-all flex justify-center items-center mt-6 active:scale-95 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <>{t.getOtp} <ArrowRight className="ml-3 h-5 w-5" /></>}
                  </button>

                  <div className="pt-4 text-center">
                    <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-sm font-bold text-gray-500 hover:text-agri-green transition-all">
                      {authMode === 'login' ? 'New user? Sign Up here' : 'Already have an account? Login'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-8 text-center animate-in fade-in zoom-in duration-300">
                  <div>
                    <p className="text-gray-500 mb-8">{t.otpSent} <span className="font-extrabold text-gray-900">+91 {formData.phone}</span></p>
                    <div className="relative mb-2">
                      <div className="flex justify-center space-x-3">
                        {[0, 1, 2, 3].map((_, i) => (
                          <div key={i} className="w-16 h-20 border-2 border-gray-200 rounded-2xl flex items-center justify-center text-4xl font-extrabold text-gray-800 bg-gray-50 transition-all">
                            {formData.otp[i] || ""}
                          </div>
                        ))}
                      </div>
                      <input type="text" maxLength={4} autoFocus className="opacity-0 absolute inset-0 h-full w-full cursor-pointer z-10"
                        value={formData.otp} onChange={e => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-agri-green text-white py-5 rounded-2xl font-extrabold text-lg shadow-xl shadow-green-100 hover:bg-agri-dark transition-all active:scale-95 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin h-6 w-6" /> : t.verifyOtp}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelection;
