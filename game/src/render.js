// Renderer: scene Three.js (kamera oblique, cahaya bulan + lampu emas,
// bayangan), HUD DOM, minimap 2D, dan layar title/win/lose.
import * as THREE from 'three';
import { ROOM, TUNE, EXIT } from './config.js';
import { GUARD_STATE } from './guards.js';
import { buildLevel } from './level.js';
import { SCREEN } from './world.js';

const GUARD_STATE_LABEL = {
  [GUARD_STATE.PATROL]: 'Patroli',
  [GUARD_STATE.SUSPICIOUS]: 'Curiga ?',
  [GUARD_STATE.ALERT]: 'MENGEJAR !',
  [GUARD_STATE.SEARCH]: 'Mencari…',
};

export class Renderer {
  constructor(world) {
    this.world = world;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a18);
    this.scene.fog = new THREE.Fog(0x060a18, 38, 70);

    this.camera = new THREE.PerspectiveCamera(50, 1280 / 800, 0.1, 120);
    this.camera.position.set(0, 23, 13.5);
    this.camera.lookAt(0, 0, -1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(1280, 800);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.id = 'gl';
    document.getElementById('stage').appendChild(this.renderer.domElement);

    // --- Cahaya: bulan + ambient + lampu gantung emas + teal bar ---
    this.scene.add(new THREE.AmbientLight(0x334466, 0.85));
    const moon = new THREE.DirectionalLight(0x9fc4ff, 1.5);
    moon.position.set(-6, 20, -16);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -22;
    moon.shadow.camera.right = 22;
    moon.shadow.camera.top = 16;
    moon.shadow.camera.bottom = -16;
    moon.shadow.camera.far = 60;
    moon.shadow.bias = -0.0004;
    this.scene.add(moon);
    this.chandelierLights = [];
    for (const [cx, cz] of [[-8, -4], [8, -4], [0, 5]]) {
      const pl = new THREE.PointLight(0xffd76a, 60, 20, 1.9);
      pl.position.set(cx, 3.4, cz);
      this.scene.add(pl);
      this.chandelierLights.push(pl);
    }
    const teal = new THREE.PointLight(0x19e3d6, 40, 16, 1.9);
    teal.position.set(14, 3, 3);
    this.scene.add(teal);
    // Lampu alarm merah — menyala saat alarm tinggi.
    this.alarmLight = new THREE.PointLight(0xff2a1a, 0, 26, 1.6);
    this.alarmLight.position.set(0, 5, 0);
    this.scene.add(this.alarmLight);

    // --- Level + aktor ---
    const level = buildLevel();
    this.level = level;
    this.scene.add(level.group);
    world.attachLevel(level.obstacles);
    this.scene.add(world.player.group);
    for (const g of world.guards) this.scene.add(g.group);
    for (const c of world.cameras) this.scene.add(c.group);
    world.loot.addTo(this.scene);
    world.crowd.addTo(this.scene);

    // Drone: badan + 4 rotor + kerucut sorot di lantai.
    this.droneGroup = new THREE.Group();
    const droneBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.4, metalness: 0.6 }),
    );
    droneBody.castShadow = true;
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a }),
    );
    eye.position.set(0, 0, 0.36);
    this.droneGroup.add(droneBody, eye);
    this.rotors = [];
    for (const [rx, rz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
      const rotor = new THREE.Mesh(
        new THREE.CircleGeometry(0.3, 12),
        new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
      );
      rotor.rotation.x = -Math.PI / 2;
      rotor.position.set(rx, 0.14, rz);
      this.droneGroup.add(rotor);
      this.rotors.push(rotor);
    }
    this.scene.add(this.droneGroup);
    this.droneCone = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.droneCone.rotation.x = -Math.PI / 2;
    this.droneCone.position.y = 0.05;
    this.scene.add(this.droneCone);

    // Chip pengalih yang tergeletak (muncul saat Q ditekan).
    this.decoyChip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.08, 18),
      new THREE.MeshStandardMaterial({ color: 0xffd76a, metalness: 0.9, roughness: 0.2, emissive: 0x8a6a00, emissiveIntensity: 0.6 }),
    );
    this.decoyChip.position.y = 0.05;
    this.decoyChip.visible = false;
    this.scene.add(this.decoyChip);

    // HUD.
    this.el = {
      hud: document.getElementById('hud'),
      loot: document.getElementById('hud-loot'),
      time: document.getElementById('hud-time'),
      decoy: document.getElementById('hud-decoy'),
      alarmFill: document.getElementById('alarm-fill'),
      alarmText: document.getElementById('alarm-text'),
      guards: document.getElementById('hud-guards'),
      banner: document.getElementById('hud-banner'),
      prompt: document.getElementById('hud-prompt'),
      blend: document.getElementById('hud-blend'),
      minimap: document.getElementById('minimap'),
      title: document.getElementById('screen-title'),
      win: document.getElementById('screen-win'),
      lose: document.getElementById('screen-lose'),
      winStats: document.getElementById('win-stats'),
      winGrade: document.getElementById('win-grade'),
      loseStats: document.getElementById('lose-stats'),
    };
    this.mm = this.el.minimap.getContext('2d');
    this.lastScreen = null;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.renderer.setSize(w, h);
  }

  // Satu frame: sinkronkan visual dari state dunia + gambar HUD/minimap.
  render() {
    const world = this.world;
    const time = world.time;

    // Kamera: oblique yang meliput seluruh ruangan + oleng kapal.
    const sway = world.sway.angles();
    const px = world.player.x;
    const pz = world.player.z;
    this.camera.position.set(px * 0.12, 23, 13.5 + pz * 0.05);
    this.camera.lookAt(px * 0.1, 0, -1 + pz * 0.04);
    this.camera.rotation.z += sway.roll;
    this.camera.rotation.x += sway.pitch * 0.4;

    // Lampu gantung bergoyang mengikuti kapal.
    const chandAngle = world.sway.chandelierAngle();
    for (const ch of this.level.chandeliers) {
      ch.rotation.z = chandAngle;
      ch.rotation.x = chandAngle * 0.6;
    }
    // Lampu alarm berdenyut saat alarm tinggi.
    this.alarmLight.intensity = world.alarm > 55
      ? 60 + Math.sin(time * 6) * 40
      : 0;

    // Drone mengikuti state + rotor berputar.
    const d = world.drone;
    this.droneGroup.position.set(d.x, d.height + Math.sin(time * 2) * 0.15, d.z);
    for (const r of this.rotors) r.rotation.z = time * 40;
    this.droneCone.position.set(d.x, 0.05, d.z);
    this.droneCone.material.color.setHex(d.seesPlayer ? 0xff2a1a : 0xffd34d);
    this.droneCone.material.opacity = d.seesPlayer ? 0.3 : 0.12;

    // Chip pengalih.
    if (world.decoyPos && world.decoyPos.timer > 0) {
      this.decoyChip.visible = true;
      this.decoyChip.position.set(world.decoyPos.x, 0.05, world.decoyPos.z);
      this.decoyChip.rotation.y = time * 3;
    } else {
      this.decoyChip.visible = false;
    }

    // Tanda ? / ! menghadap kamera.
    for (const g of world.guards) {
      if (g.mark.visible) g.mark.lookAt(this.camera.position);
    }
    world.player.updateVisual(time);

    this.updateHud();
    this.drawMinimap();
    this.updateScreens();
    this.renderer.render(this.scene, this.camera);
  }

  updateHud() {
    const world = this.world;
    const inPlay = world.screen === SCREEN.PLAY;
    this.el.hud.style.display = inPlay ? 'block' : 'none';
    if (!inPlay) return;
    this.el.loot.textContent = `◆ ${world.loot.count()}/${TUNE.lootNeeded} Jackpot`;
    const mins = Math.floor(world.playTime / 60);
    const secs = Math.floor(world.playTime % 60);
    this.el.time.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    this.el.decoy.textContent = `◉ Chip pengalih: ${world.decoys}`;
    const alarm = Math.round(world.alarm);
    this.el.alarmFill.style.width = `${alarm}%`;
    this.el.alarmFill.style.background = alarm >= 70 ? '#ff2a1a' : alarm >= 40 ? '#ff8c1a' : '#ffd34d';
    this.el.alarmText.textContent = alarm >= 70 ? 'TERLIHAT!' : alarm >= 40 ? 'WASPADA' : 'AMAN';
    // Status tiap penjaga + drone + CCTV.
    const parts = world.guards.map((g) => {
      const label = GUARD_STATE_LABEL[g.state];
      const hot = g.state === GUARD_STATE.ALERT || g.state === GUARD_STATE.SUSPICIOUS;
      return `<span style="color:${hot ? '#ff6b5e' : '#cfe3ff'}">${g.name} ${label}</span>`;
    });
    parts.push(`<span style="color:${world.drone.seesPlayer ? '#ff6b5e' : '#cfe3ff'}">Drone ${world.drone.seesPlayer ? 'MELIHAT!' : 'Patroli'}</span>`);
    const camHot = world.cameras.some((c) => c.seesPlayer);
    parts.push(`<span style="color:${camHot ? '#ff6b5e' : '#cfe3ff'}">CCTV ${camHot ? 'MEREKAM!' : 'Menyapu'}</span>`);
    this.el.guards.innerHTML = parts.join(' · ');
    // Banner pesan.
    if (world.messageTimer > 0) {
      this.el.banner.style.display = 'block';
      this.el.banner.textContent = world.message;
    } else {
      this.el.banner.style.display = 'none';
    }
    // Prompt ambil loot.
    const near = world.loot.nearestInReach(world.player.x, world.player.z);
    if (near) {
      this.el.prompt.style.display = 'block';
      this.el.prompt.textContent = `Tekan E — ambil ${near.name}`;
    } else {
      this.el.prompt.style.display = 'none';
    }
    // Indikator berbaur.
    this.el.blend.style.display = world.blending ? 'block' : 'none';
  }

  drawMinimap() {
    const g = this.mm;
    const W = 220;
    const H = 150;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(6,12,28,0.85)';
    g.fillRect(0, 0, W, H);
    const sx = W / (ROOM.maxX - ROOM.minX);
    const sz = H / (ROOM.maxZ - ROOM.minZ);
    const X = (x) => (x - ROOM.minX) * sx;
    const Z = (z) => (z - ROOM.minZ) * sz;
    // Rintangan.
    g.fillStyle = '#d4af37';
    for (const o of this.world.obstacles) {
      g.fillRect(X(o.x - o.hx), Z(o.z - o.hz), o.hx * 2 * sx, o.hz * 2 * sz);
    }
    // EXIT.
    g.fillStyle = '#2bff88';
    g.fillRect(X(EXIT.x - 1.2), Z(EXIT.z - 1.4), 2.4 * sx, 1.4 * sz);
    // Loot.
    for (const item of this.world.loot.items) {
      if (item.taken) continue;
      g.fillStyle = '#ffd76a';
      g.beginPath();
      g.arc(X(item.x), Z(item.z), 4, 0, Math.PI * 2);
      g.fill();
    }
    // Kerucut penjaga.
    for (const gd of this.world.guards) {
      const col = gd.state === GUARD_STATE.ALERT ? 'rgba(255,42,26,0.5)'
        : gd.state === GUARD_STATE.PATROL ? 'rgba(255,211,77,0.4)' : 'rgba(255,140,26,0.5)';
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(X(gd.x), Z(gd.z));
      g.arc(X(gd.x), Z(gd.z), TUNE.guardVisionRange * sx, gd.angle - TUNE.guardHalfAngle, gd.angle + TUNE.guardHalfAngle);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(X(gd.x), Z(gd.z), 3, 0, Math.PI * 2);
      g.fill();
    }
    // CCTV.
    g.fillStyle = '#3ec6ff';
    for (const c of this.world.cameras) {
      g.beginPath();
      g.arc(X(c.x), Z(c.z), 3.5, 0, Math.PI * 2);
      g.fill();
    }
    // Drone.
    g.strokeStyle = '#ff8fd8';
    g.beginPath();
    g.arc(X(this.world.drone.x), Z(this.world.drone.z), this.world.drone.range * sx, 0, Math.PI * 2);
    g.stroke();
    // Pemain.
    g.fillStyle = '#19e3d6';
    g.beginPath();
    g.arc(X(this.world.player.x), Z(this.world.player.z), 4.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2bff88';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(X(this.world.player.x), Z(this.world.player.z), 7, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1;
  }

  updateScreens() {
    const world = this.world;
    if (world.screen === this.lastScreen) return;
    this.lastScreen = world.screen;
    this.el.title.style.display = world.screen === SCREEN.TITLE ? 'flex' : 'none';
    this.el.win.style.display = world.screen === SCREEN.WIN ? 'flex' : 'none';
    this.el.lose.style.display = world.screen === SCREEN.LOSE ? 'flex' : 'none';
    if (world.screen === SCREEN.WIN && world.winStats) {
      const s = world.winStats;
      const mins = Math.floor(s.seconds / 60);
      const secs = Math.floor(s.seconds % 60);
      this.el.winGrade.textContent = `GRADE ${s.grade}`;
      this.el.winStats.textContent =
        `Waktu ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} · `
        + `Ketahuan ${s.caught}x · Loot ${s.loot}/3 · Strike ${s.strikes}`;
    }
    if (world.screen === SCREEN.LOSE) {
      this.el.loseStats.textContent =
        `Strike ${world.strikes}/${TUNE.strikesToLose} · Loot ${world.loot.count()}/3 · `
        + `Waktu ${Math.floor(world.playTime)} dtk`;
    }
  }
}
