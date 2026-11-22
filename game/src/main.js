// Bootstrap Kasino Laut: baca ?shot=, staging adegan bila diminta,
// lalu jalankan loop game (input manusia atau autopilot bila ?auto=1).
import { World, SCREEN } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const autoPlay = params.get('auto') === '1';
const seedParam = Number.parseInt(params.get('seed') || '20261122', 10);
const seed = Number.isFinite(seedParam) ? seedParam : 20261122;

const world = new World(seed);
window.__world = world; // pegangan debug untuk probe/playtest
const renderer = new Renderer(world);
const input = new Input();
const audio = new AudioEngine();

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

// Suara hanya hidup sesudah interaksi pertama (aturan autoplay browser).
function unlockAudio() {
  audio.ensure();
  audio.startAmbient();
}
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// Tombol-tombol layar.
document.getElementById('btn-start').addEventListener('click', () => {
  audio.ensure();
  audio.click();
  world.startPlay();
});
document.getElementById('btn-again-win').addEventListener('click', () => {
  audio.click();
  world.startPlay();
});
document.getElementById('btn-again-lose').addEventListener('click', () => {
  audio.click();
  world.startPlay();
});
document.getElementById('btn-mute').addEventListener('click', () => {
  audio.ensure();
  audio.setMuted(!audio.muted);
  document.getElementById('btn-mute').textContent = audio.muted ? '🔇 Suara: Mati' : '🔊 Suara: Hidup';
});

// Adegan screenshot deterministik.
if (shotName) {
  stageShot(shotName, world);
  // Di shot climax/play, biarkan satu frame render sebelum screenshot.
  renderer.render();
}

let last = performance.now();
let chimeTimer = 8;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Mute.
  if (input.wasPressed('m')) {
    audio.ensure();
    audio.setMuted(!audio.muted);
    document.getElementById('btn-mute').textContent = audio.muted ? '🔇 Suara: Mati' : '🔊 Suara: Hidup';
  }

  // Mulai / ulang.
  if (world.screen === SCREEN.TITLE && (input.wasPressed('enter') || input.wasPressed(' '))) {
    audio.ensure();
    audio.click();
    world.startPlay();
  }
  if ((world.screen === SCREEN.WIN || world.screen === SCREEN.LOSE)
    && (input.wasPressed('r') || input.wasPressed('enter'))) {
    audio.click();
    world.startPlay();
  }

  // Input permainan.
  let stepInput = null;
  if (world.screen === SCREEN.PLAY) {
    if (autoPlay) {
      const act = world.autopilotStep(dt, 1.0);
      stepInput = { mx: act.mx, mz: act.mz, pickup: act.pickup, decoy: false };
    } else {
      const mv = input.moveVector();
      stepInput = {
        mx: mv.x,
        mz: mv.z,
        pickup: input.wasPressed('e'),
        decoy: input.wasPressed('q'),
      };
    }
  }
  // Saat ?shot= dipakai, dunia dibekukan pada frame yang di-stage agar
  // screenshot deterministik (tidak ada langkah simulasi tambahan).
  if (!shotName) {
    world.step(dt, stepInput);

    // Suara dari event dunia.
    for (const ev of world.events) {
      if (ev.type === 'step') audio.step();
      else if (ev.type === 'pickup') audio.pickup();
      else if (ev.type === 'decoy') audio.decoy();
      else if (ev.type === 'alarm') audio.alarmSting();
      else if (ev.type === 'caught') audio.caught();
      else if (ev.type === 'win') audio.win();
      else if (ev.type === 'lose') audio.caught();
    }
    world.events.length = 0;
  }

  // Lonceng mesin slot sesekali sebagai ambient kasino.
  chimeTimer -= dt;
  if (chimeTimer <= 0) {
    chimeTimer = 7 + Math.random() * 9;
    audio.slotChime();
  }

  renderer.render();
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
