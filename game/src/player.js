// Pencuri: jaket cyan terang, cincin hijau di bawah kaki, panah kecil di atas
// kepala — selalu mudah ditemukan di frame. Gerak WASD/panah, tabrakan
// lingkaran vs AABB (tidak pernah menembus meja atau dinding).
import * as THREE from 'three';
import { TUNE, PALETTE, PLAYER_START } from './config.js';
import { resolveCircle } from './geom.js';

export class Player {
  constructor(obstacles, room) {
    this.obstacles = obstacles;
    this.room = room;
    this.x = PLAYER_START.x;
    this.z = PLAYER_START.z;
    this.angle = Math.PI; // menghadap utara (ke dalam kasino)
    this.moving = false;
    this.stepAcc = 0;
    this.group = new THREE.Group();

    // Tubuh: jaket cyan + celana gelap + topi.
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.4, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: PALETTE.playerCyan, roughness: 0.55 }),
    );
    body.position.y = 0.82;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.6 }),
    );
    head.position.y = 1.58;
    head.castShadow = true;
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.3, 0.16, 14),
      new THREE.MeshStandardMaterial({ color: 0x0f2a4a, roughness: 0.5 }),
    );
    hat.position.y = 1.8;
    const mask = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }),
    );
    mask.position.set(0, 1.6, 0.22);
    // Tas loot kecil di punggung.
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.42, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x6b4a1f, roughness: 0.8 }),
    );
    bag.position.set(0, 1.0, -0.42);
    this.group.add(body, head, hat, mask, bag);

    // Cincin hijau terang di lantai + panah di atas kepala.
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.66, 28),
      new THREE.MeshBasicMaterial({ color: 0x2bff88, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.05;
    this.group.add(this.ring);
    this.arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0x2bff88 }),
    );
    this.arrow.position.y = 2.35;
    this.arrow.rotation.x = Math.PI; // ujung ke bawah
    this.group.add(this.arrow);

    this.group.position.set(this.x, 0, this.z);
  }

  // Gerak dari vektor input ternormalisasi; kembalikan true bila melangkah.
  move(mx, mz, dt, onStep) {
    this.moving = mx !== 0 || mz !== 0;
    if (!this.moving) return;
    const speed = TUNE.playerSpeed;
    const nx = this.x + mx * speed * dt;
    const nz = this.z + mz * speed * dt;
    const fixed = resolveCircle(nx, nz, TUNE.playerRadius, this.obstacles, this.room);
    this.x = fixed.x;
    this.z = fixed.z;
    this.angle = Math.atan2(mz, mx);
    this.stepAcc += speed * dt;
    if (this.stepAcc > 1.6) {
      this.stepAcc = 0;
      if (onStep) onStep();
    }
    this.group.position.set(this.x, 0, this.z);
    // Hadapkan badan ke arah gerak.
    this.group.rotation.y = -this.angle + Math.PI / 2;
  }

  // Teleport (saat ketahuan): kembali ke pintu masuk.
  teleport(x, z) {
    this.x = x;
    this.z = z;
    this.group.position.set(this.x, 0, this.z);
  }

  updateVisual(time) {
    // Cincin berdenyut lembut; panah melayang.
    const pulse = 1 + Math.sin(time * 4) * 0.08;
    this.ring.scale.set(pulse, pulse, 1);
    this.arrow.position.y = 2.35 + Math.sin(time * 3) * 0.08;
    this.arrow.rotation.y = time * 1.5;
  }

  reset() {
    this.x = PLAYER_START.x;
    this.z = PLAYER_START.z;
    this.angle = Math.PI;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = 0;
  }
}
