# 🎰 KASINO LAUT — Heist di Kapal Pesiar

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Masriah091/kasino-laut-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Masriah091/kasino-laut-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Game heist 3D untuk kompetisi [Best Heist Game](https://make.fun/bounty/best-heist-game-20261122-0559) di make.fun.

## Cerita

Tengah malam di dek kasino **MV Aurora**, kapal pesiar yang berlayar di bawah bulan purnama.
Tiga jackpot menunggu di lantai kasino: **Chip Emas** di meja roulette, **Jam Saku** di meja
poker, dan **Kalung Berlian** di etalase utara. Empat sekuriti kasino berpatroli, dua CCTV
menyapu lantai, dan satu drone terbang mengawasi dari atas. Kapal terus oleng — dan kerumunan
tamu kasino adalah cover terbaikmu.

## Cara main

| Tombol | Aksi |
|---|---|
| WASD / panah | Bergerak |
| E | Ambil loot (saat dekat) |
| Q | Lempar chip pengalih — penjaga memeriksa bunyinya (3x) |
| M | Mute suara |
| Enter | Mulai |
| R | Ulang |

**Menang:** curi 3/3 jackpot lalu kabur lewat pintu **EXIT** hijau di selatan.
**Kalah:** ketahuan 3 kali (tertangkap penjaga, atau meter alarm penuh).

## Sistem

- **Patroli → Curiga (?) → Kejar (!) → Cari → Patroli** untuk tiap sekuriti, dengan kerucut
  visi bervolume (kuning → oranye → merah).
- **Meter alarm** naik saat terlihat penjaga, CCTV, atau drone; turun saat bersembunyi
  di balik meja atau berbaur dengan tamu.
- **Kapal oleng:** kamera dan lampu gantung bergoyang mengikuti ombak.
- **Kerumunan kasino:** tamu mondar-mandir menghalangi line-of-sight penjaga; berdiri
  dekat mereka membuatmu "berbaur" dan deteksi melambat.
- **Suara synth WebAudio** (langkah, denting chip, sting alarm, dengung kasino) — tanpa
  file audio eksternal.

## Menjalankan

```sh
python3 -m http.server 8123 --directory game
# buka http://localhost:8123/index.html
```

Screenshot deterministik: `?shot=start|play|climax|end` (autopilot memainkan aturan asli).

## Struktur kode

`game/src/` satu-tugas-satu-file: `config` (level + tuning), `geom` (tabrakan/LOS),
`level` (dunia 3D), `guards` (sekuriti + cone), `cameras` (CCTV), `crowd` (tamu),
`player`, `loot`, `sway` (oleng kapal), `world` (aturan + autopilot A*), `render`
(Three.js + HUD + minimap), `shots` (adegan screenshot), `main` (bootstrap).
Three.js r160 di-vendor di `game/vendor/three.min.js`.

SPDX-License-Identifier: MIT
