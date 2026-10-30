import React from 'react';
import { Play, ChevronLeft, ChevronRight, Shield, Zap, Gift, Trophy } from 'lucide-react';
import { generateLevelMeta } from '../levels';
import { DailyMission, LeaderboardEntry } from '../types';

interface TitleScreenProps {
  unlockedLevel: number;
  selectedLevel: number;
  coins: number;
  dailyMissions?: DailyMission[];
  onClaimMission?: (id: string) => void;
  getLevelLeaderboard?: (level: number) => LeaderboardEntry[];
  onSelectLevel: (lvl: number) => void;
  onStart: () => void;
  onOpenGarage?: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  unlockedLevel,
  selectedLevel,
  coins,
  dailyMissions,
  onClaimMission,
  getLevelLeaderboard,
  onSelectLevel,
  onStart,
  onOpenGarage,
}) => {
  const [activeTab, setActiveTab] = React.useState<'levels' | 'leaderboard'>('levels');
  const currentMeta = generateLevelMeta(selectedLevel);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-gradient-to-b from-[#0e071cd9] via-[#090412e6] to-[#04010ae8] backdrop-blur-xs select-none">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        {/* Bespoke Cyberpunk SVG Title Lockup */}
        <div className="relative mb-2">
          <svg className="w-64 h-16 sm:w-80 sm:h-20" viewBox="0 0 400 90">
            <defs>
              <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="50%" stopColor="#ff00a0" />
                <stop offset="100%" stopColor="#ffea00" />
              </linearGradient>
              <filter id="neonGlow">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <text
              x="50%"
              y="60"
              textAnchor="middle"
              fill="url(#cyberGrad)"
              filter="url(#neonGlow)"
              fontSize="48"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              letterSpacing="6"
            >
              CYBER FLYER
            </text>
          </svg>
          <div className="text-[11px] font-extrabold tracking-[0.3em] uppercase text-cyan-300 -mt-2">
            100+ Endless Level Progression
          </div>
        </div>

        {/* Currency & highest unlocked status */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-black/80 border border-amber-400/50 rounded-full px-3.5 py-1 shadow-[0_0_12px_rgba(255,187,0,0.25)]">
            <div className="w-4 h-4 rounded-full bg-yellow-400 text-black font-black text-xs flex items-center justify-center">
              ¢
            </div>
            <span className="text-xs font-black text-yellow-300 tabular-nums">
              {coins} Coins
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/80 border border-cyan-400/50 rounded-full px-3.5 py-1 text-xs font-bold text-cyan-300">
            <span>Unlocked:</span>
            <span className="text-white font-black">Level {unlockedLevel}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="w-full flex items-center justify-center gap-2 mb-3">
          <button
            onClick={() => setActiveTab('levels')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase transition tracking-wider flex items-center justify-center gap-1.5 ${
              activeTab === 'levels'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'bg-black/60 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            🎮 LEVEL SELECT
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase transition tracking-wider flex items-center justify-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                : 'bg-black/60 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            🏆 LEADERBOARDS
          </button>
        </div>

        {activeTab === 'leaderboard' ? (
          <div className="w-full bg-black/75 border border-amber-500/40 rounded-2xl p-4 mb-5 text-left relative overflow-hidden shadow-[0_0_25px_rgba(255,215,0,0.2)]">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => onSelectLevel(Math.max(1, selectedLevel - 1))}
                disabled={selectedLevel <= 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                aria-label="Previous Level"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> LEVEL {selectedLevel} LEADERBOARD
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {currentMeta.title}
                </span>
              </div>

              <button
                onClick={() => onSelectLevel(Math.min(unlockedLevel, selectedLevel + 1))}
                disabled={selectedLevel >= unlockedLevel}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                aria-label="Next Level"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Leaderboard Table */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800 pb-1 px-2">
                <span className="col-span-2">Rank</span>
                <span className="col-span-5">Pilot</span>
                <span className="col-span-3 text-right">Best Time</span>
                <span className="col-span-2 text-right">Score</span>
              </div>
              {getLevelLeaderboard ? (
                getLevelLeaderboard(selectedLevel).map((entry) => (
                  <div
                    key={entry.name}
                    className={`grid grid-cols-12 items-center text-xs py-2 px-2 rounded-xl border ${
                      entry.isPlayer
                        ? 'bg-amber-950/40 border-amber-400/60 text-amber-300 font-bold shadow-[0_0_10px_rgba(255,215,0,0.2)]'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-200'
                    }`}
                  >
                    <span className="col-span-2 font-black">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </span>
                    <span className="col-span-5 truncate">{entry.name}</span>
                    <span className="col-span-3 text-right tabular-nums font-mono">{entry.timeSec.toFixed(1)}s</span>
                    <span className="col-span-2 text-right tabular-nums text-amber-400">{entry.score}¢</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-4">No records found.</div>
              )}
            </div>
            <div className="text-[10px] text-slate-400 text-center mt-3">
              Complete this level in gameplay to register your fastest completion time!
            </div>
          </div>
        ) : (
          <div className="w-full bg-black/75 border border-cyan-500/40 rounded-2xl p-4 mb-5 text-left relative overflow-hidden shadow-[0_0_25px_rgba(0,240,255,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => onSelectLevel(Math.max(1, selectedLevel - 1))}
                disabled={selectedLevel <= 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                aria-label="Previous Level"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
                  OPERATION LEVEL
                </span>
                <span className="text-2xl font-black text-white tabular-nums tracking-wide">
                  {selectedLevel} / 100+
                </span>
              </div>

              <button
                onClick={() => onSelectLevel(Math.min(unlockedLevel, selectedLevel + 1))}
                disabled={selectedLevel >= unlockedLevel}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                aria-label="Next Level"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-bold text-cyan-200">{currentMeta.title}</h2>
                <span className="text-[10px] uppercase font-bold text-amber-400">
                  +{currentMeta.rewardCoins} ¢
                </span>
              </div>
              <div className="text-[11px] text-fuchsia-300 font-semibold mb-1">
                {currentMeta.subtitle}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {currentMeta.description}
              </p>
            </div>

            {/* Biome Category Guide */}
            <div className="grid grid-cols-4 gap-1.5 mt-3 text-center text-[9px] font-bold">
              <div
                className={`py-1 rounded border ${
                  selectedLevel <= 10
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                    : 'border-slate-800 bg-black/40 text-slate-500'
                }`}
              >
                Lv 1-10<br />City Rings
              </div>
              <div
                className={`py-1 rounded border ${
                  selectedLevel >= 11 && selectedLevel <= 25
                    ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300'
                    : 'border-slate-800 bg-black/40 text-slate-500'
                }`}
              >
                Lv 11-25<br />Forest Slalom
              </div>
              <div
                className={`py-1 rounded border ${
                  selectedLevel >= 26 && selectedLevel <= 50
                    ? 'border-fuchsia-400 bg-fuchsia-950/60 text-fuchsia-300'
                    : 'border-slate-800 bg-black/40 text-slate-500'
                }`}
              >
                Lv 26-50<br />Rooftop Pad
              </div>
              <div
                className={`py-1 rounded border ${
                  selectedLevel >= 51
                    ? 'border-amber-400 bg-amber-950/60 text-amber-300'
                    : 'border-slate-800 bg-black/40 text-slate-500'
                }`}
              >
                Lv 51-100+<br />Mega City
              </div>
            </div>
          </div>
        )}

        {/* Daily Missions Card */}
        {dailyMissions && dailyMissions.length > 0 && (
          <div className="w-full bg-black/75 border border-purple-500/40 rounded-2xl p-3 mb-4 text-left shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-purple-300 tracking-wider uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> DAILY MISSIONS
              </span>
              <span className="text-[10px] text-slate-400">Resets Daily</span>
            </div>
            <div className="flex flex-col gap-2">
              {dailyMissions.map((m) => {
                const pct = Math.min(100, Math.round((m.current / m.target) * 100));
                return (
                  <div key={m.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-bold text-white mb-0.5">
                        <span className="truncate">{m.title}</span>
                        <span className="text-amber-400 font-extrabold text-[11px] shrink-0">+{m.rewardCoins} ¢</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mb-1.5">{m.description} ({Math.round(m.current)} / {m.target})</div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${m.completed ? 'bg-emerald-400' : 'bg-purple-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {onClaimMission && (
                      <div className="shrink-0">
                        {m.claimed ? (
                          <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 bg-slate-900 rounded-lg">Claimed</span>
                        ) : m.completed ? (
                          <button
                            onClick={() => onClaimMission(m.id)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-emerald-400 text-black font-black text-[11px] uppercase shadow-[0_0_12px_rgba(255,215,0,0.4)] active:scale-95 transition flex items-center gap-1"
                          >
                            <Gift className="w-3 h-3" /> Claim
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 bg-slate-900 rounded-lg">{pct}%</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Start Game & Garage CTA row */}
        <div className="w-full flex items-center gap-2 mb-3">
          {onOpenGarage && (
            <button
              onClick={onOpenGarage}
              className="py-4 px-5 rounded-2xl bg-black/80 border-2 border-amber-400/80 text-amber-300 font-black text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(255,187,0,0.3)] hover:bg-amber-950/40 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              aria-label="Open Garage"
            >
              <span className="text-xl">🚗</span>
              <span>GARAGE</span>
            </button>
          )}

          <button
            onClick={onStart}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-500 text-black font-black text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:shadow-[0_0_40px_rgba(255,0,128,0.8)] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            START LEVEL {selectedLevel}
          </button>
        </div>

        {/* Flat control hints */}
        <div className="text-[11px] text-slate-400 max-w-sm tracking-wide leading-relaxed">
          <span className="text-cyan-400 font-semibold">Touch:</span> Virtual Joystick + Transform / Gas / Nitro buttons
          <br />
          <span className="text-fuchsia-400 font-semibold">Keyboard:</span> WASD to Drive · F/T to Fly · Space for Nitro · Q/E to Pitch
        </div>
      </div>
    </div>
  );
};
