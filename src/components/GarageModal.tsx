import React from 'react';
import { X, Check, Lock, Zap, Wind, Gauge } from 'lucide-react';
import { VehicleId, VehicleSpec } from '../types';
import { VEHICLES } from '../vehicles';

interface GarageModalProps {
  unlockedLevel: number;
  currentVehicleId: VehicleId;
  onSelectVehicle: (id: VehicleId) => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  unlockedLevel,
  currentVehicleId,
  onSelectVehicle,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-gradient-to-b from-[#160c2b] via-[#0d071b] to-[#06030c] border-2 border-cyan-400/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.35)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(0,240,255,0.4)]">
              🚗
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
                CYBER GARAGE
              </h2>
              <p className="text-xs text-cyan-300 font-medium">
                Switch vehicles & check prototype flight capabilities
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
            aria-label="Close Garage"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vehicle Cards List */}
        <div className="flex flex-col gap-3.5 overflow-y-auto pr-1">
          {VEHICLES.map((v: VehicleSpec) => {
            const isUnlocked = unlockedLevel >= v.unlockLevel;
            const isEquipped = currentVehicleId === v.id;

            return (
              <div
                key={v.id}
                className={`relative rounded-2xl p-4 border-2 transition-all duration-200 ${
                  isEquipped
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                    : isUnlocked
                    ? 'bg-slate-950/70 border-slate-700 hover:border-slate-500'
                    : 'bg-black/50 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left info */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-black/60 border border-slate-700 flex items-center justify-center text-3xl shadow-inner shrink-0">
                      {v.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white tracking-wide">
                          {v.name}
                        </h3>
                        {isEquipped && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-400 text-black shadow-[0_0_8px_#00f0ff]">
                            EQUIPPED
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" /> Unlocks Lv {v.unlockLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-snug">
                        {v.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center">
                    {isUnlocked ? (
                      <button
                        onClick={() => onSelectVehicle(v.id)}
                        disabled={isEquipped}
                        className={`w-full sm:w-auto px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                          isEquipped
                            ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-400/50 cursor-default'
                            : 'bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_20px_rgba(0,240,255,0.6)]'
                        }`}
                      >
                        {isEquipped ? (
                          <>
                            <Check className="w-4 h-4" /> ACTIVE
                          </>
                        ) : (
                          'SELECT / EQUIP'
                        )}
                      </button>
                    ) : (
                      <div className="text-xs text-amber-400 font-bold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Reach Lv {v.unlockLevel}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stat meters */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Speed: {Math.round(v.speedMultiplier * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Nitro: {v.maxNitro}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-fuchsia-300">
                    <Wind className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                    <span>Flight: {Math.round(v.flightAgility * 100)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Vehicles save automatically to your profile</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold hover:bg-slate-800 active:scale-95 transition"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
