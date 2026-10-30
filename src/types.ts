export type GameMode = 'title' | 'playing' | 'paused' | 'victory' | 'gameover' | 'garage' | 'routeselect' | 'replay';

export type FlightMode = 'ground' | 'flight';

export type LevelBiome = 'city' | 'forest' | 'rooftop' | 'megacity';

export type VehicleId = 'coupe' | 'truck' | 'jet';

export type RouteId = 'metropolis' | 'forest';

export interface ReplayFrame {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  speedKmh: number;
  mode: FlightMode;
}

export type WeatherType = 'clear' | 'rain' | 'fog';

export interface WeatherState {
  type: WeatherType;
  transitionProgress: number; // 0 to 1
  fogDensity: number;
  visibilityRating: 'High' | 'Moderate' | 'Low';
  tractionMultiplier: number;
  name: string;
  icon: string;
  ambientSoundVolume: number;
}

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  icon: string;
  subtitle: string;
  unlockLevel: number;
  maxNitro: number;
  speedMultiplier: number;
  flightAgility: number;
  colorHex: number;
  accentHex: number;
}

export interface InputState {
  steerX: number; // -1 (left) to 1 (right)
  steerY: number; // -1 (down) to 1 (up)
  gas: number;    // 0 to 1
  brake: number;  // 0 to 1
  nitro: boolean;
  pitchUp: boolean;
  pitchDown: boolean;
}

export interface GeneratedLevel {
  level: number;
  biome: LevelBiome;
  title: string;
  subtitle: string;
  description: string;
  targetType: 'rings' | 'cores' | 'pad' | 'hybrid';
  targetCount: number;
  rewardCoins: number;
  collectRadius: number;
}

export interface BuildingData {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  hasRamp?: boolean;
}

export interface TreeData {
  x: number;
  z: number;
  y: number;
  scale: number;
}

export interface PopNotification {
  id: number;
  text: string;
  color?: string;
  x: number;
  y: number;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  rewardCoins: number;
  completed: boolean;
  claimed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  timeSec: number;
  score: number;
  isPlayer: boolean;
}
