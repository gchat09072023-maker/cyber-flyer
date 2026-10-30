import * as THREE from 'three';
import { FlightMode, InputState, VehicleId } from './types';
import { getVehicleSpec } from './vehicles';
import { sound } from './audio';

export interface CarWheel {
  pivotGroup: THREE.Group;
  spinGroup: THREE.Group;
  vtolPlume: THREE.Mesh;
  sideX: number;
  isFront: boolean;
}

export class CyberCar {
  public root: THREE.Group;
  public bodyGroup: THREE.Group;
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();

  // Rotations & orientation
  public yaw: number = 0;
  public pitch: number = 0;
  public roll: number = 0;
  public speedKmh: number = 0;

  // Active vehicle model
  public vehicleId: VehicleId = 'coupe';

  // Flight & mechanics state
  public mode: FlightMode = 'ground';
  public wingProgress: number = 0;
  public isGrounded: boolean = true;
  public isSoftLanding: boolean = false;
  public cushionPower: number = 0;
  public nitroAmount: number = 100;
  public maxNitro: number = 100;
  public nitroCooldown: boolean = false;
  public isNitroActive: boolean = false;
  public verticalSpeed: number = 0;
  public verticalGroundRate: number = 0;
  public shakeAmount: number = 0;
  public crashCooldown: number = 0;

  // Invulnerability & Damage effect state
  public isInvulnerable: boolean = false;
  public invulnerableTimer: number = 0;
  public lastSafePosition: THREE.Vector3 = new THREE.Vector3(0, 0.5, 60);
  public lastSafeYaw: number = Math.PI;
  public tractionMultiplier: number = 1.0;

  // Dynamic Headlight Beams
  public headlightLeft!: THREE.SpotLight;
  public headlightRight!: THREE.SpotLight;

  // Visual Parts & Materials
  private wings: THREE.Group[] = [];
  private wheels: CarWheel[] = [];
  private rearThrusters: THREE.Mesh[] = [];
  private underglow!: THREE.Mesh;
  private shieldBubble!: THREE.Mesh;
  private bodyMeshParts: THREE.Mesh[] = [];

  private bodyMat!: THREE.MeshStandardMaterial;
  private canopyMat!: THREE.MeshStandardMaterial;
  private neonAccentMat!: THREE.MeshBasicMaterial;
  private neonMagentaMat!: THREE.MeshBasicMaterial;
  private wheelRimMat!: THREE.MeshStandardMaterial;
  private thrusterMatNormal!: THREE.MeshBasicMaterial;
  private thrusterMatNitro!: THREE.MeshBasicMaterial;
  private vtolMat!: THREE.MeshBasicMaterial;

  constructor() {
    this.root = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.root.add(this.bodyGroup);

    this.neonMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    this.thrusterMatNormal = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 });
    this.thrusterMatNitro = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.95 });
    this.vtolMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75 });

    this.setVehicleType('coupe');
  }

  public setVehicleType(id: VehicleId) {
    this.vehicleId = id;
    const spec = getVehicleSpec(id);
    this.maxNitro = spec.maxNitro;
    this.nitroAmount = Math.min(this.nitroAmount, this.maxNitro);

    while (this.bodyGroup.children.length > 0) {
      this.bodyGroup.remove(this.bodyGroup.children[0]);
    }
    this.wings = [];
    this.wheels = [];
    this.rearThrusters = [];
    this.bodyMeshParts = [];

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: spec.colorHex,
      metalness: 0.88,
      roughness: 0.22,
      emissive: 0x080410,
    });

    this.neonAccentMat = new THREE.MeshBasicMaterial({ color: spec.accentHex });

    this.canopyMat = new THREE.MeshStandardMaterial({
      color: spec.accentHex,
      metalness: 0.95,
      roughness: 0.08,
      transparent: true,
      opacity: 0.82,
    });

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0e0e14, roughness: 0.85 });
    this.wheelRimMat = new THREE.MeshStandardMaterial({
      color: spec.accentHex,
      metalness: 0.9,
      roughness: 0.15,
    });

    // Mesh based on vehicle type
    if (id === 'truck') {
      // Hyper VTOL Truck (Armored Cyber Aesthetic)
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.65, 4.4), this.bodyMat);
      hull.position.set(0, 0.65, 0);
      hull.castShadow = true;
      this.bodyGroup.add(hull);
      this.bodyMeshParts.push(hull);

      const bullBar = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.14, 0.3), this.neonAccentMat);
      bullBar.position.set(0, 0.38, 2.3);
      this.bodyGroup.add(bullBar);
      this.bodyMeshParts.push(bullBar);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.0), this.canopyMat);
      cab.position.set(0, 1.15, 0.2);
      this.bodyGroup.add(cab);
      this.bodyMeshParts.push(cab);

      const flatbed = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.45, 1.8), this.bodyMat);
      flatbed.position.set(0, 0.85, -1.2);
      this.bodyGroup.add(flatbed);
      this.bodyMeshParts.push(flatbed);
    } else if (id === 'jet') {
      // Phantom Aero Jet (Swept needle wings & delta stabilizers)
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 4.8), this.bodyMat);
      hull.position.set(0, 0.5, 0);
      hull.castShadow = true;
      this.bodyGroup.add(hull);
      this.bodyMeshParts.push(hull);

      const needle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 1.8), this.bodyMat);
      needle.position.set(0, 0.44, 2.6);
      needle.rotation.x = 0.16;
      this.bodyGroup.add(needle);
      this.bodyMeshParts.push(needle);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 2.4), this.canopyMat);
      canopy.position.set(0, 0.88, -0.1);
      this.bodyGroup.add(canopy);
      this.bodyMeshParts.push(canopy);

      // Delta vertical fins
      const finL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.8), this.bodyMat);
      finL.position.set(0.8, 1.25, -2.0);
      finL.rotation.z = -0.2;
      const finR = finL.clone();
      finR.position.x = -0.8;
      finR.rotation.z = 0.2;
      this.bodyGroup.add(finL, finR);
      this.bodyMeshParts.push(finL, finR);
    } else {
      // Cyber Coupe (Default sports wedge)
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.46, 4.3), this.bodyMat);
      hull.position.set(0, 0.52, 0);
      hull.castShadow = true;
      this.bodyGroup.add(hull);
      this.bodyMeshParts.push(hull);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 1.4), this.bodyMat);
      hood.position.set(0, 0.46, 2.15);
      hood.rotation.x = 0.14;
      this.bodyGroup.add(hood);
      this.bodyMeshParts.push(hood);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.46, 2.1), this.canopyMat);
      canopy.position.set(0, 0.94, -0.15);
      this.bodyGroup.add(canopy);
      this.bodyMeshParts.push(canopy);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.08, 0.65), this.bodyMat);
      spoiler.position.set(0, 1.18, -2.15);
      this.bodyGroup.add(spoiler);
      this.bodyMeshParts.push(spoiler);
    }

    // Dynamic Headlights
    this.headlightLeft = new THREE.SpotLight(spec.accentHex, 3.8, 50, Math.PI / 6, 0.4, 1.2);
    this.headlightLeft.position.set(0.72, 0.52, 2.6);
    const targetL = new THREE.Object3D();
    targetL.position.set(0.72, 0, 24);
    this.bodyGroup.add(targetL);
    this.headlightLeft.target = targetL;
    this.bodyGroup.add(this.headlightLeft);

    this.headlightRight = new THREE.SpotLight(spec.accentHex, 3.8, 50, Math.PI / 6, 0.4, 1.2);
    this.headlightRight.position.set(-0.72, 0.52, 2.6);
    const targetR = new THREE.Object3D();
    targetR.position.set(-0.72, 0, 24);
    this.bodyGroup.add(targetR);
    this.headlightRight.target = targetR;
    this.bodyGroup.add(this.headlightRight);

    // Retractable Wings
    const wingW = id === 'jet' ? 3.4 : (id === 'truck' ? 2.5 : 2.8);
    [-1, 1].forEach((side) => {
      const wingAssembly = new THREE.Group();
      wingAssembly.position.set(side * 0.95, 0.68, -0.2);

      const aerofoil = new THREE.Mesh(new THREE.BoxGeometry(wingW, 0.08, 1.45), this.bodyMat);
      aerofoil.position.set(side * (wingW * 0.5), 0, 0);
      wingAssembly.add(aerofoil);
      this.bodyMeshParts.push(aerofoil);

      const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 1.45), this.neonAccentMat);
      winglet.position.set(side * wingW, 0.14, 0);
      wingAssembly.add(winglet);

      wingAssembly.scale.x = 0.01;
      wingAssembly.visible = false;
      this.bodyGroup.add(wingAssembly);
      this.wings.push(wingAssembly);
    });

    // 4 Wheels with Foldable VTOL
    const wheelPositions = [
      { x: 1.15, z: 1.35, isFront: true },
      { x: -1.15, z: 1.35, isFront: true },
      { x: 1.15, z: -1.35, isFront: false },
      { x: -1.15, z: -1.35, isFront: false },
    ];

    wheelPositions.forEach((wp) => {
      const pivotGroup = new THREE.Group();
      pivotGroup.position.set(wp.x, 0.42, wp.z);

      const spinGroup = new THREE.Group();
      pivotGroup.add(spinGroup);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44, 0.44, 0.38, 16).rotateZ(Math.PI / 2),
        tireMat
      );
      spinGroup.add(tire);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.39, 12).rotateZ(Math.PI / 2),
        this.wheelRimMat
      );
      spinGroup.add(rim);

      this.bodyGroup.add(pivotGroup);

      const plumeGeom = new THREE.ConeGeometry(0.32, 1.5, 12);
      plumeGeom.rotateX(Math.PI);
      plumeGeom.translate(0, -0.75, 0);
      const vtolPlume = new THREE.Mesh(plumeGeom, this.vtolMat);
      vtolPlume.position.set(wp.x, 0.35, wp.z);
      vtolPlume.visible = false;
      this.bodyGroup.add(vtolPlume);

      this.wheels.push({
        pivotGroup,
        spinGroup,
        vtolPlume,
        sideX: wp.x > 0 ? 1 : -1,
        isFront: wp.isFront,
      });
    });

    // Rear Jet Thrusters (Quad nozzles for truck, dual for coupe/jet)
    const thrusterOffsets = id === 'truck' ? [-0.75, -0.28, 0.28, 0.75] : [-0.55, 0.55];
    thrusterOffsets.forEach((xPos) => {
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 0.45, 12).rotateX(Math.PI / 2),
        this.bodyMat
      );
      nozzle.position.set(xPos, 0.6, -2.35);
      this.bodyGroup.add(nozzle);
      this.bodyMeshParts.push(nozzle);

      const flameGeom = new THREE.ConeGeometry(0.24, 2.0, 12);
      flameGeom.rotateX(-Math.PI / 2);
      flameGeom.translate(0, 0, -1.0);
      const flame = new THREE.Mesh(flameGeom, this.thrusterMatNormal);
      flame.position.set(xPos, 0.6, -2.55);
      this.bodyGroup.add(flame);
      this.rearThrusters.push(flame);
    });

    // Shield Bubble
    const shieldGeom = new THREE.SphereGeometry(3.0, 14, 10);
    this.shieldBubble = new THREE.Mesh(
      shieldGeom,
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.4 })
    );
    this.shieldBubble.position.set(0, 0.7, 0);
    this.shieldBubble.visible = false;
    this.bodyGroup.add(this.shieldBubble);
  }

  public setMode(newMode: FlightMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    sound.playTransform(newMode === 'flight');

    if (newMode === 'flight') {
      this.isGrounded = false;
      this.verticalSpeed = Math.max(this.verticalSpeed, 8.0);
      this.speedKmh = Math.max(this.speedKmh, 65.0);
    }
  }

  public triggerInvulnerability(seconds: number = 2.0) {
    this.isInvulnerable = true;
    this.invulnerableTimer = seconds;
    this.shieldBubble.visible = true;
  }

  public respawnAtSafeRoad() {
    this.position.copy(this.lastSafePosition);
    this.yaw = this.lastSafeYaw;
    this.pitch = 0;
    this.roll = 0;
    this.speedKmh = 0;
    this.velocity.set(0, 0, 0);
    this.verticalSpeed = 0;
    this.verticalGroundRate = 0;
    this.mode = 'ground';
    this.isGrounded = true;
    this.wingProgress = 0;
    this.triggerInvulnerability(2.0);
    sound.playRespawn();
  }

  public update(
    dt: number,
    input: InputState,
    getGroundFn: (x: number, z: number, y: number) => number
  ) {
    const spec = getVehicleSpec(this.vehicleId);

    // Invulnerability timer & flashing
    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      this.shieldBubble.visible = true;
      this.shieldBubble.rotation.y += dt * 3.5;
      const flash = Math.sin(this.invulnerableTimer * 20) > 0;
      this.bodyMeshParts.forEach((m) => {
        m.visible = flash;
      });
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
        this.shieldBubble.visible = false;
        this.bodyMeshParts.forEach((m) => (m.visible = true));
      }
    }

    // Nitro management
    if (input.nitro && this.nitroAmount > 0 && !this.nitroCooldown) {
      this.isNitroActive = true;
      this.nitroAmount -= 45 * dt;
      if (this.nitroAmount <= 0) {
        this.nitroAmount = 0;
        this.nitroCooldown = true;
      }
    } else {
      this.isNitroActive = false;
      if (this.nitroAmount < this.maxNitro) {
        const rechargeRate = this.nitroCooldown ? 14 : 22;
        this.nitroAmount = Math.min(this.maxNitro, this.nitroAmount + rechargeRate * dt);
        if (this.nitroCooldown && this.nitroAmount >= 35) {
          this.nitroCooldown = false;
        }
      }
    }

    // Physics
    if (this.mode === 'flight') {
      this.updateFlightPhysics(dt, input, getGroundFn, spec.speedMultiplier, spec.flightAgility);
    } else {
      this.updateGroundPhysics(dt, input, getGroundFn, spec.speedMultiplier);
    }

    // Real-time speed calculation
    this.speedKmh = Math.hypot(this.velocity.x, this.velocity.z) * 3.6;

    if (this.isGrounded && this.speedKmh > 5 && this.position.y < 3) {
      this.lastSafePosition.copy(this.position);
      this.lastSafeYaw = this.yaw;
    }

    // Transformations
    const targetWing = this.mode === 'flight' ? 1.0 : 0.0;
    this.wingProgress += (targetWing - this.wingProgress) * Math.min(1, 4.5 * dt);

    this.wings.forEach((w) => {
      w.scale.x = Math.max(0.01, this.wingProgress);
      w.visible = this.wingProgress > 0.02;
    });

    this.wheels.forEach((w) => {
      w.pivotGroup.rotation.z = this.wingProgress * (Math.PI / 2) * w.sideX;
      if (w.isFront && this.wingProgress < 0.2) {
        w.pivotGroup.rotation.y = -input.steerX * 0.48;
      } else {
        w.pivotGroup.rotation.y = 0;
      }
      w.spinGroup.rotation.x += (this.speedKmh / 3.6) * dt * 2.3;

      const showVTOL = this.wingProgress > 0.35;
      w.vtolPlume.visible = showVTOL;
      if (showVTOL) {
        const pulse = 0.8 + this.cushionPower * 1.5 + Math.random() * 0.35;
        w.vtolPlume.scale.set(pulse, pulse * 1.3, pulse);
      }
    });

    this.wheelRimMat.emissive.setRGB(0, this.wingProgress * 0.6, this.wingProgress * 0.9);

    const thrustStrength =
      0.65 +
      input.gas * 0.9 +
      (this.isNitroActive ? 1.7 : 0) +
      (this.mode === 'flight' ? 0.45 : 0);

    this.rearThrusters.forEach((t) => {
      t.scale.z = thrustStrength * (0.85 + Math.random() * 0.4);
      t.material = this.isNitroActive ? this.thrusterMatNitro : this.thrusterMatNormal;
    });

    this.root.position.copy(this.position);
    this.root.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');

    this.shakeAmount = Math.max(0, this.shakeAmount - dt * 2.0);
    this.crashCooldown -= dt;

    sound.updateEngine(
      this.speedKmh,
      this.mode === 'flight',
      this.isNitroActive,
      input.gas > 0 || this.isNitroActive
    );
  }

  private updateGroundPhysics(
    dt: number,
    input: InputState,
    getGroundFn: (x: number, z: number, y: number) => number,
    speedMultiplier: number
  ) {
    const nitroMult = this.isNitroActive ? 2.1 : 1.0;
    const topForwardSpeed = 48.0 * speedMultiplier * (this.isNitroActive ? 1.55 : 1.0);
    const topReverseSpeed = -15.0;

    let forwardV = this.speedKmh / 3.6;

    if (input.gas > 0) {
      forwardV += 32.0 * nitroMult * input.gas * dt;
    }
    if (input.brake > 0) {
      // Wet or slippery roads increase braking distance
      const brakeEfficiency = 0.65 + 0.35 * this.tractionMultiplier;
      if (forwardV > 0.5) {
        forwardV -= 56.0 * brakeEfficiency * input.brake * dt;
      } else {
        forwardV -= 18.0 * brakeEfficiency * input.brake * dt;
      }
    }
    if (input.gas === 0 && input.brake === 0 && this.isGrounded) {
      const rollingDecay = 10.0 * (0.6 + 0.4 * this.tractionMultiplier) * dt;
      if (Math.abs(forwardV) < rollingDecay) {
        forwardV = 0;
      } else {
        forwardV -= Math.sign(forwardV) * rollingDecay;
      }
    }

    forwardV = Math.max(topReverseSpeed, Math.min(topForwardSpeed, forwardV));

    const speedFactor = Math.min(1, Math.abs(forwardV) / 8.0) * (forwardV < 0 ? -1 : 1);
    const highSpeedDamp = 1.0 - 0.32 * Math.min(1, Math.abs(forwardV) / 50.0);
    // Slippery roads allow slightly looser oversteer
    const steerAgility = input.steerX * 2.3 * (1.0 + (1.0 - this.tractionMultiplier) * 0.35);
    this.yaw -= steerAgility * speedFactor * highSpeedDamp * dt;

    const isDrifting = Math.abs(input.steerX) > 0.6 && Math.abs(forwardV) > 26;
    // Base grip scaled directly by procedural weather traction!
    const baseGrip = (isDrifting ? 2.6 : 7.2) * this.tractionMultiplier;
    const gripBlend = 1 - Math.exp(-baseGrip * dt);

    const targetVelX = Math.sin(this.yaw) * forwardV;
    const targetVelZ = Math.cos(this.yaw) * forwardV;
    this.velocity.x += (targetVelX - this.velocity.x) * gripBlend;
    this.velocity.z += (targetVelZ - this.velocity.z) * gripBlend;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const currentGroundY = getGroundFn(this.position.x, this.position.z, this.position.y) + 0.5;

    if (this.isGrounded) {
      if (this.position.y - currentGroundY > 0.8) {
        this.isGrounded = false;
        this.verticalSpeed = Math.max(0, this.verticalGroundRate);
      } else {
        this.verticalGroundRate = (currentGroundY - this.position.y) / Math.max(0.001, dt);
        this.position.y = currentGroundY;
      }
    }

    if (!this.isGrounded) {
      this.verticalSpeed -= 32.0 * dt;
      this.position.y += this.verticalSpeed * dt;
      if (this.position.y <= currentGroundY) {
        this.position.y = currentGroundY;
        this.isGrounded = true;
        this.verticalSpeed = 0;
        this.verticalGroundRate = 0;
      }
    }

    const targetRoll = input.steerX * 0.24 * Math.min(1, Math.abs(forwardV) / 25.0);
    this.roll += (targetRoll - this.roll) * Math.min(1, 9.0 * dt);

    const verticalClimb = this.isGrounded ? this.verticalGroundRate : this.verticalSpeed;
    const targetPitch = -Math.atan2(verticalClimb, Math.max(12, Math.abs(forwardV)));
    this.pitch += (targetPitch - this.pitch) * Math.min(1, 6.5 * dt);
  }

  private updateFlightPhysics(
    dt: number,
    input: InputState,
    getGroundFn: (x: number, z: number, y: number) => number,
    speedMultiplier: number,
    flightAgility: number
  ) {
    const nitroMult = this.isNitroActive ? 1.6 : 1.0;
    const baseAirSpeed = (34.0 + input.gas * 42.0 - input.brake * 18.0) * speedMultiplier;
    const targetAirSpeed = baseAirSpeed * nitroMult;

    let forwardV = this.speedKmh / 3.6;
    forwardV += (targetAirSpeed - forwardV) * Math.min(1, 2.0 * dt);

    this.yaw -= input.steerX * 1.6 * flightAgility * dt;

    let pitchCommand = 0;
    if (input.pitchUp) pitchCommand += 1.0;
    if (input.pitchDown) pitchCommand -= 1.0;
    if (Math.abs(input.steerY) > 0.15) pitchCommand += input.steerY;

    pitchCommand = Math.max(-1, Math.min(1, pitchCommand));

    const targetVertical = pitchCommand * 25.0 * flightAgility;
    this.verticalSpeed += (targetVertical - this.verticalSpeed) * Math.min(1, 3.5 * dt);

    const blendK = 1 - Math.exp(-5.5 * dt);
    const targetVelX = Math.sin(this.yaw) * forwardV;
    const targetVelZ = Math.cos(this.yaw) * forwardV;
    this.velocity.x += (targetVelX - this.velocity.x) * blendK;
    this.velocity.z += (targetVelZ - this.velocity.z) * blendK;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.verticalSpeed * dt;

    const currentGroundY = getGroundFn(this.position.x, this.position.z, this.position.y);
    const altitudeAboveGround = this.position.y - currentGroundY;
    this.cushionPower = 0;
    this.isSoftLanding = false;

    if (altitudeAboveGround < 16.0 && this.verticalSpeed < 0) {
      this.isSoftLanding = true;
      const cushionIntensity = 1.0 - altitudeAboveGround / 16.0;
      this.cushionPower = cushionIntensity;
      const maxDescentRate = -(1.2 + altitudeAboveGround * 0.85);
      this.verticalSpeed = Math.max(this.verticalSpeed, maxDescentRate);
      if (Math.random() < 0.2) {
        sound.playCushion();
      }
    }

    if (altitudeAboveGround <= 1.25) {
      if (pitchCommand < 0 || altitudeAboveGround <= 0.6) {
        this.position.y = currentGroundY + 0.5;
        this.setMode('ground');
        this.isGrounded = true;
        this.verticalSpeed = 0;
        this.verticalGroundRate = 0;
        this.shakeAmount = 0.25;
        sound.playLanding();
        return;
      } else {
        this.position.y = currentGroundY + 1.25;
        if (this.verticalSpeed < 0) this.verticalSpeed = 0;
      }
    }

    if (this.position.y > 290) {
      this.position.y = 290;
      this.verticalSpeed = Math.min(0, this.verticalSpeed);
    }

    const targetRoll = input.steerX * 0.82;
    this.roll += (targetRoll - this.roll) * Math.min(1, 6.0 * dt);

    const targetPitch = -Math.atan2(this.verticalSpeed, Math.max(10, forwardV));
    this.pitch += (targetPitch - this.pitch) * Math.min(1, 6.5 * dt);
  }
}
