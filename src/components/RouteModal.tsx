import React from 'react';
import { RouteId } from '../types';
import { Compass, Check, ArrowRight } from 'lucide-react';

interface RouteModalProps {
  currentRoute: RouteId;
  onSelectRoute: (route: RouteId) => void;
  onProceed: () => void;
}

export const RouteModal: React.FC<RouteModalProps> = ({
  currentRoute,
  onSelectRoute,
  onProceed,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#180e2f] via-[#0f091f] to-[#080410] border-2 border-fuchsia-500/80 rounded-3xl p-6 shadow-[0_0_55px_rgba(255,0,160,0.35)] flex flex-col text-center">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-fuchsia-950/80 border border-fuchsia-400 flex items-center justify-center text-fuchsia-300 mx-auto mb-3 shadow-[0_0_20px_rgba(255,0,160,0.5)]">
          <Compass className="w-8 h-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase mb-1">
          BRANCHING ROUTE UNLOCKED!
        </h2>
        <p className="text-xs sm:text-sm text-cyan-300 font-semibold mb-5">
          Level 10 Cleared! Choose your operational trajectory for upcoming sectors:
        </p>

        {/* Route Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
          {/* Path A */}
          <div
            onClick={() => onSelectRoute('metropolis')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
              currentRoute === 'metropolis'
                ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.35)]'
                : 'bg-black/50 border-slate-800 hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🏙️</span>
                {currentRoute === 'metropolis' && (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-cyan-300 bg-cyan-950 border border-cyan-400 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> SELECTED
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white mb-1">
                PATH A: Neon Metropolis
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dense skyscrapers, high rooftop sky-ramps, and high-altitude neon aerial rings amidst an electric neon skyline.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-bold text-cyan-400">
              Skyline & Aerial Dash Focus
            </div>
          </div>

          {/* Path B */}
          <div
            onClick={() => onSelectRoute('forest')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
              currentRoute === 'forest'
                ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                : 'bg-black/50 border-slate-800 hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🌲</span>
                {currentRoute === 'forest' && (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-300 bg-emerald-950 border border-emerald-400 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> SELECTED
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white mb-1">
                PATH B: Canyon & Forest Track
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Twisting mountain gaps, low-altitude tree slaloms, and natural launch ramps under emerald twilight atmospheres.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-bold text-emerald-400">
              Low-Altitude Slalom & Agility Focus
            </div>
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={onProceed}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 text-black font-black text-base tracking-wider uppercase shadow-[0_0_25px_rgba(0,240,255,0.5)] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          ENGAGE SELECTED ROUTE <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
