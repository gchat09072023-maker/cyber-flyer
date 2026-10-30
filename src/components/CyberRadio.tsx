import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Music, Sparkles, Volume2, Loader2, Disc3 } from 'lucide-react';

interface CyberRadioProps {
  onClose: () => void;
}

interface RadioTrack {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  isAiGenerated?: boolean;
  audioUrl?: string;
}

const PRESET_TRACKS: RadioTrack[] = [
  { id: '1', title: 'Neon Highway Drift', genre: 'Darksynth / Outrun', bpm: 130 },
  { id: '2', title: 'Acid Rain Skyline', genre: 'Atmospheric Synthwave', bpm: 110 },
  { id: '3', title: 'Megacity Turbo Chase', genre: 'Cyberpunk Electro', bpm: 145 },
  { id: '4', title: 'Blade Runner Smog Drift', genre: 'Ambient Cyber-Chill', bpm: 95 },
];

export const CyberRadio: React.FC<CyberRadioProps> = ({ onClose }) => {
  const [currentTrack, setCurrentTrack] = useState<RadioTrack>(PRESET_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('Heavy cyberpunk bassline with rain synth arpeggios and high-octane electro drums');
  const [selectedGenre, setSelectedGenre] = useState<string>('Cyberpunk Synthwave');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthCtxRef = useRef<AudioContext | null>(null);
  const synthTimerRef = useRef<number | null>(null);

  // Procedural synth player for offline presets
  const stopProceduralSynth = () => {
    if (synthTimerRef.current) {
      clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  };

  const playProceduralSynth = (bpm: number) => {
    stopProceduralSynth();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!synthCtxRef.current) {
        synthCtxRef.current = new AudioCtx();
      }
      const ctx = synthCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const stepTimeMs = (60 / bpm / 2) * 1000;
      let step = 0;

      const scales = [110, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63];

      synthTimerRef.current = window.setInterval(() => {
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(step % 4 === 0 ? 1200 : 650, now);

        osc.type = step % 4 === 0 ? 'sawtooth' : 'triangle';
        const rootFreq = scales[step % scales.length];
        osc.frequency.setValueAtTime(rootFreq, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);

        step++;
      }, stepTimeMs);
    } catch {
      // AudioContext blocked
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      if (currentTrack.audioUrl && audioRef.current) {
        audioRef.current.pause();
      } else {
        stopProceduralSynth();
      }
      setIsPlaying(false);
    } else {
      if (currentTrack.audioUrl && audioRef.current) {
        audioRef.current.play().catch(() => {});
      } else {
        playProceduralSynth(currentTrack.bpm);
      }
      setIsPlaying(true);
    }
  };

  const handleSelectPreset = (t: RadioTrack) => {
    if (audioRef.current) audioRef.current.pause();
    stopProceduralSynth();
    setCurrentTrack(t);
    setIsPlaying(true);
    playProceduralSynth(t.bpm);
  };

  const handleGenerateLyriaTrack = async () => {
    setIsGenerating(true);
    setStatusMsg('Requesting AI soundtrack from Lyria model (lyria-3-clip-preview)...');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, genre: selectedGenre }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Lyria generation failed');
      }

      if (data.audioDataUrl) {
        stopProceduralSynth();
        const newTrack: RadioTrack = {
          id: 'lyria-' + Date.now(),
          title: data.title || prompt.slice(0, 30),
          genre: data.genre || selectedGenre,
          bpm: 128,
          isAiGenerated: true,
          audioUrl: data.audioDataUrl,
        };
        setCurrentTrack(newTrack);
        setIsPlaying(true);
        setStatusMsg('AI Soundtrack successfully generated and loaded!');

        if (audioRef.current) {
          audioRef.current.src = data.audioDataUrl;
          audioRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Generation failed. Using offline synthesizer.');
      setStatusMsg(null);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      stopProceduralSynth();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none animate-in fade-in duration-200">
      <audio ref={audioRef} loop />
      <div className="w-full max-w-lg bg-gradient-to-b from-[#180e2b] via-[#0d071b] to-[#06030c] border-2 border-fuchsia-500/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_55px_rgba(255,0,160,0.35)] flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-fuchsia-500/30 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-950/80 border border-fuchsia-400 flex items-center justify-center text-xl text-fuchsia-300 shadow-[0_0_12px_rgba(255,0,160,0.4)]">
              <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
                CYBER RADIO & LYRIA AI
              </h2>
              <p className="text-xs text-fuchsia-300 font-medium">
                Procedural synthesizer radio & Lyria music generator
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition active:scale-95 cursor-pointer"
            aria-label="Close Radio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently Playing Card */}
        <div className="p-4 rounded-2xl bg-black/60 border border-cyan-400/50 shadow-[0_0_20px_rgba(0,240,255,0.2)] mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayback}
              className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-400 to-fuchsia-500 text-black flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.5)] active:scale-95 transition cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white truncate max-w-[190px] sm:max-w-[240px]">
                  {currentTrack.title}
                </span>
                {currentTrack.isAiGenerated && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-fuchsia-500 text-black">
                    AI LYRIA
                  </span>
                )}
              </div>
              <div className="text-xs text-cyan-300 font-medium mt-0.5">
                {currentTrack.genre} · {currentTrack.bpm} BPM
              </div>
            </div>
          </div>

          {/* Equalizer Waveform animation */}
          <div className="flex items-end gap-1 h-7">
            {[40, 75, 55, 90, 60].map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-cyan-400 rounded-full transition-all duration-150"
                style={{
                  height: isPlaying ? `${Math.max(20, Math.sin((i + 1) * 2) * 50 + 50)}%` : '20%',
                }}
              />
            ))}
          </div>
        </div>

        {/* Preset Tracks List */}
        <div className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            STATION CHANNELS
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectPreset(t)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  currentTrack.id === t.id
                    ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold truncate">{t.title}</div>
                <div className="text-[10px] text-cyan-400 mt-0.5">{t.genre}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Lyria Music Generator Section */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#211138]/60 to-black/60 border border-fuchsia-500/50 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs font-black uppercase tracking-wider text-fuchsia-300">
              LYRIA AI MUSIC GENERATOR (lyria-3-clip-preview)
            </span>
          </div>

          <p className="text-[11px] text-slate-300 mb-3">
            Generate custom, original 30-second driving music tracks rendered directly by Google's Lyria audio intelligence.
          </p>

          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Soundtrack Prompt
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Neon rain synthwave driving soundtrack"
                className="w-full px-3 py-2 rounded-xl bg-black/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGenre('Cyberpunk Synthwave')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  selectedGenre === 'Cyberpunk Synthwave'
                    ? 'bg-fuchsia-950 border-fuchsia-400 text-fuchsia-300'
                    : 'bg-black/40 border-slate-800 text-slate-400'
                }`}
              >
                Synthwave
              </button>
              <button
                onClick={() => setSelectedGenre('Dark Electro Darksynth')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  selectedGenre === 'Dark Electro Darksynth'
                    ? 'bg-fuchsia-950 border-fuchsia-400 text-fuchsia-300'
                    : 'bg-black/40 border-slate-800 text-slate-400'
                }`}
              >
                Darksynth
              </button>
              <button
                onClick={() => setSelectedGenre('Ambient Neon Rain')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  selectedGenre === 'Ambient Neon Rain'
                    ? 'bg-fuchsia-950 border-fuchsia-400 text-fuchsia-300'
                    : 'bg-black/40 border-slate-800 text-slate-400'
                }`}
              >
                Ambient Rain
              </button>
            </div>

            <button
              onClick={handleGenerateLyriaTrack}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-500 text-black font-black text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(255,0,160,0.4)] hover:shadow-[0_0_25px_rgba(255,0,160,0.6)] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> GENERATING TRACK...
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" /> GENERATE 30S TRACK WITH LYRIA
                </>
              )}
            </button>

            {statusMsg && (
              <div className="text-[11px] text-cyan-300 bg-cyan-950/50 border border-cyan-500/40 rounded-lg p-2 text-center">
                {statusMsg}
              </div>
            )}

            {errorMsg && (
              <div className="text-[11px] text-red-300 bg-red-950/50 border border-red-500/40 rounded-lg p-2 text-center">
                {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Radio plays seamlessly while driving
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
