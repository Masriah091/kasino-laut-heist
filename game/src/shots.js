// Adegan screenshot ?shot=start|play|climax|end. Semuanya memainkan aturan
// asli dari state segar dengan autopilot A* (bukan frame yang dipaksa):
// - start: title di atas kasino yang hidup (patroli berjalan 6 detik).
// - play: autopilot aman 26 detik — permainan normal di tengah jalan.
// - climax: autopilot berani (biaya bahaya kecil) sampai 2 loot / alarm naik —
//   frame klimaks dengan penjaga curiga, cone merah, dan alarm menyala.
// - end: autopilot aman sampai WIN murni (grade + statistik asli).
import { SCREEN } from './world.js';

const STEP = 1 / 30;
const START_SECONDS = 6;
const PLAY_SECONDS = 4.5;
const CLIMAX_LIMIT_SECONDS = 60;
const END_LIMIT_SECONDS = 600;

/**
 * Jalankan autopilot sebanyak `seconds` (atau sampai kondisi `stopWhen`
 * terpenuhi), dengan langkah tetap 1/30 detik.
 */
function runAutopilot(world, seconds, dangerWeight, stopWhen) {
  world.startPlay();
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.screen !== SCREEN.PLAY) break;
    const act = world.autopilotStep(STEP, dangerWeight);
    world.step(STEP, { mx: act.mx, mz: act.mz, pickup: act.pickup, decoy: false });
    if (stopWhen && stopWhen(world)) break;
  }
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    runAutopilot(world, PLAY_SECONDS, 1.0);
    return { screen: world.screen };
  }
  if (name === 'climax') {
    // Berani: potong jalur lewat cone agar ketegangan terlihat, tapi tetap
    // aturan asli — berhenti begitu 2 jackpot didapat (sebelum menang),
    // agar frame-nya klimaks mid-heist, bukan layar kemenangan.
    runAutopilot(world, CLIMAX_LIMIT_SECONDS, 0.35, (w) => w.loot.count() >= 2);
    return { screen: world.screen };
  }
  if (name === 'end') {
    runAutopilot(world, END_LIMIT_SECONDS, 1.0);
    return { screen: world.screen };
  }
  // start (default): title di atas dunia yang hidup.
  world.screen = SCREEN.TITLE;
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, null);
  }
  return { screen: SCREEN.TITLE };
}
