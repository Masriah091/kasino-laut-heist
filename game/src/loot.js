// Tiga loot jackpot: Chip Emas, Jam Saku, Kalung Berlian.
// Masing-masing berdenyut emas di atas alasnya; E mengambil saat dekat.
import * as THREE from 'three';
import { LOOT, TUNE } from './config.js';

export class LootItem {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.x = def.x;
    this.z = def.z;
    this.color = def.color;
    this.taken = false;
    this.group = new THREE.Group();

    // Alas marmer kecil.
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xd8c98a, roughness: 0.5 }),
    );
    pedestal.position.y = 0.25;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    this.group.add(pedestal);

    // Bentuk per loot.
    if (def.id === 'chip') {
      for (let i = 0; i < 5; i += 1) {
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.26, 0.07, 18),
          new THREE.MeshStandardMaterial({
            color: i % 2 ? 0xd43d3d : 0xffd76a, metalness: 0.8, roughness: 0.25,
            emissive: 0x8a6a00, emissiveIntensity: 0.4,
          }),
        );
        chip.position.y = 0.55 + i * 0.075;
        chip.castShadow = true;
        this.group.add(chip);
      }
      this.spin = this.group.children[5]; // chip teratas
    } else if (def.id === 'jam') {
      const watch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.1, 20),
        new THREE.MeshStandardMaterial({
          color: 0xffd76a, metalness: 0.9, roughness: 0.2,
          emissive: 0x6a4a00, emissiveIntensity: 0.5,
        }),
      );
      watch.rotation.x = Math.PI / 2.4;
      watch.position.y = 0.75;
      watch.castShadow = true;
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.24, 20),
        new THREE.MeshBasicMaterial({ color: 0xeaf6ff }),
      );
      face.position.set(0, 0.83, 0.14);
      face.rotation.x = -Math.PI / 2.4 + Math.PI / 2;
      this.group.add(watch, face);
      this.spin = watch;
    } else {
      // Kalung: torus emas + permata merah muda berdenyut.
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.07, 10, 24),
        new THREE.MeshStandardMaterial({ color: 0xffd76a, metalness: 0.9, roughness: 0.2, emissive: 0x6a4a00, emissiveIntensity: 0.5 }),
      );
      band.position.y = 0.85;
      band.rotation.x = Math.PI / 2.6;
      band.castShadow = true;
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22),
        new THREE.MeshStandardMaterial({ color: 0xff8fd8, emissive: 0xff4fa8, emissiveIntensity: 1.4, roughness: 0.1, metalness: 0.3 }),
      );
      gem.position.y = 0.62;
      this.group.add(band, gem);
      this.spin = gem;
    }

    // Cahaya sorot + cincin penanda di lantai.
    this.light = new THREE.PointLight(def.color, 12, 6, 1.8);
    this.light.position.set(0, 1.6, 0);
    this.group.add(this.light);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.05, 28),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;
    this.group.add(this.ring);

    this.group.position.set(def.x, 0, def.z);
  }

  update(time) {
    if (this.taken) return;
    if (this.spin) this.spin.rotation.y = time * 1.4;
    this.ring.scale.setScalar(1 + Math.sin(time * 2.2) * 0.07);
    this.light.intensity = 10 + Math.sin(time * 2.2) * 3;
  }

  take() {
    this.taken = true;
    this.group.visible = false;
  }

  reset() {
    this.taken = false;
    this.group.visible = true;
  }
}

export class Loot {
  constructor() {
    this.items = LOOT.map((d) => new LootItem(d));
  }

  count() {
    return this.items.filter((i) => i.taken).length;
  }

  // Loot terdekat yang belum diambil dalam radius ambil.
  nearestInReach(x, z) {
    let best = null;
    let bestDist = TUNE.pickupRadius;
    for (const item of this.items) {
      if (item.taken) continue;
      const d = Math.hypot(item.x - x, item.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = item;
      }
    }
    return best;
  }

  update(time) {
    for (const item of this.items) item.update(time);
  }

  addTo(scene) {
    for (const item of this.items) scene.add(item.group);
  }

  reset() {
    for (const item of this.items) item.reset();
  }
}
