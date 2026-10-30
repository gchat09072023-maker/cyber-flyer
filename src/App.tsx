import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine';
import { GameMode, InputState, FlightMode, PopNotification, GeneratedLevel, VehicleId, RouteId, WeatherState, DailyMission } from './types';
import { generateLevelMeta } from './levels';
import { HudOverlay } from './components/HudOverlay';
import { TouchControls } from './components/TouchControls';
import { TitleScreen } from './components/TitleScreen';
import { MissionModal } from './components/MissionModal';
import { PauseMenu } from './components/PauseMenu';
import { GarageModal } from './components/GarageModal';
import { RouteModal } from './components/RouteModal';
import { CyberRadio } from './components/CyberRadio';
import { sound } from './audio';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const inputRef = useRef<InputState>({
    steerX: 0,
    steerY: 0,
    gas: 0,
    brake: 0,
    nitro: false,
    pitchUp: false,
    pitchDown: false,
  });

  const [gameMode, setGameMode] = useState<GameMode>('title');
  const [level, setLevel] = useState<number>(1);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);
  const [levelMeta, setLevelMeta] = useState<GeneratedLevel>(() => generateLevelMeta(1));
  const [progress, setProgress] = useState<number>(0);
  const [totalProgress, setTotalProgress] = useState<number>(5);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [altitudeM, setAltitudeM] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [targetDistance, setTargetDistance] = useState<number>(0);
  const [targetAngleRel, setTargetAngleRel] = useState<number>(0);
  const [flightMode, setFlightMode] = useState<FlightMode>('ground');
  const [isNitro, setIsNitro] = useState<boolean>(false);
  const [nitroPercent, setNitroPercent] = useState<number>(100);
  const [isNitroCooldown, setIsNitroCooldown] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDamageFlash, setIsDamageFlash] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<PopNotification[]>([]);
  const [currentVehicleId, setCurrentVehicleId] = useState<VehicleId>('coupe');
  const [currentRoute, setCurrentRoute] = useState<RouteId>('metropolis');
  const [isGarageOpen, setIsGarageOpen] = useState<boolean>(false);
  const [isRouteSelectOpen, setIsRouteSelectOpen] = useState<boolean>(false);
  const [weatherState, setWeatherState] = useState<WeatherState | undefined>(undefined);
  const [isRadioOpen, setIsRadioOpen] = useState<boolean>(false);
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    let syncTick = 0;
    const engine = new GameEngine(canvasRef.current, () => {
      engine.step(0.016, inputRef.current);

      syncTick++;
      if (syncTick % 4 === 0) {
        setSpeedKmh(engine.car.speedKmh);
        setAltitudeM(engine.car.position.y);
        setCoins(engine.coins);
        setLives(engine.lives);
        setProgress(engine.currentProgress);
        setTotalProgress(engine.totalProgress);
        setFlightMode(engine.car.mode);
        setIsNitro(engine.car.isNitroActive);
        setNitroPercent(engine.car.nitroAmount);
        setIsNitroCooldown(engine.car.nitroCooldown);
        setTargetDistance(engine.targetDistance);
        setTargetAngleRel(engine.targetAngleRel);
        setIsDamageFlash(engine.isDamageFlash);
        setGameMode(engine.mode);
        setLevel(engine.currentLevel);
        setUnlockedLevel(engine.unlockedLevel);
        setLevelMeta(engine.currentLevelMeta);
        setCurrentVehicleId(engine.currentVehicleId);
        setCurrentRoute(engine.currentRoute);
        setWeatherState(engine.getWeatherState());
        setDailyMissions([...engine.dailyMissions]);
        setNotifications([...engine.notifications]);
      }
    });

    engineRef.current = engine;
    setCoins(engine.coins);
    setUnlockedLevel(engine.unlockedLevel);
    setLevel(engine.unlockedLevel);
    setLevelMeta(generateLevelMeta(engine.unlockedLevel));
    setCurrentVehicleId(engine.currentVehicleId);
    setCurrentRoute(engine.currentRoute);
    setWeatherState(engine.getWeatherState());
    setDailyMissions([...engine.dailyMissions]);

    const handleResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const keysDown = new Set<string>();

    const updateKeyboardInputs = () => {
      const steerLeft = keysDown.has('KeyA') || keysDown.has('ArrowLeft');
      const steerRight = keysDown.has('KeyD') || keysDown.has('ArrowRight');
      const gas = keysDown.has('KeyW') || keysDown.has('ArrowUp');
      const brake = keysDown.has('KeyS') || keysDown.has('ArrowDown');
      const nitro = keysDown.has('Space') || keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');
      const pitchUp = keysDown.has('KeyE');
      const pitchDown = keysDown.has('KeyQ');

      inputRef.current.steerX = steerRight ? 1 : steerLeft ? -1 : 0;
      inputRef.current.gas = gas ? 1 : 0;
      inputRef.current.brake = brake ? 1 : 0;
      inputRef.current.nitro = nitro;
      inputRef.current.pitchUp = pitchUp;
      inputRef.current.pitchDown = pitchDown;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyF' || e.code === 'KeyT') {
        if (engine.mode === 'playing') {
          engine.car.setMode(engine.car.mode === 'flight' ? 'ground' : 'flight');
          setFlightMode(engine.car.mode);
        }
        return;
      }

      if (e.code === 'Escape') {
        if (engine.mode === 'playing') {
          engine.mode = 'paused';
          setGameMode('paused');
          sound.stopEngine();
        } else if (engine.mode === 'paused') {
          engine.mode = 'playing';
          setGameMode('playing');
        }
        return;
      }

      keysDown.add(e.code);
      updateKeyboardInputs();
      sound.init();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      updateKeyboardInputs();
    };

    const handleBlur = () => {
      keysDown.clear();
      inputRef.current = {
        steerX: 0,
        steerY: 0,
        gas: 0,
        brake: 0,
        nitro: false,
        pitchUp: false,
        pitchDown: false,
      };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      engine.destroy();
    };
  }, []);

  const handleStartGame = () => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.mode = 'playing';
      engineRef.current.startLevel(level);
      setGameMode('playing');
    }
  };

  const handleToggleFlight = () => {
    sound.init();
    if (engineRef.current && engineRef.current.mode === 'playing') {
      const nextMode = engineRef.current.car.mode === 'flight' ? 'ground' : 'flight';
      engineRef.current.car.setMode(nextMode);
      setFlightMode(nextMode);
    }
  };

  const handleToggleMute = () => {
    sound.init();
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.setMute(nextMute);
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.mode = 'paused';
      setGameMode('paused');
      sound.stopEngine();
    }
  };

  const handleResume = () => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.mode = 'playing';
      setGameMode('playing');
    }
  };

  const handleRestartLevel = () => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.startLevel(level);
      engineRef.current.mode = 'playing';
      setGameMode('playing');
    }
  };

  const handleSelectLevel = (lvl: number) => {
    sound.init();
    setLevel(lvl);
    setLevelMeta(generateLevelMeta(lvl));
    if (engineRef.current) {
      engineRef.current.startLevel(lvl);
      if (engineRef.current.mode === 'paused') {
        engineRef.current.mode = 'playing';
        setGameMode('playing');
      }
    }
  };

  const handleOpenGarage = () => {
    setIsGarageOpen(true);
  };

  const handleCloseGarage = () => {
    setIsGarageOpen(false);
  };

  const handleSelectVehicle = (id: VehicleId) => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.setVehicle(id);
      setCurrentVehicleId(id);
    }
  };

  const handleSelectRoute = (route: RouteId) => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.setRoute(route);
      setCurrentRoute(route);
    }
  };

  const proceedToLevel = (targetLvl: number) => {
    setLevel(targetLvl);
    setLevelMeta(generateLevelMeta(targetLvl));
    if (engineRef.current) {
      engineRef.current.startLevel(targetLvl);
      engineRef.current.mode = 'playing';
      setGameMode('playing');
    }
  };

  const handleNextLevel = () => {
    sound.init();
    const nextLvl = level + 1;
    if (level === 10) {
      // Branching route selection after clearing Level 10
      setIsRouteSelectOpen(true);
      return;
    }
    proceedToLevel(nextLvl);
  };

  const handleProceedFromRouteSelect = () => {
    setIsRouteSelectOpen(false);
    proceedToLevel(11);
  };

  const handleToggleWeather = () => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.toggleWeather();
      setWeatherState(engineRef.current.getWeatherState());
    }
  };

  const handleOpenRadio = () => {
    sound.init();
    setIsRadioOpen(true);
  };

  const handleCloseRadio = () => {
    setIsRadioOpen(false);
  };

  const handleCinematicReplay = () => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.startCinematicReplay();
      setGameMode('replay');
    }
  };

  const handleExitReplay = () => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.exitCinematicReplay();
      setGameMode('victory');
    }
  };

  const handleClaimMission = (id: string) => {
    sound.init();
    if (engineRef.current) {
      engineRef.current.claimDailyMission(id);
      setCoins(engineRef.current.coins);
      setDailyMissions([...engineRef.current.dailyMissions]);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0612] font-sans select-none touch-none">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Cinematic Replay Banner / Overlay */}
      {gameMode === 'replay' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-purple-950/90 border-2 border-purple-500 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-[0_0_30px_rgba(168,85,247,0.5)]">
          <div className="flex items-center gap-2 text-purple-300 font-black tracking-widest uppercase text-sm animate-pulse">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" /> CINEMATIC REPLAY MODE 🎥
          </div>
          <button
            onClick={handleExitReplay}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs tracking-wider uppercase shadow transition active:scale-95"
          >
            Exit Replay
          </button>
        </div>
      )}

      {/* 2D In-Game Pop-up Notifications */}
      {notifications.map((n) => (
        <div
          key={n.id}
          className="fixed pointer-events-none font-black text-lg sm:text-xl tracking-wider animate-bounce drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] z-30"
          style={{
            left: `${n.x}px`,
            top: `${n.y}px`,
            transform: 'translate(-50%, -50%)',
            color: n.color || '#ffbb00',
          }}
        >
          {n.text}
        </div>
      ))}

      {/* In-Game Heads Up Display */}
      {gameMode === 'playing' && (
        <>
          <HudOverlay
            levelMeta={levelMeta}
            progress={progress}
            totalProgress={totalProgress}
            speedKmh={speedKmh}
            altitudeM={altitudeM}
            coins={coins}
            lives={lives}
            maxLives={3}
            targetDistance={targetDistance}
            targetAngleRel={targetAngleRel}
            isFlight={flightMode === 'flight'}
            isNitro={isNitro}
            nitroPercent={nitroPercent}
            isNitroCooldown={isNitroCooldown}
            isMuted={isMuted}
            isDamageFlash={isDamageFlash}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
            onOpenGarage={handleOpenGarage}
            weatherState={weatherState}
            onToggleWeather={handleToggleWeather}
            onOpenRadio={handleOpenRadio}
          />

          <TouchControls
            mode={flightMode}
            onInputChange={(fn) => {
              inputRef.current = fn(inputRef.current);
            }}
            onToggleFlight={handleToggleFlight}
            nitroPercent={nitroPercent}
            isNitroCooldown={isNitroCooldown}
          />
        </>
      )}

      {/* Title Screen */}
      {gameMode === 'title' && (
        <TitleScreen
          unlockedLevel={unlockedLevel}
          selectedLevel={level}
          coins={coins}
          dailyMissions={dailyMissions}
          onClaimMission={handleClaimMission}
          getLevelLeaderboard={(lvl) => engineRef.current ? engineRef.current.getLevelLeaderboard(lvl) : []}
          onSelectLevel={handleSelectLevel}
          onStart={handleStartGame}
          onOpenGarage={handleOpenGarage}
        />
      )}

      {/* Victory / Mission Passed Screen */}
      {gameMode === 'victory' && (
        <MissionModal
          isVictory={true}
          levelMeta={levelMeta}
          coins={coins}
          onNextLevel={handleNextLevel}
          onRetry={handleRestartLevel}
          onCinematicReplay={handleCinematicReplay}
        />
      )}

      {/* Game Over / Mission Failed (3 Lives Lost) Screen */}
      {gameMode === 'gameover' && (
        <MissionModal
          isVictory={false}
          levelMeta={levelMeta}
          coins={coins}
          onNextLevel={handleNextLevel}
          onRetry={handleRestartLevel}
        />
      )}

      {/* Pause Menu */}
      {gameMode === 'paused' && (
        <PauseMenu
          level={level}
          unlockedLevel={unlockedLevel}
          isMuted={isMuted}
          onResume={handleResume}
          onRestart={handleRestartLevel}
          onSelectLevel={handleSelectLevel}
          onToggleMute={handleToggleMute}
          onTitleScreen={() => {
            if (engineRef.current) engineRef.current.mode = 'title';
            setGameMode('title');
          }}
          onOpenGarage={handleOpenGarage}
          weatherState={weatherState}
          onToggleWeather={handleToggleWeather}
          onOpenRadio={handleOpenRadio}
        />
      )}

      {/* Cyber Garage Modal */}
      {isGarageOpen && (
        <GarageModal
          unlockedLevel={unlockedLevel}
          currentVehicleId={currentVehicleId}
          onSelectVehicle={handleSelectVehicle}
          onClose={handleCloseGarage}
        />
      )}

      {/* Branching Route Selection Modal (After Level 10) */}
      {isRouteSelectOpen && (
        <RouteModal
          currentRoute={currentRoute}
          onSelectRoute={handleSelectRoute}
          onProceed={handleProceedFromRouteSelect}
        />
      )}

      {/* Cyber Radio & Lyria AI Music Player Modal */}
      {isRadioOpen && (
        <CyberRadio onClose={handleCloseRadio} />
      )}
    </div>
  );
}
