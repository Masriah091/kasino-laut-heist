// Kamera CCTV: terpasang di dinding, menyapu lantai dengan kerucut yang
// berayun. Bila pemain masuk kerucut + line-of-sight, alarm naik langsung.
import * as THREE from 'three';
import { TUNE } from './config.js';
import { pointInCone, hasLineOfSight } from './geom.js';

function makeSectorGeometry(halfAngle, range, segments = 18) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= segments; i += 1) {
    const a = -halfAngle + (2 * halfAngle * i) / segments;
    shape.lineTo(Math.cos(a) * range, Math.sin(a) * range);
  }
  shape.lineTo(0, 0);
  const geo = new THREE.ShapeGeometry(shape, 12);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export class CCTV {
  constructor(def, obstacles) {
    this.name = def.name;
    this.x = def.x;
    this.z = def.z;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.range = def.range;
    this.obstacles = obstacles;
    this.angle = def.baseAngle;
    this.phase = Math.random() * Math.PI * 2;
    this.seesPlayer = false;
    this.group = new THREE.Group();

    // Dudukan + kepala kamera di dinding.
    const mount = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.4 }),
    );
    mount.position.set(0, 4.4, 0);
    mount.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4, metalness: 0.6 }),
    );
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 4.2, 0.4);
    head.castShadow = true;
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a }),
    );
    lens.position.set(0, 4.2, 0.76);
    this.lens = lens;
    this.head = head;
    this.group.add(mount, head, lens);

    // Kerucut sapuan di lantai + garis sorot.
    this.coneMat = new THREE.MeshBasicMaterial({
      color: 0x3ec6ff, transparent: true, opacity: 0.2,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.cone = new THREE.Mesh(makeSectorGeometry(TUNE.cameraHalfAngle, this.range), this.coneMat);
    this.cone.position.y = 0.05;
    this.group.add(this.cone);

    this.group.position.set(this.x, 0, this.z);
  }

  update(dt, time, player, crowdBlockers) {
    // Ayunan sinus yang halus.
    this.angle = this.baseAngle + Math.sin(time * 0.55 + this.phase) * this.sweep;
    const check = pointInCone(player.x, player.z, this.x, this.z, this.angle, this.range, TUNE.cameraHalfAngle);
    this.seesPlayer = check.inside
      && hasLineOfSight(this.x, this.z, player.x, player.z, this.obstacles, crowdBlockers);
    this.coneMat.color.setHex(this.seesPlayer ? 0xff2a1a : 0x3ec6ff);
    this.coneMat.opacity = this.seesPlayer ? 0.38 : 0.18;
    this.lens.material.color.setHex(this.seesPlayer ? 0xff2a1a : 0x3ec6ff);
    this.cone.rotation.y = -this.angle;
    // Kepala kamera menoleh mengikuti sapuan.
    this.head.rotation.y = 0;
    this.head.rotation.z = 0;
    this.head.rotation.order = 'YXZ';
    this.head.rotation.y = Math.PI / 2 - this.angle;
    this.head.rotation.x = Math.PI / 2 + 0.35; // menunduk ke lantai
    this.lens.position.set(
      Math.cos(this.angle) * 0.75, 4.05, Math.sin(this.angle) * 0.75,
    );
  }

  reset() {
    this.seesPlayer = false;
    this.angle = this.baseAngle;
  }
}
