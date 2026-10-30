import { VehicleSpec, VehicleId } from './types';

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'coupe',
    name: 'Cyber Coupe',
    icon: '🏎️',
    subtitle: 'Balanced sports wedge with responsive all-around handling.',
    unlockLevel: 1,
    maxNitro: 100,
    speedMultiplier: 1.0,
    flightAgility: 1.0,
    colorHex: 0x1c0c32,
    accentHex: 0x00f0ff,
  },
  {
    id: 'truck',
    name: 'Hyper VTOL Truck',
    icon: '🚚',
    subtitle: 'Armored dual quad-thruster build with +25% Nitro capacity.',
    unlockLevel: 10,
    maxNitro: 125,
    speedMultiplier: 1.06,
    flightAgility: 0.92,
    colorHex: 0x221808,
    accentHex: 0xffaa00,
  },
  {
    id: 'jet',
    name: 'Phantom Aero Jet',
    icon: '✈️',
    subtitle: 'Swept delta-wings with +30% top flight speed and razor agility.',
    unlockLevel: 20,
    maxNitro: 110,
    speedMultiplier: 1.25,
    flightAgility: 1.35,
    colorHex: 0x081c28,
    accentHex: 0x00ff88,
  },
];

export function getVehicleSpec(id: VehicleId): VehicleSpec {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}
