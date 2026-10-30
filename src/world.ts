import * as THREE from 'three';
import { BuildingData, TreeData } from './types';
import { generateLevelLayout, generateLevelMeta } from './levels';

// Deterministic PRNG for consistent city layouts
let seed = 1234567;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

// Procedural texture generator helper
function createCanvasTexture(
  width: number,
  height: number,
  renderFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  renderFn(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Forest terrain height calculation
export function heightAt(x: number, z: number): number {
  if (x < 300) return 0;
  const blend = Math.min((x - 300) / 80, 1);
  const hill1 = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 16;
  const hill2 = Math.sin(x * 0.045 + 1.2) * Math.cos(z * 0.035) * 8;
  const base = 4 + blend * 12;
  return Math.max(0, blend * (base + hill1 + hill2));
}

// Slalom forest path center
export function forestPathX(z: number): number {
  return 430 + 55 * Math.sin(z * 0.018);
}

export class WorldManager {
  public scene: THREE.Scene;
  public buildings: BuildingData[] = [];
  public trees: TreeData[] = [];
  public levelGroup: THREE.Group = new THREE.Group();
  public coinsList: THREE.Mesh[] = [];
  public ringsList: THREE.Mesh[] = [];
  public coresList: THREE.Mesh[] = [];
  public landingPad: THREE.Group | null = null;
  public currentObjectiveTarget: THREE.Vector3 = new THREE.Vector3();

  // Materials
  private windowMat: THREE.MeshLambertMaterial;
  private signMaterials: THREE.MeshBasicMaterial[] = [];
  private roadMat: THREE.MeshBasicMaterial;
  private coinGeometry: THREE.CylinderGeometry;
  private coinMaterial: THREE.MeshStandardMaterial;
  private ringGeometry: THREE.TorusGeometry;
  private ringActiveMat: THREE.MeshBasicMaterial;
  private ringInactiveMat: THREE.MeshBasicMaterial;
  private coreGeometry: THREE.IcosahedronGeometry;
  private coreMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.levelGroup);

    // Procedural skyscraper window texture
    const winTex = createCanvasTexture(128, 256, (ctx, w, h) => {
      ctx.fillStyle = '#070512';
      ctx.fillRect(0, 0, w, h);
      const palette = ['#00f0ff', '#ff00aa', '#ffbb00', '#7b2cbf', '#00ff88'];
      const padX = 6;
      const padY = 8;
      const bw = 10;
      const bh = 14;
      for (let y = padY; y < h - padY; y += bh + padY) {
        for (let x = padX; x < w - padX; x += bw + padX) {
          if (rnd() < 0.52) {
            ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 4;
            ctx.fillRect(x, y, bw, bh);
          }
        }
      }
    });

    this.windowMat = new THREE.MeshLambertMaterial({
      map: winTex,
      emissive: 0xffffff,
      emissiveMap: winTex,
      emissiveIntensity: 0.95,
      color: 0x161226,
    });

    // Procedural neon signs
    const neonWords = [
      { text: 'CYBER-X', color: '#00f0ff' },
      { text: 'NEON MATRIX', color: '#ff0077' },
      { text: 'RAMEN 2099', color: '#ffaa00' },
      { text: 'NEXUS TOWER', color: '#00ffaa' },
      { text: 'OVERDRIVE', color: '#bf55ec' },
      { text: 'SYNTH-WAVE', color: '#ff0055' },
    ];

    this.signMaterials = neonWords.map((item) => {
      const tex = createCanvasTexture(256, 80, (ctx, w, h) => {
        ctx.fillStyle = '#0a0316';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, w - 8, h - 8);

        ctx.fillStyle = item.color;
        ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 12;
        ctx.fillText(item.text, w / 2, h / 2);
      });
      return new THREE.MeshBasicMaterial({ map: tex });
    });

    // Road asphalt and glowing neon lines
    const roadTex = createCanvasTexture(64, 128, (ctx, w, h) => {
      ctx.fillStyle = '#12121a';
      ctx.fillRect(0, 0, w, h);
      // Cyber cyan curbs
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(0, 0, 3, h);
      ctx.fillRect(w - 3, 0, 3, h);
      // Yellow glowing dashed center line
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(w / 2 - 2, 8, 4, 40);
      ctx.fillRect(w / 2 - 2, 72, 4, 40);
    });
    roadTex.repeat.set(1, 30);
    this.roadMat = new THREE.MeshBasicMaterial({ map: roadTex });

    // Coin setup
    this.coinGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.28, 16);
    this.coinGeometry.rotateX(Math.PI / 2);
    this.coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xaa7700,
      metalness: 0.9,
      roughness: 0.2,
    });

    // Ring setup
    this.ringGeometry = new THREE.TorusGeometry(8.5, 0.75, 10, 32);
    this.ringActiveMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: false });
    this.ringInactiveMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: false });

    // Energy core setup
    this.coreGeometry = new THREE.IcosahedronGeometry(1.6, 0);
    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x009977,
      metalness: 0.4,
      roughness: 0.2,
      wireframe: false,
    });

    this.buildCity();
    this.buildRoads();
    this.buildForest();
  }

  private buildCity() {
    seed = 4242;
    // Main city block grid from -5 to 4
    for (let i = -5; i < 5; i++) {
      for (let j = -5; j < 5; j++) {
        const x = i * 65 + 32;
        const z = j * 65 + 32;
        const w = 9 + rnd() * 11;
        const d = 9 + rnd() * 11;
        const h = 28 + rnd() * rnd() * 130; // some tall skyscrapers reaching 150m!
        const hasSign = rnd() < 0.65;

        const geom = new THREE.BoxGeometry(w * 2, h, d * 2);
        const uv = geom.attributes.uv;
        for (let k = 0; k < uv.count; k++) {
          uv.setXY(k, (uv.getX(k) * w) / 5, (uv.getY(k) * h) / 18);
        }

        const mesh = new THREE.Mesh(geom, this.windowMat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        this.buildings.push({ x, z, w, d, h });

        // Add glowing neon sign
        if (hasSign) {
          const signIndex = Math.floor(rnd() * this.signMaterials.length);
          const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 5), this.signMaterials[signIndex]);
          signMesh.position.set(x, h * (0.35 + rnd() * 0.4), z + d + 0.25);
          this.scene.add(signMesh);
        }

        // Add skyscraper rooftop antenna/beacon
        if (h > 90) {
          const antGeom = new THREE.CylinderGeometry(0.2, 0.4, 18, 6);
          const antMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
          const ant = new THREE.Mesh(antGeom, antMat);
          ant.position.set(x, h + 9, z);
          this.scene.add(ant);
        }
      }
    }

    // High Skyscraper with rooftop launch ramp for Mission 3
    const rampX = -350;
    const rampZ = 0;
    const rampW = 16;
    const rampD = 18;
    const rampH = 125;

    const rampTowerGeom = new THREE.BoxGeometry(rampW * 2, rampH, rampD * 2);
    const rampTower = new THREE.Mesh(rampTowerGeom, this.windowMat);
    rampTower.position.set(rampX, rampH / 2, rampZ);
    this.scene.add(rampTower);
    this.buildings.push({ x: rampX, z: rampZ, w: rampW, d: rampD, h: rampH, hasRamp: true });

    // The physical tilted launch ramp surface
    const rampPlatGeom = new THREE.BoxGeometry(16, 1.2, 16);
    const rampPlatMat = new THREE.MeshStandardMaterial({
      color: 0xff00aa,
      emissive: 0x660044,
      metalness: 0.8,
      roughness: 0.3,
    });
    const rampMesh = new THREE.Mesh(rampPlatGeom, rampPlatMat);
    rampMesh.position.set(rampX + 10, rampH + 2.5, rampZ);
    rampMesh.rotation.z = Math.atan(0.32); // gentle upward launch angle
    this.scene.add(rampMesh);

    // Neon edge lighting on ramp
    const rampNeonGeom = new THREE.BoxGeometry(16, 0.3, 0.4);
    const rampNeonMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const rNeon1 = new THREE.Mesh(rampNeonGeom, rampNeonMat);
    rNeon1.position.set(rampX + 10, rampH + 3.2, rampZ + 8);
    rNeon1.rotation.z = Math.atan(0.32);
    const rNeon2 = new THREE.Mesh(rampNeonGeom, rampNeonMat);
    rNeon2.position.set(rampX + 10, rampH + 3.2, rampZ - 8);
    rNeon2.rotation.z = Math.atan(0.32);
    this.scene.add(rNeon1, rNeon2);
  }

  private buildRoads() {
    // City ground base
    const groundGeom = new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x080612 });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Grid of thoroughfares
    const roadW = 18;
    const roadLen = 720;
    const roadGeom = new THREE.PlaneGeometry(roadW, roadLen).rotateX(-Math.PI / 2);

    for (let k = -5; k <= 5; k++) {
      // North-South streets
      const roadNS = new THREE.Mesh(roadGeom, this.roadMat);
      roadNS.position.set(k * 65, 0.02, 0);
      roadNS.receiveShadow = true;
      this.scene.add(roadNS);

      // East-West avenues
      const roadEW = new THREE.Mesh(roadGeom, this.roadMat);
      roadEW.rotation.y = Math.PI / 2;
      roadEW.position.set(0, 0.03, k * 65);
      roadEW.receiveShadow = true;
      this.scene.add(roadEW);
    }
  }

  private buildForest() {
    // Outskirts forest rolling hills terrain
    const forestW = 600;
    const forestD = 900;
    const segX = 40;
    const segZ = 60;
    const terrGeom = new THREE.PlaneGeometry(forestW, forestD, segX, segZ).rotateX(-Math.PI / 2);
    const pos = terrGeom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const worldX = pos.getX(i) + 580;
      const worldZ = pos.getZ(i);
      pos.setY(i, heightAt(worldX, worldZ));
    }
    terrGeom.computeVertexNormals();

    const terrMat = new THREE.MeshLambertMaterial({
      color: 0x175c2e,
      flatShading: true,
    });
    const terrMesh = new THREE.Mesh(terrGeom, terrMat);
    terrMesh.position.x = 580;
    terrMesh.receiveShadow = true;
    this.scene.add(terrMesh);

    // Instanced pine trees across the forest
    const treeCount = 280;
    const foliageGeom = new THREE.ConeGeometry(3.2, 11, 5);
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x1e8a4c, flatShading: true });
    const trunkGeom = new THREE.CylinderGeometry(0.55, 0.8, 3.5, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2415 });

    const foliageInst = new THREE.InstancedMesh(foliageGeom, foliageMat, treeCount);
    const trunkInst = new THREE.InstancedMesh(trunkGeom, trunkMat, treeCount);
    foliageInst.castShadow = true;

    const dummy = new THREE.Object3D();
    seed = 98765;

    for (let i = 0; i < treeCount; i++) {
      let x = 0;
      let z = 0;
      // Keep trees away from the winding slalom track
      do {
        x = 320 + rnd() * 490;
        z = (rnd() - 0.5) * 820;
      } while (Math.abs(x - forestPathX(z)) < 8);

      const y = heightAt(x, z);
      const scale = 0.75 + rnd() * 0.7;
      this.trees.push({ x, z, y, scale });

      // Trunk
      dummy.scale.set(scale, scale, scale);
      dummy.position.set(x, y + 1.75 * scale, z);
      dummy.rotation.y = rnd() * Math.PI * 2;
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      // Foliage
      dummy.position.y = y + 8.2 * scale;
      dummy.updateMatrix();
      foliageInst.setMatrixAt(i, dummy.matrix);
    }

    foliageInst.computeBoundingSphere();
    trunkInst.computeBoundingSphere();
    this.scene.add(foliageInst, trunkInst);
  }

  public getGroundHeight(x: number, z: number, currentY: number): number {
    let ground = heightAt(x, z);

    // Skyscraper rooftop check
    for (const b of this.buildings) {
      if (Math.abs(x - b.x) < b.w && Math.abs(z - b.z) < b.d) {
        if (currentY >= b.h - 2.5) {
          let roofH = b.h;
          // Rooftop ramp calculation for mission 3
          if (b.hasRamp && x > b.x - 5) {
            roofH += Math.min(x - (b.x - 5), 15) * 0.32;
          }
          ground = Math.max(ground, roofH);
        }
      }
    }
    return ground;
  }

  public checkObstacleCollision(
    pos: THREE.Vector3,
    outNewPos: THREE.Vector3
  ): boolean {
    let collided = false;
    outNewPos.copy(pos);

    // Check buildings
    for (const b of this.buildings) {
      if (pos.y < b.h - 1.2) {
        const boundW = b.w + 1.8;
        const boundD = b.d + 1.8;
        if (Math.abs(pos.x - b.x) < boundW && Math.abs(pos.z - b.z) < boundD) {
          const dx = (pos.x - b.x) / boundW;
          const dz = (pos.z - b.z) / boundD;
          if (Math.abs(dx) > Math.abs(dz)) {
            outNewPos.x = b.x + Math.sign(dx) * boundW;
          } else {
            outNewPos.z = b.z + Math.sign(dz) * boundD;
          }
          collided = true;
        }
      }
    }

    // Check trees in forest
    for (const t of this.trees) {
      if (pos.y < t.y + 11 * t.scale) {
        const dx = pos.x - t.x;
        const dz = pos.z - t.z;
        const dist = Math.hypot(dx, dz);
        const radius = 2.4 * t.scale;
        if (dist < radius) {
          outNewPos.x = t.x + (dx / (dist || 1)) * radius;
          outNewPos.z = t.z + (dz / (dist || 1)) * radius;
          collided = true;
        }
      }
    }

    return collided;
  }

  public loadMission(level: number, playerPos: THREE.Vector3, playerRot: { yaw: number }) {
    // Clear dynamic level elements
    while (this.levelGroup.children.length > 0) {
      const child = this.levelGroup.children[0];
      this.levelGroup.remove(child);
    }
    this.coinsList = [];
    this.ringsList = [];
    this.coresList = [];
    this.landingPad = null;

    // Use procedural level generator
    const layout = generateLevelLayout(level);
    const meta = generateLevelMeta(level);

    playerPos.copy(layout.playerStartPos);
    playerRot.yaw = layout.playerStartYaw;

    if (meta.targetType === 'rings') {
      layout.targets.forEach((pos: THREE.Vector3) => {
        const ring = new THREE.Mesh(this.ringGeometry, this.ringInactiveMat);
        ring.position.copy(pos);
        this.levelGroup.add(ring);
        this.ringsList.push(ring);
      });
    } else if (meta.targetType === 'cores') {
      layout.targets.forEach((pos: THREE.Vector3) => {
        const core = new THREE.Mesh(this.coreGeometry, this.coreMaterial);
        core.position.copy(pos);
        this.levelGroup.add(core);
        this.coresList.push(core);
      });
    } else if (meta.targetType === 'pad' && layout.padPosition) {
      const padGroup = new THREE.Group();
      padGroup.position.copy(layout.padPosition);

      const padDiscGeom = new THREE.CylinderGeometry(15, 15, 0.5, 32);
      const padDiscMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x006688,
        metalness: 0.7,
        roughness: 0.2,
      });
      const disc = new THREE.Mesh(padDiscGeom, padDiscMat);
      padGroup.add(disc);

      const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const h1 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 12), hMat);
      h1.position.set(-3.5, 0.1, 0);
      const h2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 12), hMat);
      h2.position.set(3.5, 0.1, 0);
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 2), hMat);
      hBar.position.set(0, 0.1, 0);
      padGroup.add(h1, h2, hBar);

      const beaconGeom = new THREE.CylinderGeometry(15, 15, 260, 24, 1, true);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      beaconGeom.translate(0, 130, 0);
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      padGroup.add(beacon);

      this.levelGroup.add(padGroup);
      this.landingPad = padGroup;
    }

    // Spawn generated coins
    layout.coins.forEach((cp: THREE.Vector3) => {
      this.addCoin(cp.x, cp.y, cp.z);
    });
  }

  public addCoin(x: number, y: number, z: number) {
    const coin = new THREE.Mesh(this.coinGeometry, this.coinMaterial);
    coin.position.set(x, y, z);
    this.levelGroup.add(coin);
    this.coinsList.push(coin);
  }

  public updateVisuals(dt: number, timeSec: number, currentRingIdx: number) {
    // Spin coins
    for (const coin of this.coinsList) {
      coin.rotation.z += dt * 2.8;
    }

    // Rings pulse and glow
    this.ringsList.forEach((ring, idx) => {
      ring.visible = idx >= currentRingIdx;
      if (idx === currentRingIdx) {
        ring.material = this.ringActiveMat;
        const s = 1.0 + 0.08 * Math.sin(timeSec * 6);
        ring.scale.set(s, s, s);
      } else {
        ring.material = this.ringInactiveMat;
        ring.scale.set(1, 1, 1);
      }
    });

    // Cores rotate and bob
    this.coresList.forEach((core, idx) => {
      core.rotation.y += dt * 2.2;
      core.rotation.x += dt * 1.5;
      core.position.y += Math.sin(timeSec * 3 + idx) * 0.015;
    });

    // Landing pad beacon pulse
    if (this.landingPad) {
      const beacon = this.landingPad.children[4] as THREE.Mesh | undefined;
      if (beacon && beacon.material instanceof THREE.MeshBasicMaterial) {
        beacon.material.opacity = 0.18 + 0.1 * Math.sin(timeSec * 4);
      }
    }
  }
}
