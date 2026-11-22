// Sekuriti kasino: patroli → curiga (?) → kejar (!) → cari → patroli.
// Kerucut visi bervolume (sektor datar + sorot 3D) berubah warna per state.
import * as THREE from 'three';
import { TUNE } from './config.js';
import { pointInCone, hasLineOfSight } from './geom.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERT: 'alert',
  SEARCH: 'search',
};

const STATE_COLOR = {
  [GUARD_STATE.PATROL]: 0xffd34d, // kuning
  [GUARD_STATE.SUSPICIOUS]: 0xff8c1a, // oranye
  [GUARD_STATE.ALERT]: 0xff2a1a, // merah
  [GUARD_STATE.SEARCH]: 0xff8c1a,
};

// Geometri sektor kerucut di lantai (radius 1, sudut penuh disesuaikan skala).
function makeSectorGeometry(halfAngle, range, segments = 18) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= segments; i += 1) {
    const a = -halfAngle + (2 * halfAngle * i) / segments;
    shape.lineTo(Math.cos(a) * range, Math.sin(a) * range);
  }
  shape.lineTo(0, 0);
  const geo = new THREE.ShapeGeometry(shape, 12);
  geo.rotateX(-Math.PI / 2); // rebahkan ke bidang XZ
  return geo;
}

export class Guard {
  constructor(def, obstacles) {
    this.name = def.name;
    this.color = def.color;
    this.waypoints = def.waypoints;
    this.obstacles = obstacles;
    this.x = def.waypoints[0][0];
    this.z = def.waypoints[0][1];
    this.wpIndex = 1;
    this.angle = 0;
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.lastSeen = { x: this.x, z: this.z };
    this.speed = TUNE.guardPatrolSpeed;
    this.seesPlayer = false;
    this.investigate = null; // {x, z, timer} dari pengalih chip
    this.group = new THREE.Group();

    // Tubuh: seragam navy + topi + lencana emas.
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.15, 12), bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.6 }),
    );
    head.position.y = 1.62;
    head.castShadow = true;
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.32, 0.14, 14),
      new THREE.MeshStandardMaterial({ color: 0x101828, roughness: 0.5 }),
    );
    hat.position.y = 1.84;
    hat.castShadow = true;
    const badge = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd76a, metalness: 0.8, roughness: 0.3 }),
    );
    badge.position.set(0, 1.15, 0.42);
    // Kemeja putih di dada + cincin lantai pucat — penjaga harus terbaca
    // dari jauh di atas karpet gelap.
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.5, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xf2f0e6, roughness: 0.7 }),
    );
    shirt.position.set(0, 1.02, 0.38);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.62, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    // Senter kecil di tangan.
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
    );
    lamp.position.set(0.3, 1.0, 0.45);
    this.group.add(body, head, hat, badge, lamp, shirt, ring);

    // Kerucut visi: sektor datar + inti yang lebih terang (kesan bervolume).
    this.coneMat = new THREE.MeshBasicMaterial({
      color: STATE_COLOR.PATROL, transparent: true, opacity: 0.30,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.cone = new THREE.Mesh(
      makeSectorGeometry(TUNE.guardHalfAngle, TUNE.guardVisionRange),
      this.coneMat,
    );
    this.cone.position.y = 0.06;
    this.group.add(this.cone);
    this.beamMat = new THREE.MeshBasicMaterial({
      color: STATE_COLOR.PATROL, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.beam = new THREE.Mesh(
      makeSectorGeometry(TUNE.guardHalfAngle * 0.55, TUNE.guardVisionRange * 0.92),
      this.beamMat,
    );
    this.beam.position.y = 0.08;
    this.group.add(this.beam);

    // Tanda ? / ! di atas kepala.
    this.mark = this.makeMark('?');
    this.mark.position.y = 2.35;
    this.mark.visible = false;
    this.group.add(this.mark);

    this.group.position.set(this.x, 0, this.z);
  }

  makeMark(char) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ff2a1a';
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(char, 32, 34);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), mat);
    mesh.userData.canvas = c;
    mesh.userData.char = char;
    return mesh;
  }

  setMark(char) {
    if (this.mark.userData.char === char) return;
    const g = this.mark.userData.canvas.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = char === '!' ? '#ff2a1a' : '#ff8c1a';
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(char, 32, 34);
    this.mark.material.map.needsUpdate = true;
    this.mark.userData.char = char;
  }

  // Apakah penjaga ini melihat pemain sekarang (cone + LOS, tamu menghalangi)?
  canSee(player, crowdBlockers) {
    const check = pointInCone(player.x, player.z, this.x, this.z, this.angle, TUNE.guardVisionRange, TUNE.guardHalfAngle);
    if (!check.inside) return { sees: false, dist: check.dist };
    if (!hasLineOfSight(this.x, this.z, player.x, player.z, this.obstacles, crowdBlockers)) {
      return { sees: false, dist: check.dist };
    }
    return { sees: true, dist: check.dist };
  }

  // Bergerak menuju target dengan kecepatan `speed`, tanpa menembus rintangan.
  moveToward(tx, tz, speed, dt) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const nz = this.z + (dz / dist) * step;
    // Jangan masuk ke dalam rintangan: geser sepanjang sumbu yang bebas.
    const blocked = (x, z) => this.obstacles.some((o) => (
      x > o.x - o.hx - 0.4 && x < o.x + o.hx + 0.4
      && z > o.z - o.hz - 0.4 && z < o.z + o.hz + 0.4
    ));
    if (!blocked(nx, nz)) {
      this.x = nx;
      this.z = nz;
    } else if (!blocked(nx, this.z)) {
      this.x = nx;
    } else if (!blocked(this.x, nz)) {
      this.z = nz;
    }
    this.angle = Math.atan2(dz, dx);
    return dist <= step + 0.05;
  }

  update(dt, player, crowdBlockers, blendFactor) {
    const seen = this.canSee(player, crowdBlockers);
    this.seesPlayer = seen.sees;
    const prevState = this.state;

    if (seen.sees) {
      this.lastSeen = { x: player.x, z: player.z };
      this.loseSightTimer = 0;
      // Semakin dekat semakin cepat curiga; berbaur di kerumunan memperlambat.
      const closeness = 1.25 - (seen.dist / TUNE.guardVisionRange);
      this.suspicion += TUNE.suspicionRise * Math.max(0.25, closeness) * blendFactor * dt;
      if (this.suspicion >= 1) {
        this.state = GUARD_STATE.ALERT;
        this.suspicion = 1;
      } else if (this.suspicion > 0.25) {
        if (this.state === GUARD_STATE.PATROL) this.state = GUARD_STATE.SUSPICIOUS;
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - TUNE.suspicionFall * dt);
      if (this.state === GUARD_STATE.ALERT) {
        this.loseSightTimer += dt;
        if (this.loseSightTimer >= TUNE.alertLoseSightSeconds) {
          this.state = GUARD_STATE.SEARCH;
          this.searchTimer = TUNE.searchSeconds;
        }
      } else if (this.state === GUARD_STATE.SUSPICIOUS && this.suspicion <= 0.05) {
        this.state = GUARD_STATE.PATROL;
      }
    }

    // Pengalih chip: pergi memeriksa titik lemparan.
    if (this.investigate) {
      this.investigate.timer -= dt;
      const arrived = this.moveToward(this.investigate.x, this.investigate.z, TUNE.guardSearchSpeed, dt);
      if (arrived || this.investigate.timer <= 0) this.investigate = null;
      if (this.state !== GUARD_STATE.ALERT) this.state = GUARD_STATE.SEARCH;
    } else if (this.state === GUARD_STATE.ALERT) {
      this.moveToward(player.x, player.z, TUNE.guardChaseSpeed, dt);
    } else if (this.state === GUARD_STATE.SEARCH) {
      this.searchTimer -= dt;
      const arrived = this.moveToward(this.lastSeen.x, this.lastSeen.z, TUNE.guardSearchSpeed, dt);
      if (arrived) {
        // Menoleh ke sekitar sebelum menyerah.
        this.angle += dt * 1.6;
      }
      if (this.searchTimer <= 0) {
        this.state = GUARD_STATE.PATROL;
        this.suspicion = 0;
      }
    } else {
      // Patroli: ikuti waypoint, berhenti sejenak di tiap titik.
      const target = this.waypoints[this.wpIndex];
      const arrived = this.moveToward(target[0], target[1], TUNE.guardPatrolSpeed, dt);
      if (arrived) {
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        this.angle = Math.atan2(
          this.waypoints[this.wpIndex][1] - this.z,
          this.waypoints[this.wpIndex][0] - this.x,
        );
      }
    }

    // Visual: warna cone + tanda mengikuti state.
    const color = STATE_COLOR[this.state];
    this.coneMat.color.setHex(color);
    this.beamMat.color.setHex(color);
    const alert = this.state === GUARD_STATE.ALERT;
    this.coneMat.opacity = alert ? 0.42 : 0.3;
    this.mark.visible = this.state === GUARD_STATE.SUSPICIOUS || alert || this.state === GUARD_STATE.SEARCH;
    if (this.mark.visible) this.setMark(alert ? '!' : '?');
    if (prevState !== this.state) {
      this.suspicion = this.state === GUARD_STATE.PATROL ? 0 : this.suspicion;
    }

    this.group.position.set(this.x, 0, this.z);
    // Kerucut menghadap arah pandang: geometri sektor dibuat menghadap +X,
    // dan rotasi Y sebesar -angle memetakan +X ke arah (cos angle, sin angle).
    this.cone.rotation.y = -this.angle;
    this.beam.rotation.y = -this.angle;
    // Tanda ? / ! selalu menghadap kamera — diurus render.js tiap frame.
  }

  reset() {
    this.x = this.waypoints[0][0];
    this.z = this.waypoints[0][1];
    this.wpIndex = 1;
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.investigate = null;
    this.seesPlayer = false;
    this.angle = Math.atan2(
      this.waypoints[1][1] - this.z,
      this.waypoints[1][0] - this.x,
    );
    this.group.position.set(this.x, 0, this.z);
  }
}
