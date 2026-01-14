
import React, { useState, useEffect } from 'react';
import { UserRole, Language, User } from './types';
import Layout from './components/Layout';
import RoleSelection from './components/RoleSelection';
import FarmerDashboard from './components/FarmerDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import ProviderDashboard from './components/ProviderDashboard';
import StoreDashboard from './components/StoreDashboard';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [language, setLanguage] = useState<Language>(() => {
    // 1. Check saved preference
    const savedLang = localStorage.getItem('agri_language');
    if (savedLang && Object.values(Language).includes(savedLang as Language)) {
      return savedLang as Language;
    }

    // 2. Detect from browser settings with expanded Indian support
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('hi')) return Language.HI;
    if (browserLang.startsWith('te')) return Language.TE;
    if (browserLang.startsWith('ta')) return Language.TA;
    if (browserLang.startsWith('kn')) return Language.KN;
    if (browserLang.startsWith('ml')) return Language.ML;
    if (browserLang.startsWith('mr')) return Language.MR;
    if (browserLang.startsWith('bn')) return Language.BN;
    if (browserLang.startsWith('gu')) return Language.GU;
    if (browserLang.startsWith('pa')) return Language.PA;
    if (browserLang.startsWith('es')) return Language.ES;

    // Default to English
    return Language.EN;
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('agri_language', lang);
  };

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const renderDashboard = () => {
    if (!currentUser) {
      return <RoleSelection language={language} onSelectRole={handleUserLogin} />;
    }

    switch (currentUser.role) {
      case UserRole.FARMER:
        return <FarmerDashboard language={language} currentUser={currentUser} />;
      case UserRole.WORKER:
        return <WorkerDashboard language={language} currentUser={currentUser} onUpdateAvailability={handleUserUpdate} />;
      case UserRole.PROVIDER:
        return <ProviderDashboard language={language} currentUser={currentUser} />;
      case UserRole.STORE:
        return <StoreDashboard language={language} currentUser={currentUser} onUserUpdate={handleUserUpdate} />;
      default:
        return <RoleSelection language={language} onSelectRole={handleUserLogin} />;
    }
  };

  return (
    <div className="relative min-h-screen font-sans text-gray-900">
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-gray-50">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-200/40 rounded-full mix-blend-multiply filter blur-[80px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-green-200/40 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        <Layout
          role={currentUser?.role || UserRole.NONE}
          language={language}
          onLanguageChange={handleLanguageChange}
          onLogout={handleLogout}
          currentUser={currentUser}
          onUserUpdate={handleUserUpdate}
        >
          {renderDashboard()}
        </Layout>
      </div>
    </div>
  );
};

export default App;
