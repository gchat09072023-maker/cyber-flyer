import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateLevelMeta } from '../levels';

import { WeatherState } from '../types';

interface PauseMenuProps {
  level: number;
  unlockedLevel: number;
  isMuted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onSelectLevel: (lvl: number) => void;
  onToggleMute: () => void;
  onTitleScreen: () => void;
  onOpenGarage?: () => void;
  weatherState?: WeatherState;
  onToggleWeather?: () => void;
  onOpenRadio?: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  level,
  unlockedLevel,
  isMuted,
  onResume,
  onRestart,
  onSelectLevel,
  onToggleMute,
  onTitleScreen,
  onOpenGarage,
  weatherState,
  onToggleWeather,
  onOpenRadio,
}) => {
  const meta = generateLevelMeta(level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#140b26] to-[#07040e] border border-cyan-500/60 rounded-3xl p-5 shadow-[0_0_35px_rgba(0,240,255,0.3)] flex flex-col items-center text-center">
        <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1">
          SYSTEM PAUSED
        </h2>
        <p className="text-xs text-cyan-300 mb-3">
          Level {level}: {meta.title}
        </p>

        {/* Level Navigation */}
        <div className="w-full bg-black/60 border border-slate-800 rounded-xl p-2.5 mb-3 flex items-center justify-between">
          <button
            onClick={() => onSelectLevel(Math.max(1, level - 1))}
            disabled={level <= 1}
            className="p-1 rounded bg-slate-900 text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
            aria-label="Previous Level"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-xs font-bold text-slate-200">
            Selected: <span className="text-cyan-400 font-black">Level {level}</span>
          </div>
          <button
            onClick={() => onSelectLevel(Math.min(unlockedLevel, level + 1))}
            disabled={level >= unlockedLevel}
            className="p-1 rounded bg-slate-900 text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
            aria-label="Next Level"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-2 mb-2">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black text-sm tracking-wider uppercase shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> RESUME FLIGHT
          </button>

          {onOpenRadio && (
            <button
              onClick={onOpenRadio}
              className="w-full py-2.5 rounded-xl bg-black/75 border border-fuchsia-500/70 text-fuchsia-300 font-bold text-xs hover:bg-fuchsia-950/40 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🎵</span> Cyber Radio & Lyria AI Music
            </button>
          )}

          {onToggleWeather && weatherState && (
            <button
              onClick={onToggleWeather}
              className="w-full py-2.5 rounded-xl bg-black/75 border border-cyan-500/70 text-cyan-300 font-bold text-xs hover:bg-cyan-950/40 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{weatherState.icon}</span> Weather: {weatherState.name} ({Math.round(weatherState.tractionMultiplier * 100)}% Traction)
            </button>
          )}

          {onOpenGarage && (
            <button
              onClick={onOpenGarage}
              className="w-full py-2.5 rounded-xl bg-black/75 border border-amber-400/70 text-amber-300 font-bold text-xs hover:bg-amber-950/40 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🚗</span> Enter Cyber Garage
            </button>
          )}

          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-800 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restart Current Level
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-800 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-400" /> Audio Muted (Tap to Unmute)
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Audio Active (Tap to Mute)
              </>
            )}
          </button>

          <button
            onClick={onTitleScreen}
            className="w-full py-2 rounded-xl bg-black/50 border border-slate-800 text-slate-400 font-semibold text-xs hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Return to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};
