import * as THREE from 'three';
import { GeneratedLevel, LevelBiome } from './types';
import { heightAt, forestPathX } from './world';

// Seeded pseudorandom generator for deterministic level generation
function seededRandom(s: number) {
  let seed = s % 2147483647;
  if (seed <= 0) seed += 2147483646;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function getLevelBiome(level: number): LevelBiome {
  if (level <= 10) return 'city';
  if (level <= 25) return 'forest';
  if (level <= 50) return 'rooftop';
  return 'megacity';
}

export function generateLevelMeta(level: number): GeneratedLevel {
  const biome = getLevelBiome(level);
  let title = '';
  let subtitle = '';
  let description = '';
  let targetType: 'rings' | 'cores' | 'pad' | 'hybrid' = 'rings';
  let baseTargets = 5;

  if (biome === 'city') {
    targetType = 'rings';
    baseTargets = Math.min(10, 5 + Math.floor((level - 1) / 2));
    title = `CYBERWAY ${level}`;
    subtitle = 'Neon City Aerial Rings';
    description = `Navigate through ${baseTargets} golden neon rings hovering between downtown towers.`;
  } else if (biome === 'forest') {
    targetType = 'cores';
    baseTargets = Math.min(18, 10 + Math.floor((level - 10) / 1.5));
    title = `OUTSKIRTS SLALOM ${level}`;
    subtitle = 'Low-Altitude Canyon Trail';
    description = `Thread low between trees and terrain to collect ${baseTargets} glowing energy cores.`;
  } else if (biome === 'rooftop') {
    targetType = 'pad';
    baseTargets = 1;
    title = `ROOFTOP DASH ${level}`;
    subtitle = 'Skyscraper Ramp Leap & Landing';
    description = `Launch off the rooftop ramp, glide across the city, and precision-land on the beacon pad.`;
  } else {
    // 51-100+ Mega City
    targetType = level % 3 === 0 ? 'pad' : (level % 2 === 0 ? 'cores' : 'rings');
    baseTargets = targetType === 'pad' ? 1 : Math.min(20, 8 + Math.floor((level - 50) / 4));
    title = `NEO-TOKYO MEGA ${level}`;
    subtitle = 'High-Speed Hyperway';
    description = `Extreme challenge: Navigate tight airspace gaps and complete the ${targetType} run.`;
  }

  // Tighter radius as level increases
  const collectRadius = Math.max(7.5, 11.5 - Math.min(level * 0.04, 3.5));
  const rewardCoins = 100 + level * 25;

  return {
    level,
    biome,
    title,
    subtitle,
    description,
    targetType,
    targetCount: baseTargets,
    rewardCoins,
    collectRadius,
  };
}

export interface GeneratedLayout {
  playerStartPos: THREE.Vector3;
  playerStartYaw: number;
  targets: THREE.Vector3[];
  coins: THREE.Vector3[];
  padPosition?: THREE.Vector3;
}

export function generateLevelLayout(level: number): GeneratedLayout {
  const meta = generateLevelMeta(level);
  const rnd = seededRandom(level * 73939 + 17);

  const targets: THREE.Vector3[] = [];
  const coins: THREE.Vector3[] = [];
  let playerStartPos = new THREE.Vector3(0, 0.5, 60);
  let playerStartYaw = Math.PI;
  let padPosition: THREE.Vector3 | undefined = undefined;

  if (meta.biome === 'city' || (meta.biome === 'megacity' && meta.targetType === 'rings')) {
    // City Rings Course
    playerStartPos.set(0, 0.5, 60);
    playerStartYaw = Math.PI;

    let curX = 0;
    let curZ = 40;
    let curY = 32;

    for (let i = 0; i < meta.targetCount; i++) {
      const stepDist = 80 + rnd() * 40;
      const angle = (rnd() - 0.5) * 1.4;
      curX += Math.sin(angle) * stepDist;
      curZ -= Math.cos(angle) * stepDist;
      curY = Math.max(25, Math.min(110, curY + (rnd() - 0.45) * 35));

      // Clamp within city boundaries
      curX = Math.max(-240, Math.min(240, curX));
      curZ = Math.max(-260, Math.min(240, curZ));

      targets.push(new THREE.Vector3(curX, curY, curZ));
    }

    // Generate coin trails between rings
    const allPoints = [playerStartPos.clone(), ...targets];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];
      const coinsCount = 3 + Math.floor(rnd() * 2);
      for (let k = 1; k <= coinsCount; k++) {
        const t = k / (coinsCount + 1);
        coins.push(
          new THREE.Vector3(
            p1.x + (p2.x - p1.x) * t,
            p1.y + (p2.y - p1.y) * t,
            p1.z + (p2.z - p1.z) * t
          )
        );
      }
    }
  } else if (meta.biome === 'forest' || (meta.biome === 'megacity' && meta.targetType === 'cores')) {
    // Forest / Canyon Slalom
    const startZ = 340;
    const startX = forestPathX(startZ);
    playerStartPos.set(startX, heightAt(startX, startZ) + 0.6, startZ);
    playerStartYaw = Math.PI;

    for (let i = 0; i < meta.targetCount; i++) {
      const z = 300 - i * (500 / meta.targetCount);
      const sideOffset = (i % 2 === 0 ? 8 : -8) + (rnd() - 0.5) * 4;
      const x = forestPathX(z) + sideOffset;
      const groundH = heightAt(x, z);
      const altitude = groundH + 2.5 + (rnd() * 4.5);

      targets.push(new THREE.Vector3(x, altitude, z));
    }

    // Coins along the forest canyon trail
    for (let i = 0; i < meta.targetCount * 2 + 5; i++) {
      const z = 320 - i * (540 / (meta.targetCount * 2 + 5));
      const x = forestPathX(z);
      const y = heightAt(x, z) + 1.8;
      coins.push(new THREE.Vector3(x, y, z));
    }
  } else {
    // Rooftop Dash / Precision Leap Pad
    playerStartPos.set(-365, 126.0, 0);
    playerStartYaw = Math.PI / 2; // East

    const padDist = 180 + (level - 25) * 3;
    const padX = Math.min(260, padDist);
    const padZ = (rnd() - 0.5) * 50;
    padPosition = new THREE.Vector3(padX, 0.4, padZ);
    targets.push(padPosition.clone());

    // Coins in arc through the sky from ramp to pad
    const numCoins = 18;
    for (let i = 0; i < numCoins; i++) {
      const ratio = i / (numCoins - 1);
      const x = -310 + (padX - -310) * ratio;
      const z = padZ * ratio + Math.sin(ratio * Math.PI) * 15;
      const y = 120 - ratio * 115 + Math.sin(ratio * Math.PI) * 12;
      coins.push(new THREE.Vector3(x, y, z));
    }
  }

  return {
    playerStartPos,
    playerStartYaw,
    targets,
    coins,
    padPosition,
  };
}
