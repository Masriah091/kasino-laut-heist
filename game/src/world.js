// Dunia game: state (title/play/win/lose), alarm, strike, pengalih chip,
// dan autopilot A* yang memainkan aturan asli (untuk screenshot + end screen).
import {
  ROOM, GUARDS, DRONE_PATH, DRONE, CAMERAS, EXIT, PLAYER_START,
  TUNE, gradeFor,
} from './config.js';
import { Guard, GUARD_STATE } from './guards.js';
import { CCTV } from './cameras.js';
import { Crowd } from './crowd.js';
import { Player } from './player.js';
import { Loot } from './loot.js';
import { Sway } from './sway.js';
import { makeRng } from './rng.js';
import { pointInRect, hasLineOfSight } from './geom.js';

export const SCREEN = { TITLE: 'title', PLAY: 'play', WIN: 'win', LOSE: 'lose' };

// Drone patroli: terbang di atas lantai, kerucutnya jatuh ke lantai.
export class Drone {
  constructor(path) {
    this.path = path;
    this.x = path[0][0];
    this.z = path[0][1];
    this.targetIndex = 1;
    this.height = DRONE.height;
    this.range = DRONE.range;
    this.seesPlayer = false;
  }

  update(dt, player, obstacles, crowdBlockers) {
    const target = this.path[this.targetIndex];
    const dx = target[0] - this.x;
    const dz = target[1] - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.2) {
      this.targetIndex = (this.targetIndex + 1) % this.path.length;
    } else {
      const step = Math.min(dist, DRONE.speed * dt);
      this.x += (dx / dist) * step;
      this.z += (dz / dist) * step;
    }
    // Drone melihat ke bawah: radius di lantai + LOS dari posisi drone.
    const pdx = player.x - this.x;
    const pdz = player.z - this.z;
    const pd = Math.hypot(pdx, pdz);
    this.seesPlayer = pd < this.range
      && hasLineOfSight(this.x, this.z, player.x, player.z, obstacles, crowdBlockers);
  }

  reset() {
    this.x = this.path[0][0];
    this.z = this.path[0][1];
    this.targetIndex = 1;
    this.seesPlayer = false;
  }
}

export class World {
  constructor(seed = 20261122) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.obstacles = null; // diisi buildLevel via attachLevel
    this.screen = SCREEN.TITLE;
    this.time = 0;
    this.playTime = 0;
    this.alarm = 0;
    this.strikes = 0;
    this.caughtCount = 0;
    this.decoys = TUNE.decoyCount;
    this.decoyCooldown = 0;
    this.decoyPos = null; // {x, z, timer} chip pengalih yang tergeletak
    this.message = '';
    this.messageTimer = 0;
    this.winStats = null;
    this.events = []; // {type} untuk suara: 'pickup' | 'caught' | 'alarm' | 'win' | 'lose' | 'decoy'
    this.player = null;
    this.guards = [];
    this.cameras = [];
    this.drone = null;
    this.crowd = new Crowd(seed);
    this.loot = new Loot();
    this.sway = new Sway();
    this.autopilot = null;
    this.blending = false;
  }

  attachLevel(obstacles) {
    this.obstacles = obstacles;
    this.player = new Player(obstacles, ROOM);
    this.guards = GUARDS.map((g) => new Guard(g, obstacles));
    this.cameras = CAMERAS.map((c) => new CCTV(c, obstacles));
    this.drone = new Drone(DRONE_PATH);
  }

  reset() {
    this.screen = SCREEN.TITLE;
    this.time = 0;
    this.playTime = 0;
    this.alarm = 0;
    this.strikes = 0;
    this.caughtCount = 0;
    this.decoys = TUNE.decoyCount;
    this.decoyCooldown = 0;
    this.decoyPos = null;
    this.message = '';
    this.messageTimer = 0;
    this.winStats = null;
    this.events = [];
    this.player.reset();
    for (const g of this.guards) g.reset();
    for (const c of this.cameras) c.reset();
    this.drone.reset();
    this.loot.reset();
    this.autopilot = null;
    this.blending = false;
  }

  startPlay() {
    this.reset();
    this.screen = SCREEN.PLAY;
    this.setMessage('Masuk tanpa ketahuan — curi 3 jackpot, lalu kabur lewat EXIT!', 4);
  }

  setMessage(text, seconds = 3) {
    this.message = text;
    this.messageTimer = seconds;
  }

  // ---- A* autopilot -------------------------------------------------
  // Grid 1 satuan; sel terhalang rintangan (+margin) atau dinding.
  // Biaya bahaya: sel di dalam kerucut penjaga/kamera dan dekat penjaga mahal,
  // sehingga pilot memilih rute aman — tapi tetap aturan asli yang dimainkan.
  planPath(fromX, fromZ, toX, toZ, dangerWeight) {
    const cell = 1;
    const cols = Math.round((ROOM.maxX - ROOM.minX) / cell);
    const rows = Math.round((ROOM.maxZ - ROOM.minZ) / cell);
    const toCell = (x, z) => ({
      cx: Math.max(0, Math.min(cols - 1, Math.floor((x - ROOM.minX) / cell))),
      cz: Math.max(0, Math.min(rows - 1, Math.floor((z - ROOM.minZ) / cell))),
    });
    const start = toCell(fromX, fromZ);
    const goal = toCell(toX, toZ);
    const key = (cx, cz) => cz * cols + cx;
    const blocked = (cx, cz) => {
      const x = ROOM.minX + (cx + 0.5) * cell;
      const z = ROOM.minZ + (cz + 0.5) * cell;
      for (const o of this.obstacles) {
        if (pointInRect(x, z, o, 0.55)) return true;
      }
      return false;
    };
    const danger = (cx, cz) => {
      if (dangerWeight <= 0) return 0;
      const x = ROOM.minX + (cx + 0.5) * cell;
      const z = ROOM.minZ + (cz + 0.5) * cell;
      let cost = 0;
      for (const g of this.guards) {
        const dx = x - g.x;
        const dz = z - g.z;
        const d = Math.hypot(dx, dz);
        if (d < 3) cost += 30 * (1 - d / 3);
        const ang = Math.atan2(dz, dx);
        let diff = Math.abs(ang - g.angle);
        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
        if (d < TUNE.guardVisionRange && diff < TUNE.guardHalfAngle + 0.15) cost += 45;
      }
      for (const c of this.cameras) {
        const dx = x - c.x;
        const dz = z - c.z;
        const d = Math.hypot(dx, dz);
        const ang = Math.atan2(dz, dx);
        let diff = Math.abs(ang - c.angle);
        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
        if (d < c.range && diff < TUNE.cameraHalfAngle + 0.1) cost += 55;
      }
      const dd = Math.hypot(x - this.drone.x, z - this.drone.z);
      if (dd < this.drone.range + 1) cost += 40;
      return cost * dangerWeight;
    };
    // A* sederhana dengan open list array (grid kecil, cukup cepat).
    const open = [{ cx: start.cx, cz: start.cz, g: 0, f: 0, parent: null }];
    const best = new Map();
    best.set(key(start.cx, start.cz), 0);
    const closed = new Set();
    const heuristic = (cx, cz) => Math.hypot(cx - goal.cx, cz - goal.cz);
    let found = null;
    while (open.length > 0) {
      let bi = 0;
      for (let i = 1; i < open.length; i += 1) if (open[i].f < open[bi].f) bi = i;
      const node = open.splice(bi, 1)[0];
      const k = key(node.cx, node.cz);
      if (closed.has(k)) continue;
      closed.add(k);
      if (node.cx === goal.cx && node.cz === goal.cz) {
        found = node;
        break;
      }
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dz === 0) continue;
          const ncx = node.cx + dx;
          const ncz = node.cz + dz;
          if (ncx < 0 || ncz < 0 || ncx >= cols || ncz >= rows) continue;
          if (blocked(ncx, ncz)) continue;
          // Larang potong sudut melewati rintangan.
          if (dx !== 0 && dz !== 0 && (blocked(node.cx + dx, node.cz) || blocked(node.cx, node.cz + dz))) continue;
          const stepCost = (dx !== 0 && dz !== 0 ? 1.41 : 1) + danger(ncx, ncz);
          const ng = node.g + stepCost;
          const nk = key(ncx, ncz);
          if (best.has(nk) && best.get(nk) <= ng) continue;
          best.set(nk, ng);
          open.push({ cx: ncx, cz: ncz, g: ng, f: ng + heuristic(ncx, ncz), parent: node });
        }
      }
    }
    if (!found) return null;
    const path = [];
    let node = found;
    while (node) {
      path.push({ x: ROOM.minX + (node.cx + 0.5) * cell, z: ROOM.minZ + (node.cz + 0.5) * cell });
      node = node.parent;
    }
    path.reverse();
    return path;
  }

  // Satu langkah autopilot: kembalikan vektor gerak + apakah menekan E.
  autopilotStep(dt, dangerWeight) {
    const p = this.player;
    if (!this.autopilot || this.autopilot.replanTimer <= 0) {
      // Target: loot terdekat yang tersisa, lalu EXIT.
      let target = null;
      let bestD = Infinity;
      for (const item of this.loot.items) {
        if (item.taken) continue;
        const d = Math.hypot(item.x - p.x, item.z - p.z);
        if (d < bestD) {
          bestD = d;
          target = { x: item.x, z: item.z };
        }
      }
      if (!target) target = { x: EXIT.x, z: EXIT.z - 0.5 };
      const path = this.planPath(p.x, p.z, target.x, target.z, dangerWeight);
      this.autopilot = { path: path || [target], index: 0, replanTimer: 0.5, target };
    }
    this.autopilot.replanTimer -= dt;
    const ap = this.autopilot;
    // Lari dari penjaga yang sedang mengejar bila terlalu dekat.
    for (const g of this.guards) {
      if (g.state === GUARD_STATE.ALERT) {
        const d = Math.hypot(g.x - p.x, g.z - p.z);
        if (d < 4.5) {
          const fx = p.x - g.x;
          const fz = p.z - g.z;
          const len = Math.hypot(fx, fz) || 1;
          return { mx: fx / len, mz: fz / len, pickup: false };
        }
      }
    }
    // Ikuti jalur; lewati waypoint yang sudah dekat atau terhalang langsung.
    while (ap.index < ap.path.length - 1) {
      const wp = ap.path[ap.index];
      if (Math.hypot(wp.x - p.x, wp.z - p.z) < 0.6) ap.index += 1;
      else break;
    }
    const wp = ap.path[Math.min(ap.index, ap.path.length - 1)];
    const dx = wp.x - p.x;
    const dz = wp.z - p.z;
    const len = Math.hypot(dx, dz) || 1;
    const nearLoot = this.loot.nearestInReach(p.x, p.z);
    return { mx: dx / len, mz: dz / len, pickup: !!nearLoot };
  }

  // ---- Aturan inti ---------------------------------------------------
  tryPickup() {
    const item = this.loot.nearestInReach(this.player.x, this.player.z);
    if (!item) return false;
    item.take();
    this.events.push({ type: 'pickup' });
    this.setMessage(`Dapat ${item.name}! (${this.loot.count()}/${TUNE.lootNeeded})`, 2.5);
    return true;
  }

  throwDecoy() {
    if (this.decoys <= 0 || this.decoyCooldown > 0) return false;
    this.decoys -= 1;
    this.decoyCooldown = 1;
    const lx = this.player.x + Math.cos(this.player.angle) * TUNE.decoyThrow;
    const lz = this.player.z + Math.sin(this.player.angle) * TUNE.decoyThrow;
    this.decoyPos = { x: lx, z: lz, timer: 5 };
    for (const g of this.guards) {
      if (Math.hypot(g.x - lx, g.z - lz) < TUNE.decoyRadius) {
        g.investigate = { x: lx, z: lz, timer: 5 };
        if (g.state !== GUARD_STATE.ALERT) g.state = GUARD_STATE.SEARCH;
      }
    }
    this.events.push({ type: 'decoy' });
    this.setMessage('Chip dilempar — penjaga memeriksa bunyinya!', 2);
    return true;
  }

  onCaught(cause) {
    this.strikes += 1;
    this.caughtCount += 1;
    this.alarm = TUNE.alarmResetAfterCaught;
    this.events.push({ type: 'caught' });
    this.setMessage(`KETAHUAN! ${cause} — Strike ${this.strikes}/${TUNE.strikesToLose}`, 3);
    this.player.teleport(PLAYER_START.x, PLAYER_START.z);
    for (const g of this.guards) {
      g.reset();
      g.suspicion = 0;
    }
    if (this.strikes >= TUNE.strikesToLose) {
      this.screen = SCREEN.LOSE;
      this.events.push({ type: 'lose' });
    }
  }

  checkWin() {
    if (this.loot.count() >= TUNE.lootNeeded) {
      const d = Math.hypot(this.player.x - EXIT.x, this.player.z - (EXIT.z - 0.4));
      if (d < EXIT.r) {
        this.screen = SCREEN.WIN;
        this.winStats = {
          seconds: this.playTime,
          strikes: this.strikes,
          caught: this.caughtCount,
          loot: this.loot.count(),
          grade: gradeFor(this.playTime, this.strikes),
        };
        this.events.push({ type: 'win' });
      }
    }
  }

  // Satu langkah simulasi. `input` = {mx, mz, pickup, decoy} atau null (diam).
  step(dt, input) {
    this.time += dt;
    this.sway.update(dt);
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.decoyCooldown > 0) this.decoyCooldown -= dt;
    if (this.decoyPos) {
      this.decoyPos.timer -= dt;
      if (this.decoyPos.timer <= 0) this.decoyPos = null;
    }
    // Kerumunan selalu bergerak (juga di title, sebagai latar hidup).
    this.crowd.update(dt, this.obstacles);
    this.loot.update(this.time);

    if (this.screen !== SCREEN.PLAY) {
      // Di title: penjaga tetap patroli sebagai latar.
      for (const g of this.guards) g.update(dt, this.player, this.crowd.blockers(), 1);
      for (const c of this.cameras) c.update(dt, this.time, this.player, this.crowd.blockers());
      this.drone.update(dt, this.player, this.obstacles, this.crowd.blockers());
      return;
    }

    this.playTime += dt;
    const p = this.player;

    if (input) {
      if (input.mx !== 0 || input.mz !== 0) {
        p.move(input.mx, input.mz, dt, () => this.events.push({ type: 'step' }));
      } else {
        p.moving = false;
      }
      if (input.pickup) this.tryPickup();
      if (input.decoy) this.throwDecoy();
    }

    // Berbaur: dekat tamu kasino → deteksi melambat + alarm cepat turun.
    this.blending = this.crowd.blendingWith(p.x, p.z, TUNE.crowdBlendRadius);
    const blendFactor = this.blending ? TUNE.crowdBlendFactor : 1;
    const blockers = this.crowd.blockers();

    let anyAlert = false;
    let anySuspicious = false;
    for (const g of this.guards) {
      g.update(dt, p, blockers, blendFactor);
      if (g.state === GUARD_STATE.ALERT) anyAlert = true;
      else if (g.state === GUARD_STATE.SUSPICIOUS || g.state === GUARD_STATE.SEARCH) anySuspicious = true;
      // Tertangkap: penjaga alert menyentuh pemain.
      if (g.state === GUARD_STATE.ALERT && Math.hypot(g.x - p.x, g.z - p.z) < TUNE.guardCatchRadius) {
        this.onCaught(`Penjaga ${g.name} menangkapmu`);
        return;
      }
    }
    let cameraSees = false;
    for (const c of this.cameras) {
      c.update(dt, this.time, p, blockers);
      if (c.seesPlayer) cameraSees = true;
    }
    this.drone.update(dt, p, this.obstacles, blockers);
    const droneSees = this.drone.seesPlayer;

    // Meter alarm: naik saat terlihat, turun saat sembunyi.
    const prevAlarm = this.alarm;
    if (cameraSees || droneSees) this.alarm += TUNE.cameraAlarmRate * dt;
    else if (anyAlert) this.alarm += TUNE.guardAlertAlarmRate * dt;
    else if (anySuspicious) this.alarm += TUNE.guardSuspiciousAlarmRate * dt;
    else this.alarm -= (this.blending ? TUNE.alarmDecayInCrowd : TUNE.alarmDecay) * dt;
    this.alarm = Math.max(0, Math.min(100, this.alarm));
    if (prevAlarm < 70 && this.alarm >= 70) {
      this.events.push({ type: 'alarm' });
      this.setMessage('ALARM TINGGI — sembunyi di balik meja atau berbaur dengan tamu!', 2.5);
    }
    if (this.alarm >= TUNE.alarmCaughtAt) {
      this.onCaught(cameraSees || droneSees ? 'Kamera/Drone merekam wajahmu' : 'Alarm penuh — sekuriti mengepungmu');
      return;
    }

    this.checkWin();
  }
}
