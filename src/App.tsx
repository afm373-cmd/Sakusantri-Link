import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SantriList from './pages/SantriList';
import History from './pages/History';
import ApiKeySettings from './pages/ApiKeySettings';
import Navigation from './components/Navigation';
import Layout from './components/Layout';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 transition-colors">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="bg-slate-50 min-h-screen transition-colors duration-300">
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      <Layout>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'santri' && <SantriList />}
        {activeTab === 'history' && <History />}
        {activeTab === 'api-key' && <ApiKeySettings />}
      </Layout>
    </div>
  );
}
