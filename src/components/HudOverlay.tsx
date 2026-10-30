import React from 'react';
import { Volume2, VolumeX, Pause, Zap, Heart, Disc3 } from 'lucide-react';
import { GeneratedLevel, WeatherState } from '../types';

interface HudOverlayProps {
  levelMeta: GeneratedLevel;
  progress: number;
  totalProgress: number;
  speedKmh: number;
  altitudeM: number;
  coins: number;
  lives: number;
  maxLives: number;
  targetDistance: number;
  targetAngleRel: number;
  isFlight: boolean;
  isNitro: boolean;
  nitroPercent: number;
  isNitroCooldown: boolean;
  isMuted: boolean;
  isDamageFlash: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenGarage?: () => void;
  weatherState?: WeatherState;
  onToggleWeather?: () => void;
  onOpenRadio?: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  levelMeta,
  progress,
  totalProgress,
  speedKmh,
  altitudeM,
  coins,
  lives,
  maxLives,
  targetDistance,
  targetAngleRel,
  isFlight,
  isNitro,
  nitroPercent,
  isNitroCooldown,
  isMuted,
  isDamageFlash,
  onToggleMute,
  onPause,
  onOpenGarage,
  weatherState,
  onToggleWeather,
  onOpenRadio,
}) => {
  const roundedSpeed = Math.max(0, Math.round(speedKmh));
  const isBlastRisk = roundedSpeed >= 80;
  const roundedAlt = Math.max(0, Math.round(altitudeM));
  const roundedDist = Math.round(targetDistance);
  const needleDeg = (targetAngleRel * 180) / Math.PI;

  return (
    <>
      {/* Red Screen Damage Flash Vignette */}
      {isDamageFlash && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-red-600/40 animate-pulse border-8 border-red-500 shadow-[inset_0_0_80px_rgba(255,0,0,0.8)]" />
      )}

      <div className="fixed inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-3 sm:p-5">
        {/* Top telemetry bar */}
        <div className="flex items-start justify-between gap-2 max-w-full">
          {/* Left Status Cluster */}
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-2">
              {/* 3-Heart Chassis Health UI */}
              <div className="flex items-center gap-1.5 bg-black/85 border border-red-500/60 rounded-lg px-2.5 py-1 shadow-[0_0_12px_rgba(239,68,68,0.35)] w-fit">
                <span className="text-[10px] font-black uppercase text-red-400 mr-1 tracking-wider">
                  CHASSIS
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: maxLives }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-4 h-4 transition-all duration-300 ${
                        i < lives
                          ? 'fill-red-500 text-red-400 drop-shadow-[0_0_6px_#ef4444]'
                          : 'text-slate-700 fill-slate-900/60 opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Procedural Weather Condition Pill */}
              {weatherState && (
                <button
                  onClick={onToggleWeather}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold tracking-wider transition-all duration-300 pointer-events-auto cursor-pointer shadow-sm ${
                    weatherState.type === 'rain'
                      ? 'bg-blue-950/85 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                      : weatherState.type === 'fog'
                      ? 'bg-amber-950/85 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(255,187,0,0.4)]'
                      : 'bg-black/85 border-slate-700 text-slate-200'
                  }`}
                  title="Click to toggle weather conditions (Clear / Rain / Fog)"
                >
                  <span className="text-xs">{weatherState.icon}</span>
                  <span className="uppercase">{weatherState.type}</span>
                  <span className="text-slate-500 font-normal">|</span>
                  <span className="text-white font-black">
                    {Math.round(weatherState.tractionMultiplier * 100)}% Grip
                  </span>
                  <span className="text-[8px] bg-black/60 px-1 py-0.5 rounded text-cyan-300 border border-slate-700 hidden sm:inline">
                    {weatherState.visibilityRating} Vis
                  </span>
                </button>
              )}
            </div>

            {/* Level & Objective Badge */}
            <div className="flex items-center gap-2 bg-black/80 border border-cyan-500/50 rounded-lg px-2.5 py-1.5 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
              <span className="text-[10px] font-black tracking-wider text-cyan-400 uppercase bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-400/40">
                LVL {levelMeta.level}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-wide truncate max-w-[130px] sm:max-w-[220px]">
                  {levelMeta.title}
                </span>
                <span className="text-[10px] text-cyan-300 font-medium">
                  Goal: {progress} / {totalProgress}
                </span>
              </div>
            </div>

            {/* Speed & Altitude Readouts */}
            <div className="flex items-center gap-2">
              <div
                className={`rounded-lg px-2.5 py-1 min-w-[90px] transition-colors duration-200 border ${
                  isBlastRisk
                    ? 'bg-red-950/85 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.6)] animate-pulse'
                    : 'bg-black/75 border-cyan-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] uppercase tracking-wider block font-bold ${
                      isBlastRisk ? 'text-red-400' : 'text-cyan-400'
                    }`}
                  >
                    Speed
                  </span>
                  {isBlastRisk && (
                    <span className="text-[7.5px] font-black uppercase text-red-200 bg-red-800/80 px-1 py-0.2 rounded border border-red-400/50">
                      ⚡ BLAST
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-black tabular-nums tracking-tight ${
                      isBlastRisk ? 'text-red-100' : 'text-white'
                    }`}
                  >
                    {roundedSpeed}
                  </span>
                  <span className={`text-[10px] font-bold ${isBlastRisk ? 'text-red-400' : 'text-cyan-400'}`}>
                    km/h
                  </span>
                </div>
              </div>

              <div className="bg-black/75 border border-pink-500/40 rounded-lg px-2.5 py-1 min-w-[75px]">
                <span className="text-[9px] uppercase tracking-wider text-pink-400 block font-semibold">Altitude</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-white tabular-nums tracking-tight">
                    {roundedAlt}
                  </span>
                  <span className="text-[10px] font-bold text-pink-400">m</span>
                </div>
              </div>

              {/* Flight indicator pill */}
              <div
                className={`px-2 py-1 rounded-lg border text-[11px] font-extrabold tracking-wider transition-all duration-300 ${
                  isFlight
                    ? 'bg-fuchsia-950/80 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_10px_rgba(255,0,128,0.4)]'
                    : 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isFlight ? '✈ FLIGHT' : '🚗 GROUND'}
              </div>
            </div>

            {/* Nitro gauge line */}
            <div className="w-[170px] bg-black/80 rounded-full border border-cyan-500/40 p-0.5 mt-0.5">
              <div className="flex items-center justify-between text-[9px] text-cyan-300 px-1 mb-0.5 font-bold">
                <span className="flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-cyan-400" /> NITRO
                </span>
                <span>{Math.round(nitroPercent)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    isNitroCooldown
                      ? 'bg-red-500'
                      : isNitro
                      ? 'bg-gradient-to-r from-cyan-400 to-white shadow-[0_0_8px_#00f0ff]'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                  style={{ width: `${nitroPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Center Target Compass & Radar */}
          <div className="flex flex-col items-center">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/80 border-2 border-cyan-400/70 shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center">
              <div className="absolute inset-x-2 top-1/2 h-[1px] bg-cyan-500/30" />
              <div className="absolute inset-y-2 left-1/2 w-[1px] bg-cyan-500/30" />

              <div
                className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${needleDeg}deg)` }}
              >
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[18px] border-b-amber-400 filter drop-shadow-[0_0_6px_#ffbb00] -translate-y-3" />
              </div>

              <div className="w-2 h-2 rounded-full bg-cyan-300 ring-2 ring-cyan-500" />
            </div>

            <div className="mt-1 bg-black/80 border border-amber-400/50 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-amber-300 tabular-nums">
              {roundedDist} m
            </div>
          </div>

          {/* Right Status Cluster: Coins, Garage, Audio & Pause */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-black/75 border border-amber-400/60 rounded-lg px-2.5 py-1.5 shadow-[0_0_12px_rgba(255,187,0,0.3)]">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 shadow-[0_0_8px_#ffbb00] flex items-center justify-center font-black text-[11px] text-amber-950">
                ¢
              </div>
              <span className="text-base font-black text-yellow-300 tabular-nums">
                {coins}
              </span>
            </div>

            {onOpenRadio && (
              <button
                onClick={onOpenRadio}
                aria-label="Open Cyber Radio & Lyria AI Music"
                className="h-9 px-2.5 rounded-lg bg-black/75 border border-fuchsia-500/70 flex items-center gap-1.5 text-fuchsia-300 hover:bg-fuchsia-950/60 transition active:scale-95 text-xs font-black tracking-wider uppercase cursor-pointer"
              >
                <Disc3 className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="hidden sm:inline">RADIO</span>
              </button>
            )}

            {onOpenGarage && (
              <button
                onClick={onOpenGarage}
                aria-label="Open Garage"
                className="h-9 px-2.5 rounded-lg bg-black/75 border border-amber-400/60 flex items-center gap-1.5 text-amber-300 hover:bg-amber-950/60 transition active:scale-95 text-xs font-black tracking-wider uppercase cursor-pointer"
              >
                <span>🚗</span>
                <span className="hidden sm:inline">GARAGE</span>
              </button>
            )}

            <button
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="w-9 h-9 rounded-lg bg-black/75 border border-cyan-500/50 flex items-center justify-center text-cyan-300 hover:bg-cyan-950/60 transition active:scale-95"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={onPause}
              aria-label="Pause Game"
              className="w-9 h-9 rounded-lg bg-black/75 border border-cyan-500/50 flex items-center justify-center text-cyan-300 hover:bg-cyan-950/60 transition active:scale-95"
            >
              <Pause className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
