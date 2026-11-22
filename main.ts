// Kasino Laut — entry best-heist-game-20261122-0559 (Node 22, standard library
// only). Game-nya adalah folder game/ di sebelah file ini: file statis yang
// dibuka browser desktop secara offline (game/index.html + modul ES + three.js
// yang di-vendor di game/vendor/). Program ini menyerahkan game itu: menyalin
// game/ dan screenshots/ dari repositori ke /output lalu menulis
// /output/dossier.json, ringkasan yang dibaca juri, dengan library make.fun
// yang di-vendor.
//
// Di luar container grader, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Batas scorer (reference/gate.json): hanya text_max_bytes yang membentuk byte;
// yang lain menolak entry yang scorer akan tolak (lebih dari 4 screenshot atau
// satu di atas 256 KiB; lebih dari 993 file di game/ atau 48 MiB file game
// seluruhnya, atau path di bawah game/ di atas 1000 byte: game/ dihitung di
// samping batas 1000 entri /output sendiri, screenshot-nya dan dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
