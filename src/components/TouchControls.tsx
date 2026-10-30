import React, { useRef, useState, useCallback, useEffect } from 'react';
import { InputState, FlightMode } from '../types';
import { Zap, ChevronUp, ChevronDown } from 'lucide-react';

interface TouchControlsProps {
  mode: FlightMode;
  onInputChange: (fn: (prev: InputState) => InputState) => void;
  onToggleFlight: () => void;
  nitroPercent: number;
  isNitroCooldown: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  mode,
  onInputChange,
  onToggleFlight,
  nitroPercent,
  isNitroCooldown,
}) => {
  const isFlight = mode === 'flight';

  // Virtual Joystick State
  const joystickZoneRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickCenter, setJoystickCenter] = useState({ x: 90, y: 110 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);

  // Joystick touch handlers
  const handleJoystickPointerDown = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = joystickZoneRef.current?.getBoundingClientRect();
    if (rect) {
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      setJoystickCenter({ x: startX, y: startY });
      setKnobOffset({ x: 0, y: 0 });
      setJoystickActive(true);
    }
  };

  const handleJoystickPointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerIdRef.current) return;
    const rect = joystickZoneRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    let dx = currentX - joystickCenter.x;
    let dy = currentY - joystickCenter.y;
    const maxRadius = 50;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setKnobOffset({ x: dx, y: dy });

    // Normalized steer values (-1 to 1)
    const normX = Math.abs(dx) < 6 ? 0 : dx / maxRadius;
    const normY = Math.abs(dy) < 6 ? 0 : -dy / maxRadius; // up is positive

    onInputChange((prev) => ({
      ...prev,
      steerX: normX,
      steerY: normY,
    }));
  };

  const handleJoystickPointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    setJoystickActive(false);
    setKnobOffset({ x: 0, y: 0 });

    onInputChange((prev) => ({
      ...prev,
      steerX: 0,
      steerY: 0,
    }));
  };

  // Helper for action buttons
  const bindButton = (key: keyof InputState, value: number | boolean) => {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
        onInputChange((prev) => ({ ...prev, [key]: value }));
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        onInputChange((prev) => ({ ...prev, [key]: typeof value === 'boolean' ? false : 0 }));
      },
      onPointerCancel: (e: React.PointerEvent) => {
        e.preventDefault();
        onInputChange((prev) => ({ ...prev, [key]: typeof value === 'boolean' ? false : 0 }));
      },
    };
  };

  return (
    <div className="fixed inset-x-0 bottom-0 pointer-events-none select-none z-10 p-3 sm:p-5 flex justify-between items-end">
      {/* LEFT: Virtual Floating Joystick Zone */}
      <div
        ref={joystickZoneRef}
        onPointerDown={handleJoystickPointerDown}
        onPointerMove={handleJoystickPointerMove}
        onPointerUp={handleJoystickPointerUp}
        onPointerCancel={handleJoystickPointerUp}
        className="relative w-48 h-48 sm:w-56 sm:h-56 pointer-events-auto touch-none"
      >
        {/* Joystick Base */}
        <div
          className={`absolute w-28 h-28 -ml-14 -mt-14 rounded-full border-2 transition-opacity duration-200 flex items-center justify-center ${
            joystickActive
              ? 'opacity-90 border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
              : 'opacity-40 border-cyan-400/50 bg-black/40'
          }`}
          style={{
            left: `${joystickCenter.x}px`,
            top: `${joystickCenter.y}px`,
          }}
        >
          {/* Subtle directional indicators */}
          <div className="absolute top-1 text-[10px] font-bold text-cyan-400/60">▲</div>
          <div className="absolute bottom-1 text-[10px] font-bold text-cyan-400/60">▼</div>
          <div className="absolute left-1 text-[10px] font-bold text-cyan-400/60">◀</div>
          <div className="absolute right-1 text-[10px] font-bold text-cyan-400/60">▶</div>

          {/* Dynamic Joystick Knob */}
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-300 shadow-[0_0_12px_#00f0ff] border border-white flex items-center justify-center"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              transition: joystickActive ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <div className="w-4 h-4 rounded-full bg-black/40" />
          </div>
        </div>

        {/* Instructional hint when inactive */}
        {!joystickActive && (
          <div className="absolute bottom-2 left-6 text-[11px] font-bold tracking-wider text-cyan-400/70 uppercase">
            Joystick Steering
          </div>
        )}
      </div>

      {/* RIGHT: Action Buttons Cluster */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 pointer-events-auto touch-none">
        {/* Pitch UP Button (Flight Only) */}
        {isFlight && (
          <button
            {...bindButton('pitchUp', true)}
            aria-label="Pitch Up"
            className="absolute right-1 top-2 w-14 h-14 rounded-2xl bg-amber-950/80 border-2 border-amber-400 text-amber-300 flex flex-col items-center justify-center font-black active:scale-95 active:bg-amber-500 active:text-black shadow-[0_0_15px_rgba(255,187,0,0.4)] transition"
          >
            <ChevronUp className="w-5 h-5 -mb-1" />
            <span className="text-[9px]">PITCH ▲</span>
          </button>
        )}

        {/* Pitch DOWN Button (Flight Only) */}
        {isFlight && (
          <button
            {...bindButton('pitchDown', true)}
            aria-label="Pitch Down"
            className="absolute right-18 top-2 w-14 h-14 rounded-2xl bg-amber-950/80 border-2 border-amber-400 text-amber-300 flex flex-col items-center justify-center font-black active:scale-95 active:bg-amber-500 active:text-black shadow-[0_0_15px_rgba(255,187,0,0.4)] transition"
          >
            <ChevronDown className="w-5 h-5 -mb-1" />
            <span className="text-[9px]">PITCH ▼</span>
          </button>
        )}

        {/* TRANSFORM / FLY Toggle Switch */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFlight();
          }}
          aria-label="Toggle Flying Mode"
          className={`absolute right-1 top-20 w-22 h-22 rounded-3xl border-2 flex flex-col items-center justify-center font-black transition-all active:scale-90 ${
            isFlight
              ? 'bg-fuchsia-950/90 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_24px_rgba(255,0,128,0.6)]'
              : 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_24px_rgba(0,240,255,0.5)]'
          }`}
        >
          <span className="text-3xl filter drop-shadow">
            {isFlight ? '🚗' : '✈️'}
          </span>
          <span className="text-[11px] tracking-wider mt-0.5">
            {isFlight ? 'LAND' : 'TRANSFORM'}
          </span>
        </button>

        {/* NITRO BOOST Button with Gauge */}
        <button
          {...bindButton('nitro', true)}
          aria-label="Nitro Boost"
          className={`absolute right-26 top-20 w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-black transition active:scale-95 overflow-hidden ${
            isNitroCooldown
              ? 'bg-red-950/80 border-red-500 text-red-300 opacity-70'
              : 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:bg-cyan-400 active:text-black'
          }`}
        >
          {/* Fill level overlay */}
          <div
            className="absolute inset-x-0 bottom-0 bg-cyan-500/25 pointer-events-none transition-all"
            style={{ height: `${nitroPercent}%` }}
          />
          <Zap className="w-5 h-5 relative z-10" />
          <span className="text-[9px] relative z-10 font-black">NITRO</span>
        </button>

        {/* BRAKE / REVERSE Pedal */}
        <button
          {...bindButton('brake', 1)}
          aria-label="Brake or Reverse"
          className="absolute right-24 bottom-1 w-16 h-16 rounded-2xl bg-red-950/90 border-2 border-red-500 text-red-300 flex flex-col items-center justify-center font-black active:scale-95 active:bg-red-500 active:text-black shadow-[0_0_16px_rgba(239,68,68,0.4)] transition"
        >
          <span className="text-sm font-extrabold">■</span>
          <span className="text-[10px] font-black tracking-wider">BRAKE</span>
        </button>

        {/* GAS / ACCELERATE Pedal */}
        <button
          {...bindButton('gas', 1)}
          aria-label="Accelerate Gas"
          className="absolute right-1 bottom-1 w-20 h-20 rounded-2xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 flex flex-col items-center justify-center font-black active:scale-95 active:bg-emerald-400 active:text-black shadow-[0_0_20px_rgba(16,185,129,0.5)] transition"
        >
          <span className="text-base font-extrabold">▲</span>
          <span className="text-[11px] font-black tracking-wider">GAS</span>
        </button>
      </div>
    </div>
  );
};
