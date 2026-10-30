import React from 'react';
import { Award, ArrowRight, RotateCcw, AlertOctagon, Film } from 'lucide-react';
import { GeneratedLevel } from '../types';

interface MissionModalProps {
  isVictory: boolean;
  levelMeta: GeneratedLevel;
  coins: number;
  onNextLevel: () => void;
  onRetry: () => void;
  onCinematicReplay?: () => void;
}

export const MissionModal: React.FC<MissionModalProps> = ({
  isVictory,
  levelMeta,
  coins,
  onNextLevel,
  onRetry,
  onCinematicReplay,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md bg-gradient-to-b from-[#180d2e] to-[#080410] border-2 rounded-3xl p-6 text-center flex flex-col items-center ${
          isVictory
            ? 'border-cyan-400 shadow-[0_0_50px_rgba(0,240,255,0.4)]'
            : 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.45)]'
        }`}
      >
        {/* Glowing Badge */}
        <div
          className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center mb-3 ${
            isVictory
              ? 'bg-cyan-950 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.5)] text-cyan-300'
              : 'bg-red-950 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)] text-red-400'
          }`}
        >
          {isVictory ? <Award className="w-9 h-9" /> : <AlertOctagon className="w-9 h-9" />}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase mb-1">
          {isVictory ? 'MISSION PASSED!' : 'CAR DESTROYED / MISSION FAILED'}
        </h2>
        <p
          className={`text-sm font-semibold mb-4 ${
            isVictory ? 'text-cyan-300' : 'text-red-400'
          }`}
        >
          {isVictory
            ? `Level ${levelMeta.level}: ${levelMeta.title} Cleared!`
            : 'Car Wrecked · 3 Chassis Lives Depleted in High-Speed Collision'}
        </p>

        {/* Stats card */}
        <div className="w-full bg-black/60 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col gap-2">
          {isVictory ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Mission Reward:</span>
              <span className="font-extrabold text-amber-400">
                +{levelMeta.rewardCoins} Gold Coins
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-left">
              Chassis sustained catastrophic structural damage. You must successfully clear this level before unlocking the next zone.
            </div>
          )}
          <div className="h-[1px] bg-slate-800" />
          <div className="flex items-center justify-between text-base">
            <span className="text-slate-200 font-bold">Total Balance:</span>
            <span className="font-black text-amber-300 text-lg tabular-nums">
              {coins} ¢
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {isVictory ? (
            <>
              <button
                onClick={onNextLevel}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black text-base tracking-wider uppercase shadow-[0_0_20px_rgba(0,240,255,0.5)] active:scale-95 transition flex items-center justify-center gap-2"
              >
                PROCEED TO LEVEL {levelMeta.level + 1} <ArrowRight className="w-5 h-5" />
              </button>
              {onCinematicReplay && (
                <button
                  onClick={onCinematicReplay}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Film className="w-4 h-4" /> Cinematic Replay 🎥
                </button>
              )}
              <button
                onClick={onRetry}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Replay Current Level
              </button>
            </>
          ) : (
            <button
              onClick={onRetry}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-black font-black text-base tracking-wider uppercase shadow-[0_0_25px_rgba(239,68,68,0.6)] active:scale-95 transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> TRY AGAIN (LEVEL {levelMeta.level})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
