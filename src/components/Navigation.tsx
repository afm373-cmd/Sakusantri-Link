import React from 'react';
import { Home, Users, History, LogOut, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'santri', label: 'Data Anak', icon: Users },
    { id: 'history', label: 'Riwayat', icon: History },
    { id: 'api-key', label: 'API Gemini', icon: Key },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50 md:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                  isActive ? 'text-brand-600' : 'text-slate-500'
                }`}
              >
                <Icon size={isActive ? 24 : 20} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-50 transition-colors">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-md shadow-brand-500/5 p-1 border border-brand-100/30">
              <svg viewBox="0 0 100 100" fill="none" className="w-8 h-8 text-brand-600" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M30 38 L33 14 Q50 11 67 14 L70 38 Z" 
                  fill="currentColor" 
                  fillOpacity="0.15" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d="M32 38 C32 44 33 54 35 58 Q50 69 65 58 C67 54 68 44 68 38" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d="M41 58 Q50 72 59 58" 
                  stroke="currentColor" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d="M50 66 L50 86" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeDasharray="4 3" 
                />
                <path 
                  d="M22 72 Q12 78 6 92" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                />
                <path 
                  d="M78 72 Q88 78 94 92" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                />
              </svg>
            </div>
            <h1 className="font-bold text-xl tracking-tight text-brand-900 italic">SakuSantri</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 mt-auto">
          <div className="p-3 bg-slate-900 rounded-2xl flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-full bg-brand-500 border-2 border-slate-900 flex items-center justify-center text-xs font-bold shadow-inner">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">{user?.displayName || 'Pengurus'}</p>
              <p className="text-[10px] opacity-60 truncate">Admin Pondok</p>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              title="Keluar"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
