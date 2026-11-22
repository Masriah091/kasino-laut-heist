// Level kasino kapal pesiar: lantai karpet, dinding + jendela bulan besar,
// meja-meja kasino, mesin slot, bar, pilar, lampu gantung emas, dan pintu EXIT.
// Mengembalikan rintangan AABB (untuk tabrakan + line-of-sight) dan grup mesh.
import * as THREE from 'three';
import { ROOM, OBSTACLES, PALETTE, EXIT } from './config.js';

function carpetTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 340;
  const g = c.getContext('2d');
  g.fillStyle = '#12264d';
  g.fillRect(0, 0, 512, 340);
  // Pola karpet: kotak-kotak teal gelap dengan titik emas.
  for (let y = 0; y < 340; y += 34) {
    for (let x = 0; x < 512; x += 34) {
      const even = ((x + y) / 34) % 2 === 0;
      g.fillStyle = even ? '#0f5f5c' : '#0d4a55';
      g.fillRect(x + 1, y + 1, 32, 32);
      g.fillStyle = 'rgba(212,175,55,0.55)';
      g.beginPath();
      g.arc(x + 17, y + 17, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Jalur karpet merah dari pintu masuk ke utara.
  g.fillStyle = '#7a1020';
  g.fillRect(236, 0, 40, 340);
  g.strokeStyle = '#d4af37';
  g.lineWidth = 2;
  g.strokeRect(236, 0, 40, 340);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1.4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.08,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(rTop, rBottom, h, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.6,
    metalness: opts.metalness ?? 0.15,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, opts.segments ?? 20), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = true;
  return mesh;
}

// Satu mesin slot: badan + layar menyala + tuas.
function buildSlotMachine(x, z, faceAngle) {
  const g = new THREE.Group();
  const body = box(0.7, 1.5, 0.55, 0x8a1f2d, 0, 0.75, 0);
  const screen = box(0.5, 0.55, 0.06, 0x111111, 0, 1.15, 0.29, {
    emissive: 0x22d3ee, emissiveIntensity: 0.9, castShadow: false,
  });
  const base = box(0.76, 0.18, 0.62, 0xd4af37, 0, 0.09, 0, { metalness: 0.7, roughness: 0.35 });
  const lever = cylinder(0.03, 0.03, 0.5, 0xd4af37, 0.42, 1.05, 0, { metalness: 0.8, roughness: 0.3 });
  lever.rotation.z = -0.5;
  g.add(body, screen, base, lever);
  g.position.set(x, 0, z);
  g.rotation.y = faceAngle;
  return g;
}

// Mesh per jenis rintangan, diposisikan di tengah AABB-nya.
function buildObstacleMesh(o) {
  const g = new THREE.Group();
  const cx = o.x;
  const cz = o.z;
  if (o.kind === 'roulette' || o.kind === 'poker' || o.kind === 'blackjack') {
    const felt = o.kind === 'roulette' ? 0x7a1020 : o.kind === 'poker' ? 0x0e6b3a : 0x14532d;
    const top = cylinder(o.hx, o.hx, 0.12, felt, 0, 0.82, 0, { segments: 24 });
    top.scale.z = o.hz / o.hx;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(o.hx, 0.09, 10, 28),
      new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.8, roughness: 0.3 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1, o.hz / o.hx, 1);
    rim.position.y = 0.88;
    rim.castShadow = true;
    const leg = box(o.hx * 0.5, 0.8, o.hz * 0.5, 0x3a2415, 0, 0.4, 0);
    g.add(top, rim, leg);
    if (o.kind === 'roulette') {
      const wheel = cylinder(0.55, 0.55, 0.1, 0x2a2a2a, 0, 0.94, 0, { segments: 24 });
      const hub = cylinder(0.12, 0.12, 0.16, PALETTE.gold, 0, 0.98, 0, { metalness: 0.8, roughness: 0.3 });
      g.add(wheel, hub);
    } else {
      // Tumpukan chip kecil di atas meja.
      for (let i = 0; i < 3; i += 1) {
        const chip = cylinder(0.16, 0.16, 0.09, [0xd4af37, 0xd43d3d, 0x2b6fd4][i], -0.8 + i * 0.8, 0.93, 0.3, { segments: 12 });
        g.add(chip);
      }
    }
  } else if (o.kind === 'display') {
    const baseBox = box(o.hx * 2, 1.0, o.hz * 2, 0x1b2f5e, 0, 0.5, 0);
    const glass = box(o.hx * 2 - 0.2, 0.9, o.hz * 2 - 0.2, 0x9fc4ff, 0, 1.45, 0, {
      roughness: 0.1, metalness: 0.1, emissive: 0x2a4a7a, emissiveIntensity: 0.5,
    });
    glass.material.transparent = true;
    glass.material.opacity = 0.45;
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32),
      new THREE.MeshStandardMaterial({ color: 0xff8fd8, emissive: 0xff4fa8, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.4 }),
    );
    gem.position.set(0, 1.45, 0);
    gem.castShadow = true;
    g.add(baseBox, glass, gem);
  } else if (o.kind === 'bar') {
    g.add(box(o.hx * 2, 1.15, o.hz * 2, 0x4a2c14, 0, 0.58, 0));
    g.add(box(o.hx * 2 + 0.3, 0.08, o.hz * 2 + 0.3, PALETTE.gold, 0, 1.19, 0, { metalness: 0.7, roughness: 0.35 }));
    for (let i = 0; i < 4; i += 1) {
      const bottle = cylinder(0.09, 0.09, 0.5, [0x2b8a3e, 0xd4af37, 0x8a2be2, 0xd43d3d][i], 0, 1.45, -2.8 + i * 1.9, {
        emissive: [0x2b8a3e, 0xd4af37, 0x8a2be2, 0xd43d3d][i], emissiveIntensity: 0.35,
      });
      g.add(bottle);
    }
  } else if (o.kind === 'slots') {
    const n = 3;
    for (let i = 0; i < n; i += 1) {
      const along = -o.hz + 0.9 + (i * (o.hz * 2 - 1.8)) / (n - 1);
      const m = buildSlotMachine(0, along, Math.PI / 2);
      g.add(m);
    }
  } else if (o.kind === 'round') {
    g.add(cylinder(1.7, 1.4, 0.9, 0x1b2f5e, 0, 0.45, 0, { segments: 24 }));
    g.add(cylinder(1.75, 1.75, 0.1, PALETTE.gold, 0, 0.95, 0, { segments: 24, metalness: 0.7, roughness: 0.3 }));
    const fountain = cylinder(0.5, 0.7, 0.5, 0x2b6fd4, 0, 1.25, 0, {
      segments: 16, emissive: 0x1a5a9a, emissiveIntensity: 0.7,
    });
    g.add(fountain);
  } else if (o.kind === 'cashier') {
    g.add(box(o.hx * 2, 2.2, o.hz * 2, 0x2a2118, 0, 1.1, 0));
    g.add(box(o.hx * 2, 0.5, 0.1, 0x9fc4ff, 0, 1.7, o.hz, {
      roughness: 0.1, emissive: 0x2a4a7a, emissiveIntensity: 0.4,
    }));
    const sign = box(1.6, 0.4, 0.08, 0x111111, 0, 2.4, o.hz + 0.05, {
      emissive: 0xffd76a, emissiveIntensity: 1.0, castShadow: false,
    });
    g.add(sign);
  } else if (o.kind === 'stage') {
    g.add(box(o.hx * 2, 0.5, o.hz * 2, 0x3a1020, 0, 0.25, 0));
    g.add(cylinder(0.5, 0.6, 1.6, 0x111111, -1.5, 1.3, 0, { segments: 12 }));
    g.add(cylinder(0.5, 0.6, 1.6, 0x111111, 1.5, 1.3, 0, { segments: 12 }));
    const mic = cylinder(0.06, 0.06, 1.1, 0xd4af37, 0, 1.05, 0.4, { metalness: 0.8, roughness: 0.3 });
    g.add(mic);
  } else if (o.kind === 'pillar') {
    g.add(cylinder(0.55, 0.65, 4.6, 0xd8c98a, 0, 2.3, 0, { segments: 16, roughness: 0.5 }));
    g.add(box(1.4, 0.25, 1.4, PALETTE.gold, 0, 4.6, 0, { metalness: 0.7, roughness: 0.35 }));
    g.add(box(1.5, 0.3, 1.5, 0x1b2f5e, 0, 0.15, 0));
  }
  g.position.set(cx, 0, cz);
  return g;
}

export function buildLevel() {
  const group = new THREE.Group();
  const w = ROOM.maxX - ROOM.minX;
  const d = ROOM.maxZ - ROOM.minZ;

  // Lantai karpet.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.95, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Dek kapal di luar dinding — agar tepi frame terbaca sebagai kapal, bukan void hitam.
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 60),
    new THREE.MeshStandardMaterial({ color: 0x0a1428, roughness: 0.9 }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -0.08;
  deck.receiveShadow = true;
  group.add(deck);

  // Dinding: selatan + barat + timur penuh; utara bersegmen dengan jendela besar.
  const wallMat = new THREE.MeshStandardMaterial({ color: PALETTE.wallNavy, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.7, roughness: 0.35 });
  const wallH = 4.6;
  const addWall = (ww, x, z, rotY) => {
    const wall = box(ww, wallH, 0.4, PALETTE.wallNavy, x, wallH / 2, z, { castShadow: true });
    wall.rotation.y = rotY;
    const trim = box(ww, 0.22, 0.46, PALETTE.gold, x, wallH - 0.1, z, { metalness: 0.7, roughness: 0.35, castShadow: false });
    trim.rotation.y = rotY;
    group.add(wall, trim);
  };
  addWall(w + 0.8, 0, ROOM.maxZ + 0.2, 0); // selatan (pintu EXIT dipotong visual di bawah)
  addWall(d + 0.8, ROOM.minX - 0.2, 0, Math.PI / 2); // barat
  addWall(d + 0.8, ROOM.maxX + 0.2, 0, Math.PI / 2); // timur
  // Utara: dua segmen dinding + tiga jendela bulan.
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x0a1a3a, emissive: 0x7fb0ff, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.2,
  });
  const segW = (w - 3 * 4.4) / 4;
  let wx = ROOM.minX;
  for (let i = 0; i < 4; i += 1) {
    addWall(segW, wx + segW / 2, ROOM.minZ - 0.2, 0);
    wx += segW;
    if (i < 3) {
      const win = box(4.4, 3.2, 0.15, 0x0a1a3a, wx + 2.2, 2.4, ROOM.minZ - 0.2, {
        emissive: 0x7fb0ff, emissiveIntensity: 0.55, roughness: 0.15, castShadow: false,
      });
      const frame = box(4.6, 0.18, 0.2, PALETTE.gold, wx + 2.2, 4.05, ROOM.minZ - 0.2, { metalness: 0.7, roughness: 0.35, castShadow: false });
      const mullionV = box(0.12, 3.2, 0.2, PALETTE.gold, wx + 2.2, 2.4, ROOM.minZ - 0.2, { metalness: 0.7, roughness: 0.35, castShadow: false });
      const mullionH = box(4.4, 0.12, 0.2, PALETTE.gold, wx + 2.2, 2.4, ROOM.minZ - 0.2, { metalness: 0.7, roughness: 0.35, castShadow: false });
      group.add(win, frame, mullionV, mullionH);
      wx += 4.4;
    }
  }

  // Bulan di luar jendela tengah + sorot cahaya bulan (bidang tembus pandang).
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 32),
    new THREE.MeshBasicMaterial({ color: 0xeaf2ff }),
  );
  moon.position.set(0, 6.5, ROOM.minZ - 3);
  group.add(moon);
  const moonGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 32),
    new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.18 }),
  );
  moonGlow.position.set(0, 6.5, ROOM.minZ - 2.9);
  group.add(moonGlow);
  // Bidang cahaya bulan miring dari jendela ke lantai.
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0x9fc4ff, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false,
  });
  for (const sx of [-6.5, 0, 6.5]) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 9), shaftMat);
    shaft.position.set(sx, 2.2, ROOM.minZ + 4.2);
    shaft.rotation.x = -Math.PI / 3.2;
    group.add(shaft);
  }

  // Rintangan.
  for (const o of OBSTACLES) group.add(buildObstacleMesh(o));

  // Lampu gantung emas (bergoyang bersama kapal — dianimasikan render.js).
  const chandeliers = [];
  for (const [cx, cz] of [[-8, -4], [8, -4], [0, 5]]) {
    const pivot = new THREE.Group();
    pivot.position.set(cx, 4.6, cz);
    const cord = cylinder(0.04, 0.04, 1.0, 0x111111, 0, -0.5, 0, { castShadow: false });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.09, 10, 28),
      new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 0.85, roughness: 0.25, emissive: 0xffd76a, emissiveIntensity: 0.35 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.05;
    ring.castShadow = true;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
    );
    bulb.position.y = -1.05;
    pivot.add(cord, ring, bulb);
    group.add(pivot);
    chandeliers.push(pivot);
  }

  // Pintu EXIT di dinding selatan + papan EXIT menyala + zona hijau di lantai.
  const door = box(3.4, 3.4, 0.3, 0x0e3d2a, EXIT.x, 1.7, ROOM.maxZ - 0.05, {
    emissive: 0x0e6b3a, emissiveIntensity: 0.4,
  });
  group.add(door);
  const exitSign = box(2.2, 0.6, 0.15, 0x061a10, EXIT.x, 3.9, ROOM.maxZ - 0.1, {
    emissive: 0x2bff88, emissiveIntensity: 1.4, castShadow: false,
  });
  group.add(exitSign);
  const exitZone = new THREE.Mesh(
    new THREE.CircleGeometry(EXIT.r, 28),
    new THREE.MeshBasicMaterial({ color: 0x2bff88, transparent: true, opacity: 0.22 }),
  );
  exitZone.rotation.x = -Math.PI / 2;
  exitZone.position.set(EXIT.x, 0.02, EXIT.z - 0.4);
  group.add(exitZone);

  // Tanda pintu masuk (tempat pemain muncul).
  const entryZone = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 24),
    new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.18 }),
  );
  entryZone.rotation.x = -Math.PI / 2;
  entryZone.position.set(0, 0.02, 9.4);
  group.add(entryZone);

  return { group, obstacles: OBSTACLES, chandeliers, moon };
}
