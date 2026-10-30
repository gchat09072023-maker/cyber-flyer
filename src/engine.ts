import * as THREE from 'three';
import { CyberCar } from './car';
import { WorldManager } from './world';
import { GameMode, InputState, PopNotification, GeneratedLevel, VehicleId, RouteId, WeatherType, WeatherState, ReplayFrame, DailyMission, LeaderboardEntry } from './types';
import { generateLevelMeta } from './levels';
import { getVehicleSpec } from './vehicles';
import { WeatherManager } from './weather';
import { sound } from './audio';

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public car: CyberCar;
  public world: WorldManager;
  public weather: WeatherManager;

  // Game state
  public mode: GameMode = 'title';
  public currentLevel: number = 1;
  public unlockedLevel: number = 1;
  public currentProgress: number = 0;
  public totalProgress: number = 5;
  public coins: number = 0;
  public lives: number = 3;
  public maxLives: number = 3;
  public currentLevelMeta: GeneratedLevel;
  public currentRoute: RouteId = 'metropolis';
  public currentVehicleId: VehicleId = 'coupe';
  public targetDistance: number = 0;
  public targetAngleRel: number = 0;
  public notifications: PopNotification[] = [];
  public isDamageFlash: boolean = false;

  // Daily Missions system
  public dailyMissions: DailyMission[] = [];

  // Replay telemetry recording
  public replayFrames: ReplayFrame[] = [];
  private recordAccumulator: number = 0;
  private replayProgress: number = 0;
  private levelStartTime: number = 0;

  // Smooth camera state
  private cameraYaw: number = 0;
  private currentFov: number = 68;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private lookTarget: THREE.Vector3 = new THREE.Vector3();
  private collisionTmp: THREE.Vector3 = new THREE.Vector3();

  // Particle burst system
  private maxParticles = 180;
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;
  private particleLifetimes: Float32Array;
  private particleColors: Float32Array;
  private particleGeom: THREE.BufferGeometry;
  private particleSystem: THREE.Points;

  // Timing
  private lastTime: number = performance.now();
  private frameId: number = 0;
  private isDestroyed: boolean = false;
  private onStateUpdateCb?: () => void;

  constructor(canvas: HTMLCanvasElement, onStateUpdate?: () => void) {
    this.onStateUpdateCb = onStateUpdate;

    try {
      const savedCoins = localStorage.getItem('cf_coins');
      if (savedCoins) this.coins = parseInt(savedCoins, 10) || 0;
      const savedLvl = localStorage.getItem('cf_maxlvl') || localStorage.getItem('cf_lvl');
      if (savedLvl) this.unlockedLevel = Math.max(1, parseInt(savedLvl, 10) || 1);
      this.currentLevel = this.unlockedLevel;

      const savedCar = localStorage.getItem('cf_cur_car') as VehicleId | null;
      if (savedCar) this.currentVehicleId = savedCar;
      const savedRoute = localStorage.getItem('cf_route') as RouteId | null;
      if (savedRoute) this.currentRoute = savedRoute;
    } catch {
      // Local storage disabled or error
    }

    this.initDailyMissions();

    this.currentLevelMeta = generateLevelMeta(this.currentLevel);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0515);
    this.scene.fog = new THREE.FogExp2(0x0a0515, 0.0032);

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 1500);

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const hemiLight = new THREE.HemisphereLight(0x7ec0ee, 0x1a0a2a, 1.3);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xff55b2, 1.15);
    dirLight.position.set(-60, 130, 80);
    dirLight.castShadow = !isSoftwareGl;
    this.scene.add(dirLight);

    const cityFillLight = new THREE.DirectionalLight(0x00f0ff, 0.75);
    cityFillLight.position.set(80, 50, -60);
    this.scene.add(cityFillLight);

    this.world = new WorldManager(this.scene);
    this.car = new CyberCar();
    this.car.setVehicleType(this.currentVehicleId);
    this.scene.add(this.car.root);
    this.weather = new WeatherManager(this.scene);

    this.particlePositions = new Float32Array(this.maxParticles * 3).fill(-9999);
    this.particleVelocities = new Float32Array(this.maxParticles * 3);
    this.particleLifetimes = new Float32Array(this.maxParticles);
    this.particleColors = new Float32Array(this.maxParticles * 3);

    this.particleGeom = new THREE.BufferGeometry();
    this.particleGeom.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeom.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 2.4,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particleSystem = new THREE.Points(this.particleGeom, particleMat);
    this.particleSystem.frustumCulled = false;
    this.scene.add(this.particleSystem);

    this.startLevel(this.currentLevel);

    this.animate = this.animate.bind(this);
    this.frameId = requestAnimationFrame(this.animate);
  }

  private initDailyMissions() {
    try {
      const saved = localStorage.getItem('cf_dailies');
      const todayStr = new Date().toDateString();
      const savedDate = localStorage.getItem('cf_dailies_date');
      if (saved && savedDate === todayStr) {
        this.dailyMissions = JSON.parse(saved);
        return;
      }
    } catch {}

    this.dailyMissions = [
      {
        id: 'coins_run',
        title: 'Neon Scavenger',
        description: 'Collect 30 coins in runs',
        target: 30,
        current: 0,
        rewardCoins: 150,
        completed: false,
        claimed: false,
      },
      {
        id: 'flight_dist',
        title: 'Sky Voyager',
        description: 'Fly 400m in Flight Mode',
        target: 400,
        current: 0,
        rewardCoins: 200,
        completed: false,
        claimed: false,
      },
      {
        id: 'top_speed',
        title: 'Sonic Barrier',
        description: 'Reach 180 km/h top speed',
        target: 180,
        current: 0,
        rewardCoins: 250,
        completed: false,
        claimed: false,
      },
    ];
    this.saveDailyMissions();
  }

  private saveDailyMissions() {
    try {
      localStorage.setItem('cf_dailies', JSON.stringify(this.dailyMissions));
      localStorage.setItem('cf_dailies_date', new Date().toDateString());
    } catch {}
  }

  public claimDailyMission(id: string) {
    const m = this.dailyMissions.find((item) => item.id === id);
    if (m && m.completed && !m.claimed) {
      m.claimed = true;
      this.coins += m.rewardCoins;
      try {
        localStorage.setItem('cf_coins', this.coins.toString());
      } catch {}
      this.saveDailyMissions();
      sound.playCoin();
      this.addNotification(`CLAIMED +${m.rewardCoins} ¢!`, this.car.position, '#ffd700');
    }
  }

  public setVehicle(id: VehicleId) {
    this.currentVehicleId = id;
    this.car.setVehicleType(id);
    try {
      localStorage.setItem('cf_cur_car', id);
    } catch {}
  }

  public setRoute(route: RouteId) {
    this.currentRoute = route;
    try {
      localStorage.setItem('cf_route', route);
    } catch {}
  }

  public resize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public startLevel(level: number) {
    this.currentLevel = level;
    this.currentLevelMeta = generateLevelMeta(level);
    this.totalProgress = this.currentLevelMeta.targetCount;
    this.currentProgress = 0;
    this.lives = 3;
    this.isDamageFlash = false;
    this.replayFrames = [];
    this.recordAccumulator = 0;
    this.replayProgress = 0;
    this.levelStartTime = performance.now();

    // Route-based atmospheric coloring
    if (this.currentRoute === 'forest' && level >= 11) {
      this.scene.background = new THREE.Color(0x06140d);
      this.scene.fog = new THREE.FogExp2(0x06140d, 0.0035);
    } else {
      this.scene.background = new THREE.Color(0x0a0515);
      this.scene.fog = new THREE.FogExp2(0x0a0515, 0.0032);
    }

    const rot = { yaw: Math.PI };
    this.world.loadMission(level, this.car.position, rot);
    this.car.yaw = rot.yaw;
    this.car.pitch = 0;
    this.car.roll = 0;
    this.car.speedKmh = 0;
    this.car.velocity.set(0, 0, 0);
    this.car.verticalSpeed = 0;
    this.car.mode = 'ground';
    this.car.isGrounded = true;
    this.car.wingProgress = 0;
    this.car.nitroAmount = this.car.maxNitro;
    this.car.nitroCooldown = false;
    this.car.triggerInvulnerability(1.5);

    this.car.lastSafePosition.copy(this.car.position);
    this.car.lastSafeYaw = this.car.yaw;

    this.cameraYaw = this.car.yaw;

    const fx = Math.sin(this.cameraYaw);
    const fz = Math.cos(this.cameraYaw);
    this.camera.position.set(
      this.car.position.x - fx * 12,
      this.car.position.y + 4.5,
      this.car.position.z - fz * 12
    );
    this.camera.lookAt(
      this.car.position.x + fx * 10,
      this.car.position.y + 1.2,
      this.car.position.z + fz * 10
    );

    this.updateTargetCompass();
  }

  public spawnParticles(
    pos: THREE.Vector3,
    count: number,
    colorHex: number = 0xffcc00,
    speed: number = 18
  ) {
    const c = new THREE.Color(colorHex);
    let spawned = 0;

    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      if (this.particleLifetimes[i] <= 0) {
        this.particleLifetimes[i] = 0.8;
        this.particlePositions[i * 3] = pos.x;
        this.particlePositions[i * 3 + 1] = pos.y;
        this.particlePositions[i * 3 + 2] = pos.z;

        this.particleVelocities[i * 3] = (Math.random() - 0.5) * speed;
        this.particleVelocities[i * 3 + 1] = Math.random() * (speed * 0.7) + 2;
        this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * speed;

        this.particleColors[i * 3] = c.r;
        this.particleColors[i * 3 + 1] = c.g;
        this.particleColors[i * 3 + 2] = c.b;

        spawned++;
      }
    }
  }

  public addNotification(text: string, pos: THREE.Vector3, color?: string) {
    const projected = pos.clone().project(this.camera);
    if (projected.z > 1) return;

    const screenX = ((projected.x + 1) / 2) * window.innerWidth;
    const screenY = ((-projected.y + 1) / 2) * window.innerHeight;

    const notif: PopNotification = {
      id: Date.now() + Math.random(),
      text,
      color,
      x: screenX,
      y: screenY,
    };

    this.notifications.push(notif);
    setTimeout(() => {
      this.notifications = this.notifications.filter((n) => n.id !== notif.id);
    }, 1100);
  }

  private updateParticles(dt: number) {
    let hasActive = false;
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particleLifetimes[i] > 0) {
        this.particleLifetimes[i] -= dt;
        if (this.particleLifetimes[i] <= 0) {
          this.particlePositions[i * 3 + 1] = -9999;
        } else {
          this.particlePositions[i * 3] += this.particleVelocities[i * 3] * dt;
          this.particleVelocities[i * 3 + 1] -= 22 * dt;
          this.particlePositions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * dt;
          this.particlePositions[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * dt;
        }
        hasActive = true;
      }
    }

    if (hasActive) {
      this.particleGeom.attributes.position.needsUpdate = true;
      this.particleGeom.attributes.color.needsUpdate = true;
    }
  }

  // Screen-Shake Intensity Function based on collision speed and damage events
  public calculateScreenShakeIntensity(speedKmh: number, isSevereDamage: boolean): number {
    const speedFactor = Math.min(speedKmh / 160, 1.5);
    if (isSevereDamage) {
      return Math.max(1.8, 1.0 + speedFactor * 1.5);
    }
    return Math.max(0.25, speedFactor * 0.7);
  }

  // 1. SPEED-THRESHOLD CRASH & 3-CHANCE BLAST SYSTEM:
  public handleCollisionWithSpeed(speedKmh: number) {
    if (this.car.isInvulnerable || this.mode !== 'playing') {
      return;
    }

    const isSevere = speedKmh >= 80;
    const shakeIntensity = this.calculateScreenShakeIntensity(speedKmh, isSevere);
    this.car.shakeAmount = shakeIntensity;

    if (isSevere) {
      // High-Speed Blast (Speed >= 80 km/h)
      this.lives = Math.max(0, this.lives - 1);
      this.isDamageFlash = true;
      setTimeout(() => {
        this.isDamageFlash = false;
      }, 400);

      sound.playCrash();
      // Fiery explosion blast
      this.spawnParticles(this.car.position, 45, 0xff3300, 28);
      this.spawnParticles(this.car.position, 25, 0xffaa00, 22);

      this.addNotification(`💥 BLAST! -1 LIFE (${this.lives}/3)`, this.car.position, '#ff2200');

      if (this.lives <= 0) {
        this.handleGameOver(speedKmh);
      } else {
        // Safe Respawn upright on nearest road with 0 km/h and 2s invulnerability
        this.car.respawnAtSafeRoad();
      }
    } else {
      // Low/Normal Speed Scrape (Speed < 80 km/h)
      // NO explosion and NO life deducted. Preserves health!
      this.spawnParticles(this.car.position, 12, 0x00f0ff, 12);
      this.addNotification(`SCRAPE (${Math.round(speedKmh)} km/h)`, this.car.position, '#00f0ff');
    }
  }

  private handleGameOver(speedKmh: number) {
    this.mode = 'gameover';
    sound.stopEngine();
    sound.playGameOver();
  }

  private handleLevelWin() {
    this.mode = 'victory';
    const bonus = this.currentLevelMeta.rewardCoins;
    this.coins += bonus;
    this.unlockedLevel = Math.max(this.unlockedLevel, this.currentLevel + 1);

    const elapsedSec = Math.round(((performance.now() - this.levelStartTime) / 1000) * 10) / 10;

    try {
      localStorage.setItem('cf_coins', this.coins.toString());
      localStorage.setItem('cf_maxlvl', this.unlockedLevel.toString());
      localStorage.setItem('cf_lvl', this.unlockedLevel.toString());

      const bestKey = `cf_best_time_${this.currentLevel}`;
      const prevBest = localStorage.getItem(bestKey);
      if (!prevBest || elapsedSec < parseFloat(prevBest)) {
        localStorage.setItem(bestKey, elapsedSec.toString());
      }
    } catch {}

    sound.playVictory();
    sound.stopEngine();

    // Check for vehicle unlock milestone notifications
    if (this.currentLevel === 9) {
      this.addNotification('🎉 NEW VEHICLE UNLOCKED: HYPER VTOL TRUCK!', this.car.position, '#ffaa00');
    } else if (this.currentLevel === 19) {
      this.addNotification('🎉 NEW VEHICLE UNLOCKED: PHANTOM AERO JET!', this.car.position, '#00ff88');
    }
  }

  public getLevelLeaderboard(level: number): LeaderboardEntry[] {
    let playerTime = 999.9;
    let playerCoins = 0;
    try {
      const savedTime = localStorage.getItem(`cf_best_time_${level}`);
      if (savedTime) playerTime = parseFloat(savedTime);
      const savedCoins = localStorage.getItem(`cf_coins`);
      if (savedCoins) playerCoins = parseInt(savedCoins, 10) || 0;
    } catch {}

    const baseTime = Math.max(12, 45 - level * 0.3);
    const entries: LeaderboardEntry[] = [
      { rank: 1, name: 'CyberAce99', timeSec: Math.round((baseTime * 0.85) * 10) / 10, score: level * 150, isPlayer: false },
      { rank: 2, name: 'NeonGhost', timeSec: Math.round((baseTime * 0.92) * 10) / 10, score: level * 140, isPlayer: false },
      { rank: 3, name: 'VortexDrift', timeSec: Math.round((baseTime * 0.98) * 10) / 10, score: level * 130, isPlayer: false },
      { rank: 4, name: 'BladeRunnerX', timeSec: Math.round((baseTime * 1.05) * 10) / 10, score: level * 120, isPlayer: false },
      { rank: 5, name: 'QuantumFlyer', timeSec: Math.round((baseTime * 1.12) * 10) / 10, score: level * 110, isPlayer: false },
    ];

    if (playerTime < 900) {
      entries.push({
        rank: 0,
        name: 'You (Player)',
        timeSec: playerTime,
        score: playerCoins,
        isPlayer: true,
      });
    }

    entries.sort((a, b) => a.timeSec - b.timeSec);
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    return entries.slice(0, 5);
  }

  public updateMission(dt: number, timeSec: number) {
    const carPos = this.car.position;

    for (let i = this.world.coinsList.length - 1; i >= 0; i--) {
      const coin = this.world.coinsList[i];
      if (coin.position.distanceToSquared(carPos) < 24) {
        this.coins += 10;
        try {
          localStorage.setItem('cf_coins', this.coins.toString());
        } catch {}

        // Daily mission: coins_run
        const m1 = this.dailyMissions.find((m) => m.id === 'coins_run');
        if (m1 && !m1.completed) {
          m1.current = Math.min(m1.target, m1.current + 1);
          if (m1.current >= m1.target) {
            m1.completed = true;
            this.addNotification('🌟 DAILY MISSION COMPLETED!', coin.position, '#00ffcc');
          }
          this.saveDailyMissions();
        }

        sound.playCoin();
        this.spawnParticles(coin.position, 16, 0xffcc00);
        this.addNotification('+10 COINS', coin.position, '#ffd700');

        this.world.levelGroup.remove(coin);
        this.world.coinsList.splice(i, 1);
      }
    }

    if (this.currentLevelMeta.targetType === 'rings') {
      const activeRing = this.world.ringsList[this.currentProgress];
      if (activeRing) {
        this.world.currentObjectiveTarget.copy(activeRing.position);
        if (activeRing.position.distanceTo(carPos) < this.currentLevelMeta.collectRadius) {
          this.currentProgress++;
          sound.playRingPass();
          this.spawnParticles(activeRing.position, 35, 0x00f0ff);
          this.addNotification(
            `RING ${this.currentProgress}/${this.totalProgress}`,
            activeRing.position,
            '#00f0ff'
          );

          if (this.currentProgress >= this.totalProgress) {
            this.handleLevelWin();
          }
        }
      }
    } else if (this.currentLevelMeta.targetType === 'cores') {
      let nearestDist = Infinity;
      let nearestCore: THREE.Mesh | null = null;

      for (let i = this.world.coresList.length - 1; i >= 0; i--) {
        const core = this.world.coresList[i];
        const dist = core.position.distanceTo(carPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestCore = core;
        }

        if (dist < this.currentLevelMeta.collectRadius) {
          this.currentProgress++;
          sound.playCoreCollect();
          this.spawnParticles(core.position, 28, 0x00ffcc);
          this.addNotification(
            `CORE ${this.currentProgress}/${this.totalProgress}`,
            core.position,
            '#00ffcc'
          );

          this.world.levelGroup.remove(core);
          this.world.coresList.splice(i, 1);

          if (this.currentProgress >= this.totalProgress) {
            this.handleLevelWin();
          }
        }
      }

      if (nearestCore) {
        this.world.currentObjectiveTarget.copy(nearestCore.position);
      }
    } else if (this.currentLevelMeta.targetType === 'pad') {
      if (this.world.landingPad) {
        this.world.currentObjectiveTarget.copy(this.world.landingPad.position);
        const distToPad = Math.hypot(
          carPos.x - this.world.landingPad.position.x,
          carPos.z - this.world.landingPad.position.z
        );

        if (distToPad < 16.0 && this.car.isGrounded && this.car.mode === 'ground') {
          this.currentProgress = 1;
          this.handleLevelWin();
        }
      }
    }

    this.world.updateVisuals(dt, timeSec, this.currentProgress);
    this.updateTargetCompass();
  }

  private updateTargetCompass() {
    const dx = this.world.currentObjectiveTarget.x - this.car.position.x;
    const dz = this.world.currentObjectiveTarget.z - this.car.position.z;
    this.targetDistance = Math.hypot(dx, dz);

    const targetWorldAngle = Math.atan2(dx, dz);
    let diff = targetWorldAngle - this.car.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.targetAngleRel = diff;
  }

  private updateCamera(dt: number) {
    const isFlight = this.car.mode === 'flight';
    const speed = Math.abs(this.car.speedKmh);

    let yawDiff = this.car.yaw - this.cameraYaw;
    yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
    this.cameraYaw += yawDiff * Math.min(1, (isFlight ? 6.5 : 8.5) * dt);

    const fx = Math.sin(this.cameraYaw);
    const fz = Math.cos(this.cameraYaw);

    const chaseDist = isFlight ? 13.8 : 10.4;
    const chaseHeight = isFlight ? 4.5 : 3.8;

    this.cameraTarget.set(
      this.car.position.x - fx * chaseDist,
      this.car.position.y + chaseHeight - this.car.verticalSpeed * 0.04,
      this.car.position.z - fz * chaseDist
    );

    this.camera.position.lerp(this.cameraTarget, 1 - Math.exp(-(isFlight ? 11 : 9.8) * dt));

    const minCamY =
      this.world.getGroundHeight(
        this.camera.position.x,
        this.camera.position.z,
        this.camera.position.y
      ) + 1.4;
    this.camera.position.y = Math.max(this.camera.position.y, minCamY);

    if (this.car.shakeAmount > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.car.shakeAmount * 2.5;
      this.camera.position.y += (Math.random() - 0.5) * this.car.shakeAmount * 2.5;
      this.camera.position.z += (Math.random() - 0.5) * this.car.shakeAmount * 1.5;
    }

    this.lookTarget.set(
      this.car.position.x + fx * 10,
      this.car.position.y + 1.25 + this.car.verticalSpeed * 0.08,
      this.car.position.z + fz * 10
    );
    this.camera.lookAt(this.lookTarget);

    const targetFov =
      68 +
      Math.min(speed / 75, 1.0) * 11 +
      (this.car.isNitroActive ? 15 : 0) +
      (isFlight ? 5 : 0);

    this.currentFov += (targetFov - this.currentFov) * Math.min(1, 4.0 * dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.1) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }

  public toggleWeather(): WeatherType {
    const next = this.weather.toggleNextWeather();
    const st = this.weather.getWeatherState();
    this.addNotification(`WEATHER: ${st.name.toUpperCase()}`, this.car.position, next === 'rain' ? '#00f0ff' : next === 'fog' ? '#ffaa00' : '#ffd700');
    return next;
  }

  public setWeather(type: WeatherType) {
    this.weather.setWeather(type);
  }

  public getWeatherState(): WeatherState {
    return this.weather.getWeatherState();
  }

  public startCinematicReplay() {
    if (this.replayFrames.length < 2) {
      this.replayFrames = [
        {
          x: this.car.position.x,
          y: this.car.position.y,
          z: this.car.position.z,
          yaw: this.car.yaw,
          pitch: this.car.pitch,
          roll: this.car.roll,
          speedKmh: 60,
          mode: this.car.mode,
        },
        {
          x: this.car.position.x + 35,
          y: this.car.position.y + 18,
          z: this.car.position.z + 35,
          yaw: this.car.yaw + 1.5,
          pitch: 0.3,
          roll: 0.1,
          speedKmh: 95,
          mode: 'flight',
        }
      ];
    }
    this.mode = 'replay';
    this.replayProgress = 0;
  }

  public exitCinematicReplay() {
    this.mode = 'victory';
  }

  private updateReplay(dt: number) {
    if (this.replayFrames.length === 0) return;

    const replayDuration = Math.max(7, this.replayFrames.length * 0.08);
    this.replayProgress += dt / replayDuration;

    if (this.replayProgress >= 1.0) {
      this.replayProgress = 0;
    }

    const exactIndex = this.replayProgress * (this.replayFrames.length - 1);
    const idx0 = Math.floor(exactIndex);
    const idx1 = Math.min(idx0 + 1, this.replayFrames.length - 1);
    const alpha = exactIndex - idx0;

    const f0 = this.replayFrames[idx0];
    const f1 = this.replayFrames[idx1];

    this.car.position.set(
      THREE.MathUtils.lerp(f0.x, f1.x, alpha),
      THREE.MathUtils.lerp(f0.y, f1.y, alpha),
      THREE.MathUtils.lerp(f0.z, f1.z, alpha)
    );

    this.car.yaw = THREE.MathUtils.lerp(f0.yaw, f1.yaw, alpha);
    this.car.pitch = THREE.MathUtils.lerp(f0.pitch, f1.pitch, alpha);
    this.car.roll = THREE.MathUtils.lerp(f0.roll, f1.roll, alpha);
    this.car.speedKmh = THREE.MathUtils.lerp(f0.speedKmh, f1.speedKmh, alpha);
    this.car.mode = alpha > 0.5 ? f1.mode : f0.mode;
    this.car.root.position.copy(this.car.position);
    this.car.root.rotation.set(this.car.pitch, this.car.yaw, this.car.roll, 'YXZ');

    // Cinematic orbiting camera
    const orbitAngle = performance.now() * 0.0005;
    const camDist = 22;
    const camHeight = 10 + Math.sin(performance.now() * 0.001) * 4;
    const camX = this.car.position.x + Math.cos(orbitAngle) * camDist;
    const camZ = this.car.position.z + Math.sin(orbitAngle) * camDist;
    const camY = this.car.position.y + camHeight;

    this.camera.position.set(camX, Math.max(camY, this.world.getGroundHeight(camX, camZ, camY) + 2), camZ);
    this.camera.lookAt(this.car.position.x, this.car.position.y + 1.5, this.car.position.z);

    this.updateParticles(dt);
  }

  public step(dt: number, input: InputState) {
    if (this.mode === 'replay') {
      return;
    }
    if (this.mode !== 'playing') {
      return;
    }

    // Record replay telemetry every ~0.08s
    this.recordAccumulator += dt;
    if (this.recordAccumulator >= 0.08) {
      this.recordAccumulator = 0;
      this.replayFrames.push({
        x: this.car.position.x,
        y: this.car.position.y,
        z: this.car.position.z,
        yaw: this.car.yaw,
        pitch: this.car.pitch,
        roll: this.car.roll,
        speedKmh: this.car.speedKmh,
        mode: this.car.mode,
      });
      if (this.replayFrames.length > 2000) {
        this.replayFrames.shift();
      }
    }

    // Update procedural weather and feed traction to car
    this.weather.update(dt, this.car.position, this.currentRoute === 'forest' && this.currentLevel >= 11);
    this.car.tractionMultiplier = this.weather.tractionMultiplier;

    this.car.update(dt, input, (x, z, y) => this.world.getGroundHeight(x, z, y));

    // Daily mission progress updates
    if (this.car.mode === 'flight') {
      const m2 = this.dailyMissions.find((m) => m.id === 'flight_dist');
      if (m2 && !m2.completed) {
        m2.current = Math.min(m2.target, m2.current + (this.car.speedKmh / 3.6) * dt);
        if (m2.current >= m2.target) {
          m2.completed = true;
          this.addNotification('🌟 DAILY MISSION COMPLETED!', this.car.position, '#00ffcc');
        }
        this.saveDailyMissions();
      }
    }

    const m3 = this.dailyMissions.find((m) => m.id === 'top_speed');
    if (m3 && !m3.completed) {
      if (this.car.speedKmh > m3.current) {
        m3.current = Math.min(m3.target, Math.round(this.car.speedKmh));
        if (m3.current >= m3.target) {
          m3.completed = true;
          this.addNotification('🌟 DAILY MISSION COMPLETED!', this.car.position, '#00ffcc');
        }
        this.saveDailyMissions();
      }
    }

    // Collision check
    if (this.world.checkObstacleCollision(this.car.position, this.collisionTmp)) {
      const hitSpeedKmh = this.car.speedKmh;
      this.car.position.copy(this.collisionTmp);
      this.car.velocity.multiplyScalar(0.35);

      this.handleCollisionWithSpeed(hitSpeedKmh);
    }

    this.updateMission(dt, performance.now() / 1000);
    this.updateParticles(dt);
    this.updateCamera(dt);
  }

  private animate(time: number) {
    if (this.isDestroyed) return;
    this.frameId = requestAnimationFrame(this.animate);

    const rawDt = (time - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = time;

    if (this.mode === 'replay') {
      this.updateReplay(dt);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.onStateUpdateCb) {
      this.onStateUpdateCb();
    }
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    sound.stopEngine();
    this.weather.destroy();
    this.renderer.dispose();
  }
}
