// Kapal oleng: goyangan lambat yang menggerakkan kamera (roll + sway) dan
// lampu gantung. Murni visual — tidak mengubah aturan deteksi.
export class Sway {
  constructor() {
    this.time = 0;
    this.rollAmp = 0.016; // radian, kecil agar tidak memusingkan
    this.pitchAmp = 0.010;
    this.period = 7.3; // detik per oleng penuh
  }

  update(dt) {
    this.time += dt;
  }

  // Sudut oleng saat ini: {roll, pitch} dalam radian.
  angles() {
    const w = (Math.PI * 2) / this.period;
    return {
      roll: Math.sin(this.time * w) * this.rollAmp,
      pitch: Math.sin(this.time * w * 0.5 + 1.3) * this.pitchAmp,
    };
  }

  // Ayunan lampu gantung mengikuti oleng, sedikit tertinggal.
  chandelierAngle() {
    const w = (Math.PI * 2) / this.period;
    return Math.sin(this.time * w - 0.6) * 0.05;
  }
}
