// Kerumunan kasino: tamu-tamu yang mondar-mandir antar meja. Mereka cover
// bergerak — menghalangi line-of-sight penjaga, dan berdiri dekat mereka
// membuat pemain "berbaur" (deteksi melambat).
import * as THREE from 'three';
import { makeRng } from './rng.js';
import { GUEST_SPOTS, PALETTE } from './config.js';

export class Guest {
  constructor(rng, index) {
    this.color = PALETTE.guestColors[index % PALETTE.guestColors.length];
    const spot = GUEST_SPOTS[index % GUEST_SPOTS.length];
    this.x = spot[0] + (rng() - 0.5) * 1.5;
    this.z = spot[1] + (rng() - 0.5) * 1.5;
    this.target = { x: this.x, z: this.z };
    this.speed = 0.7 + rng() * 0.6;
    this.wait = rng() * 3;
    this.r = 0.42; // radius penghalang line-of-sight
    this.phase = rng() * Math.PI * 2;

    this.group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.38, 1.05, 10),
      new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.8 }),
    );
    body.position.y = 0.8;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.6 }),
    );
    head.position.y = 1.5;
    head.castShadow = true;
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.28, 0.1, 12),
      new THREE.MeshStandardMaterial({ color: 0x1b2f5e, roughness: 0.6 }),
    );
    hat.position.y = 1.7;
    this.group.add(body, head, hat);
    this.group.position.set(this.x, 0, this.z);
  }

  update(dt, rng, obstacles) {
    if (this.wait > 0) {
      this.wait -= dt;
      // Goyang ringan seperti orang mengobrol.
      this.group.position.y = Math.sin(performance.now() / 500 + this.phase) * 0.01;
      return;
    }
    const dx = this.target.x - this.x;
    const dz = this.target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.2) {
      // Pilih titik kumpul baru.
      const spot = GUEST_SPOTS[Math.floor(rng() * GUEST_SPOTS.length)];
      this.target = { x: spot[0] + (rng() - 0.5) * 2, z: spot[1] + (rng() - 0.5) * 2 };
      this.wait = 1.5 + rng() * 4;
      return;
    }
    const step = Math.min(dist, this.speed * dt);
    const nx = this.x + (dx / dist) * step;
    const nz = this.z + (dz / dist) * step;
    const blocked = obstacles.some((o) => (
      nx > o.x - o.hx - 0.4 && nx < o.x + o.hx + 0.4
      && nz > o.z - o.hz - 0.4 && nz < o.z + o.hz + 0.4
    ));
    if (!blocked) {
      this.x = nx;
      this.z = nz;
    } else {
      this.wait = 1;
    }
    this.group.position.set(this.x, 0, this.z);
    // Ayunan jalan kecil.
    this.group.position.y = Math.abs(Math.sin(performance.now() / 220 + this.phase)) * 0.04;
  }
}

export class Crowd {
  constructor(seed) {
    const rng = makeRng(seed);
    this.guests = [];
    for (let i = 0; i < 8; i += 1) this.guests.push(new Guest(rng, i));
    this.rng = rng;
  }

  update(dt, obstacles) {
    for (const g of this.guests) g.update(dt, this.rng, obstacles);
  }

  // Lingkaran penghalang untuk line-of-sight.
  blockers() {
    return this.guests.map((g) => ({ x: g.x, z: g.z, r: g.r }));
  }

  // Apakah pemain sedang berbaur (dekat tamu)?
  blendingWith(playerX, playerZ, radius) {
    for (const g of this.guests) {
      if (Math.hypot(g.x - playerX, g.z - playerZ) < radius) return true;
    }
    return false;
  }

  addTo(scene) {
    for (const g of this.guests) scene.add(g.group);
  }
}
