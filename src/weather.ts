import * as THREE from 'three';
import { WeatherType, WeatherState } from './types';
import { sound } from './audio';

export class WeatherManager {
  public currentWeather: WeatherType = 'clear';
  public targetWeather: WeatherType = 'clear';
  public transitionProgress: number = 1.0;
  public autoCycle: boolean = true;
  public cycleTimer: number = 0;
  public cycleDuration: number = 42; // Seconds per weather state in auto cycle

  // Dynamic parameters
  public tractionMultiplier: number = 1.0;
  public fogDensity: number = 0.0032;
  public rainIntensity: number = 0.0;
  public fogIntensity: number = 0.0;

  // Scene references
  private scene: THREE.Scene;
  private hemiLight?: THREE.HemisphereLight;
  private dirLight?: THREE.DirectionalLight;

  // Rain particle system
  private maxRainDrops = 1400;
  private rainGeom: THREE.BufferGeometry;
  private rainPositions: Float32Array;
  private rainVelocities: Float32Array;
  private rainSystem: THREE.Points;
  private rainMaterial: THREE.PointsMaterial;

  // Splash particle system
  private maxSplashes = 120;
  private splashGeom: THREE.BufferGeometry;
  private splashPositions: Float32Array;
  private splashLifetimes: Float32Array;
  private splashSystem: THREE.Points;

  // Thunder timing
  private thunderTimer: number = 12;

  // Palette definitions
  private readonly clearBg = new THREE.Color(0x0a0515);
  private readonly clearFog = new THREE.Color(0x0a0515);
  private readonly rainBg = new THREE.Color(0x050814);
  private readonly rainFog = new THREE.Color(0x070b18);
  private readonly fogBg = new THREE.Color(0x081318);
  private readonly fogFog = new THREE.Color(0x0a161c);

  private tempColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Find existing scene lights if possible
    scene.traverse((obj) => {
      if (!this.hemiLight && obj instanceof THREE.HemisphereLight) {
        this.hemiLight = obj;
      } else if (!this.dirLight && obj instanceof THREE.DirectionalLight) {
        this.dirLight = obj;
      }
    });

    // 1. Build Rain Particle System
    this.rainPositions = new Float32Array(this.maxRainDrops * 3);
    this.rainVelocities = new Float32Array(this.maxRainDrops);

    for (let i = 0; i < this.maxRainDrops; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 110;
      this.rainPositions[i * 3 + 1] = Math.random() * 55;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 110;
      this.rainVelocities[i] = 75 + Math.random() * 35; // Fall speed
    }

    this.rainGeom = new THREE.BufferGeometry();
    this.rainGeom.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    // Procedural raindrop point texture
    const rainCanvas = document.createElement('canvas');
    rainCanvas.width = 16;
    rainCanvas.height = 64;
    const ctx = rainCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      grad.addColorStop(0.3, 'rgba(160, 230, 255, 0.4)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(6, 0, 4, 64);
    }
    const rainTexture = new THREE.CanvasTexture(rainCanvas);

    this.rainMaterial = new THREE.PointsMaterial({
      color: 0x99ddff,
      size: 1.8,
      map: rainTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.rainSystem = new THREE.Points(this.rainGeom, this.rainMaterial);
    this.rainSystem.frustumCulled = false;
    this.scene.add(this.rainSystem);

    // 2. Build Splash Particle System
    this.splashPositions = new Float32Array(this.maxSplashes * 3).fill(-9999);
    this.splashLifetimes = new Float32Array(this.maxSplashes).fill(0);
    this.splashGeom = new THREE.BufferGeometry();
    this.splashGeom.setAttribute('position', new THREE.BufferAttribute(this.splashPositions, 3));

    const splashMat = new THREE.PointsMaterial({
      color: 0x77ccff,
      size: 0.9,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.splashSystem = new THREE.Points(this.splashGeom, splashMat);
    this.splashSystem.frustumCulled = false;
    this.scene.add(this.splashSystem);
  }

  public setWeather(target: WeatherType, immediate: boolean = false) {
    this.targetWeather = target;
    if (immediate) {
      this.currentWeather = target;
      this.transitionProgress = 1.0;
      this.applyDirectState(target);
    } else {
      this.transitionProgress = 0.0;
    }
  }

  public toggleNextWeather(): WeatherType {
    const list: WeatherType[] = ['clear', 'rain', 'fog'];
    const nextIdx = (list.indexOf(this.targetWeather) + 1) % list.length;
    this.setWeather(list[nextIdx]);
    return list[nextIdx];
  }

  private applyDirectState(weather: WeatherType) {
    if (weather === 'clear') {
      this.tractionMultiplier = 1.0;
      this.fogDensity = 0.0032;
      this.rainIntensity = 0.0;
      this.fogIntensity = 0.0;
    } else if (weather === 'rain') {
      this.tractionMultiplier = 0.60;
      this.fogDensity = 0.0072;
      this.rainIntensity = 1.0;
      this.fogIntensity = 0.35;
    } else if (weather === 'fog') {
      this.tractionMultiplier = 0.82;
      this.fogDensity = 0.0195;
      this.rainIntensity = 0.0;
      this.fogIntensity = 1.0;
    }
  }

  public update(dt: number, carPos: THREE.Vector3, isForestRoute: boolean) {
    // 1. Procedural Auto-Cycle
    if (this.autoCycle) {
      this.cycleTimer += dt;
      if (this.cycleTimer >= this.cycleDuration) {
        this.cycleTimer = 0;
        this.toggleNextWeather();
      }
    }

    // 2. Weather Transition Lerping
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + dt * 0.45);
      if (this.transitionProgress >= 1.0) {
        this.currentWeather = this.targetWeather;
      }
    }

    // Calculate target parameters
    let targetTraction = 1.0;
    let targetFogD = 0.0032;
    let targetRain = 0.0;
    let targetFog = 0.0;

    if (this.targetWeather === 'rain') {
      targetTraction = 0.60;
      targetFogD = 0.0075;
      targetRain = 1.0;
      targetFog = 0.35;
    } else if (this.targetWeather === 'fog') {
      targetTraction = 0.82;
      targetFogD = 0.0195;
      targetRain = 0.0;
      targetFog = 1.0;
    } else {
      targetTraction = 1.0;
      targetFogD = 0.0032;
      targetRain = 0.0;
      targetFog = 0.0;
    }

    // Smooth lerping
    const blendRate = Math.min(1.0, 1.8 * dt);
    this.tractionMultiplier += (targetTraction - this.tractionMultiplier) * blendRate;
    this.fogDensity += (targetFogD - this.fogDensity) * blendRate;
    this.rainIntensity += (targetRain - this.rainIntensity) * blendRate;
    this.fogIntensity += (targetFog - this.fogIntensity) * blendRate;

    // 3. Update Scene Fog & Lighting
    let baseBg = isForestRoute ? new THREE.Color(0x06140d) : this.clearBg;
    let baseFog = isForestRoute ? new THREE.Color(0x06140d) : this.clearFog;

    if (this.rainIntensity > 0.02) {
      this.tempColor.copy(baseBg).lerp(this.rainBg, this.rainIntensity);
      this.scene.background = this.tempColor;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.copy(baseFog).lerp(this.rainFog, this.rainIntensity);
      }
    } else if (this.fogIntensity > 0.02) {
      this.tempColor.copy(baseBg).lerp(this.fogBg, this.fogIntensity);
      this.scene.background = this.tempColor;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.copy(baseFog).lerp(this.fogFog, this.fogIntensity);
      }
    } else {
      this.scene.background = baseBg;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color = baseFog;
      }
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = this.fogDensity;
    }

    // 4. Update Rain Particles around Car
    this.rainMaterial.opacity = this.rainIntensity * 0.78;
    this.rainSystem.visible = this.rainIntensity > 0.02;

    if (this.rainSystem.visible) {
      sound.setRainVolume(this.rainIntensity * 0.65);

      const positions = this.rainPositions;
      const velocities = this.rainVelocities;
      const cx = carPos.x;
      const cy = carPos.y;
      const cz = carPos.z;

      for (let i = 0; i < this.maxRainDrops; i++) {
        const i3 = i * 3;
        positions[i3 + 1] -= velocities[i] * dt;

        // Wrap around relative to car position
        const dy = positions[i3 + 1] - cy;
        const dx = positions[i3] - cx;
        const dz = positions[i3 + 2] - cz;

        if (dy < -6 || Math.abs(dx) > 55 || Math.abs(dz) > 55) {
          positions[i3] = cx + (Math.random() - 0.5) * 110;
          positions[i3 + 1] = cy + 24 + Math.random() * 26;
          positions[i3 + 2] = cz + (Math.random() - 0.5) * 110;

          // Occasional road splash
          if (Math.random() < 0.08) {
            this.triggerSplash(positions[i3], cy, positions[i3 + 2]);
          }
        }
      }
      this.rainGeom.attributes.position.needsUpdate = true;

      // Random lightning flash during heavy rain
      this.thunderTimer -= dt;
      if (this.thunderTimer <= 0) {
        this.thunderTimer = 14 + Math.random() * 20;
        sound.playThunder();
        if (this.scene.fog instanceof THREE.FogExp2) {
          const origFog = this.scene.fog.color.getHex();
          this.scene.fog.color.setHex(0xddeeff);
          setTimeout(() => {
            if (this.scene.fog instanceof THREE.FogExp2) {
              this.scene.fog.color.setHex(origFog);
            }
          }, 80);
        }
      }
    } else {
      sound.setRainVolume(0);
    }

    // 5. Update Splashes
    if (this.maxSplashes > 0) {
      let activeSplashes = false;
      for (let i = 0; i < this.maxSplashes; i++) {
        if (this.splashLifetimes[i] > 0) {
          this.splashLifetimes[i] -= dt * 3.5;
          activeSplashes = true;
          if (this.splashLifetimes[i] <= 0) {
            this.splashPositions[i * 3 + 1] = -9999;
          }
        }
      }
      if (activeSplashes) {
        this.splashGeom.attributes.position.needsUpdate = true;
      }
    }
  }

  private triggerSplash(x: number, y: number, z: number) {
    for (let i = 0; i < this.maxSplashes; i++) {
      if (this.splashLifetimes[i] <= 0) {
        this.splashLifetimes[i] = 1.0;
        this.splashPositions[i * 3] = x;
        this.splashPositions[i * 3 + 1] = y + 0.15;
        this.splashPositions[i * 3 + 2] = z;
        break;
      }
    }
  }

  public getWeatherState(): WeatherState {
    const activeType = this.targetWeather;
    let visibilityRating: 'High' | 'Moderate' | 'Low' = 'High';
    let name = 'Clear Neon Night';
    let icon = '☀️';

    if (activeType === 'rain') {
      visibilityRating = 'Moderate';
      name = 'Cyber Rainstorm';
      icon = '🌧️';
    } else if (activeType === 'fog') {
      visibilityRating = 'Low';
      name = 'Neon Smog / Dense Fog';
      icon = '🌫️';
    }

    return {
      type: activeType,
      transitionProgress: this.transitionProgress,
      fogDensity: this.fogDensity,
      visibilityRating,
      tractionMultiplier: this.tractionMultiplier,
      name,
      icon,
      ambientSoundVolume: this.rainIntensity,
    };
  }

  public destroy() {
    this.rainGeom.dispose();
    this.rainMaterial.dispose();
    this.splashGeom.dispose();
    sound.setRainVolume(0);
  }
}
