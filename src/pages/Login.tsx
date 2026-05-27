import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200 border border-slate-100 text-center relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-50 rounded-full blur-3xl opacity-50"></div>
          
          <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/10 border border-brand-100/50 p-2.5">
            <svg viewBox="0 0 100 100" fill="none" className="w-16 h-16 text-brand-600" xmlns="http://www.w3.org/2000/svg">
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
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter italic">SakuSantri</h1>
          <p className="text-slate-400 font-medium text-sm mb-10 leading-relaxed">
            Sistem Digital Pengelolaan<br />Tabungan Santri Modern.
          </p>
          
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-95 shadow-xl shadow-slate-300"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 brightness-200" />
            Lanjut dengan Google
          </button>
          
          <p className="mt-10 text-[10px] text-slate-300 uppercase font-black tracking-[0.2em]">
            Internal Access Only
          </p>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-xs font-medium">
          &copy; 2026 Admin Panel SakuSantri
        </p>
      </div>
    </div>
  );
}
