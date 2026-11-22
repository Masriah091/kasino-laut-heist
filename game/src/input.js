// Input keyboard: WASD / panah untuk bergerak, E ambil loot, Q lempar chip
// pengalih, M mute, Enter mulai/ulang, R restart.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // tombol yang baru ditekan sejak frame lalu
    this.onKey = (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(key);
      this.keys.add(key);
    };
    this.onKeyUp = (event) => {
      this.keys.delete(event.key.toLowerCase());
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
  }

  down(key) {
    return this.keys.has(key);
  }

  wasPressed(key) {
    return this.pressed.has(key);
  }

  // Vektor gerak ternormalisasi dari tombol yang ditekan.
  moveVector() {
    let x = 0;
    let z = 0;
    if (this.down('w') || this.down('arrowup')) z -= 1;
    if (this.down('s') || this.down('arrowdown')) z += 1;
    if (this.down('a') || this.down('arrowleft')) x -= 1;
    if (this.down('d') || this.down('arrowright')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 0) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  endFrame() {
    this.pressed.clear();
  }
}
