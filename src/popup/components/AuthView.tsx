import React from 'react';
import { LogIn, Cloud, Shield, ArrowRight } from 'lucide-react';

interface AuthViewProps {
  onConnect: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onConnect }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full bg-[#1e1e1e] text-white">
      <div className="relative mb-8 pt-4">
        <div className="w-20 h-20 bg-gradient-to-br from-[#e8a84b] to-[#c98e3b] rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-500/10 rotate-3 group-hover:rotate-6 transition-transform">
          <Cloud className="w-10 h-10 text-[#1e1e1e]" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-black/40 border border-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
          <Shield className="w-4 h-4 text-[#e8a84b]" />
        </div>
      </div>

      <div className="text-center mb-10 max-w-[240px]">
        <h2 className="text-2xl font-bold mb-3 tracking-tight">Sync to Cloud</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Access your workspaces across machines and share them with a single link.
        </p>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={onConnect}
          className="w-full py-4 bg-[#e8a84b] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#ffb752] transition-all transform active:scale-[0.98] shadow-lg shadow-black/20"
        >
          <LogIn size={18} />
          <span>Sign in at tabstratum.app</span>
        </button>
        
        <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest pt-2">
          Secure Session Bridge
        </p>
      </div>
    </div>
  );
};

export default AuthView;
