// Kasino Laut — konfigurasi dunia: ukuran ruangan, palet, tata letak kasino,
// jalur patroli, posisi loot, kamera CCTV, dan penyetelan deteksi.
// Satu-satunya sumber kebenaran untuk angka-angka level; file lain membacanya.
export const ROOM = { minX: -17, maxX: 17, minZ: -11, maxZ: 11 };

export const PALETTE = {
  floorNavy: 0x14264d,
  carpetTeal: 0x0f5f5c,
  gold: 0xd4af37,
  goldBright: 0xffd76a,
  wallNavy: 0x1b2f5e,
  wallTrim: 0xc9a227,
  feltGreen: 0x0e6b3a,
  feltRed: 0x7a1020,
  moonBlue: 0x9fc4ff,
  playerCyan: 0x19e3d6,
  guardNavy: 0x22345e,
  guestColors: [0xe8b4b8, 0xf2d492, 0x9fc4ff, 0xc9a0dc, 0x8fd3a8, 0xf5f0e1, 0xff9d76, 0x7fb8d8],
};

// Rintangan: kotak AABB {x, z, hx, hz, kind} — kind menentukan mesh yang dibangun level.js.
export const OBSTACLES = [
  // Meja roulette (barat) — loot Chip Emas di depannya.
  { x: -11, z: -6.5, hx: 2.6, hz: 1.3, kind: 'roulette' },
  // Meja poker (timur) — loot Jam Saku di depannya.
  { x: 10, z: -6.5, hx: 2.6, hz: 1.3, kind: 'poker' },
  // Etalase kalung di dinding utara — loot Kalung Berlian di depannya.
  { x: 0, z: -9.4, hx: 1.8, hz: 0.8, kind: 'display' },
  // Bar di dinding timur.
  { x: 14.6, z: 3, hx: 1.1, hz: 4.2, kind: 'bar' },
  // Deret mesin slot di dinding barat dan timur.
  { x: -15.6, z: -3, hx: 0.9, hz: 2.6, kind: 'slots' },
  { x: -15.6, z: 3, hx: 0.9, hz: 2.6, kind: 'slots' },
  { x: 15.6, z: -3, hx: 0.9, hz: 2.6, kind: 'slots' },
  // Meja blackjack di tengah.
  { x: -4.5, z: 2.5, hx: 2.3, hz: 1.1, kind: 'blackjack' },
  { x: 4.5, z: 2.5, hx: 2.3, hz: 1.1, kind: 'blackjack' },
  // Meja bundar tengah (fountain kecil di atasnya).
  { x: 0, z: -2, hx: 1.7, hz: 1.7, kind: 'round' },
  // Loket kasir di barat laut.
  { x: -13.5, z: -9.6, hx: 2.1, hz: 1.0, kind: 'cashier' },
  // Panggung band di barat daya.
  { x: -11.5, z: 8.6, hx: 3.1, hz: 1.5, kind: 'stage' },
  // Pilar-pilar penyangga.
  { x: -6, z: 0, hx: 0.7, hz: 0.7, kind: 'pillar' },
  { x: 6, z: 0, hx: 0.7, hz: 0.7, kind: 'pillar' },
  { x: -6, z: -7, hx: 0.7, hz: 0.7, kind: 'pillar' },
  { x: 6, z: -7, hx: 0.7, hz: 0.7, kind: 'pillar' },
];

// Empat sekuriti kasino: nama, warna seragam, dan jalur patroli (ruang terbuka saja).
export const GUARDS = [
  {
    name: 'Budi', color: 0x2b3f6e,
    waypoints: [[-13, -8.5], [-13, 8], [-7, 8], [-7, -8.5]],
  },
  {
    name: 'Sari', color: 0x3a2b5e,
    waypoints: [[13, -8.5], [13, 8], [8, 8], [8, -8.5]],
  },
  {
    name: 'Agus', color: 0x1f4d3a,
    waypoints: [[-6, -8.6], [6, -8.6], [6, -4.2], [-6, -4.2]],
  },
  {
    name: 'Dewi', color: 0x5e2b2b,
    waypoints: [[-9, 8], [9, 8], [9, 5.2], [-9, 5.2]],
  },
];

// Drone patroli terbang di atas lantai, mengitari persegi panjang tengah.
export const DRONE_PATH = [[-10, -8], [10, -8], [10, 6], [-10, 6]];
export const DRONE = { height: 4.2, speed: 2.4, range: 3.4, name: 'Drone Patroli' };

// Dua kamera CCTV di dinding utara, menyapu lantai.
export const CAMERAS = [
  { x: -15.5, z: -10.4, baseAngle: Math.PI * 0.32, sweep: 0.55, range: 9.5, name: 'CCTV Barat' },
  { x: 15.5, z: -10.4, baseAngle: Math.PI * 0.68, sweep: 0.55, range: 9.5, name: 'CCTV Timur' },
];

// Tiga loot jackpot kasino.
export const LOOT = [
  { id: 'chip', name: 'Chip Emas', x: -11, z: -4.3, color: 0xffd76a, hint: 'tumpukan chip emas' },
  { id: 'jam', name: 'Jam Saku', x: 10, z: -4.3, color: 0x9fc4ff, hint: 'jam saku berlian' },
  { id: 'kalung', name: 'Kalung Berlian', x: 0, z: -8.1, color: 0xff8fd8, hint: 'kalung berlian' },
];

export const PLAYER_START = { x: 0, z: 9.4 };
export const EXIT = { x: 0, z: 10.4, r: 1.7 };

// Tamu kasino: titik-titik kumpul tempat mereka mondar-mandir.
export const GUEST_SPOTS = [
  [-11, -2.5], [-8, -5.5], [-2, -5], [3, -5.5], [8, -2.5],
  [-3, 5.5], [3, 5.5], [-13, 1.5], [12, 0.5], [0, 6.5],
];

export const TUNE = {
  playerSpeed: 5.4,
  playerRadius: 0.45,
  guardPatrolSpeed: 1.7,
  guardChaseSpeed: 4.35,
  guardSearchSpeed: 2.6,
  guardVisionRange: 7.5,
  guardHalfAngle: 0.61, // ~35 derajat
  guardCatchRadius: 1.05,
  suspicionRise: 0.85, // per detik saat pemain penuh di dalam cone
  suspicionFall: 0.28,
  alertLoseSightSeconds: 2.6,
  searchSeconds: 6,
  cameraHalfAngle: 0.5,
  cameraAlarmRate: 22, // alarm per detik saat kamera melihat
  guardAlertAlarmRate: 18,
  guardSuspiciousAlarmRate: 8,
  alarmDecay: 5,
  alarmDecayInCrowd: 9,
  alarmCaughtAt: 100,
  alarmResetAfterCaught: 25,
  strikesToLose: 3,
  decoyCount: 3,
  decoyThrow: 4.2,
  decoyRadius: 6.5,
  crowdBlendRadius: 1.6, // dekat tamu: deteksi setengah
  crowdBlendFactor: 0.5,
  pickupRadius: 1.35,
  lootNeeded: 3,
};

export const GRADES = [
  { grade: 'S', maxSeconds: 150, maxStrikes: 0 },
  { grade: 'A', maxSeconds: 210, maxStrikes: 1 },
  { grade: 'B', maxSeconds: 300, maxStrikes: 2 },
];

export function gradeFor(seconds, strikes) {
  for (const g of GRADES) {
    if (seconds <= g.maxSeconds && strikes <= g.maxStrikes) return g.grade;
  }
  return 'C';
}
