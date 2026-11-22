// Geometri 2D untuk tabrakan dan line-of-sight: segmen vs AABB, lingkaran vs
// AABB, titik di dalam kerucut. Semua di bidang XZ (x, z).
export function pointInRect(px, pz, o, pad = 0) {
  return px >= o.x - o.hx - pad && px <= o.x + o.hx + pad
    && pz >= o.z - o.hz - pad && pz <= o.z + o.hz + pad;
}

// Apakah segmen (x1,z1)-(x2,z2) memotong AABB o (slab test)?
export function segmentHitsRect(x1, z1, x2, z2, o) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  let tmin = 0;
  let tmax = 1;
  const minX = o.x - o.hx;
  const maxX = o.x + o.hx;
  const minZ = o.z - o.hz;
  const maxZ = o.z + o.hz;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let t1 = (minX - x1) / dx;
    let t2 = (maxX - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (z1 < minZ || z1 > maxZ) return false;
  } else {
    let t1 = (minZ - z1) / dz;
    let t2 = (maxZ - z1) / dz;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Apakah segmen memotong lingkaran (cx, cz, r)?
export function segmentHitsCircle(x1, z1, x2, z2, cx, cz, r) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len2 = dx * dx + dz * dz;
  let t = 0;
  if (len2 > 1e-9) {
    t = ((cx - x1) * dx + (cz - z1) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  const px = x1 + dx * t;
  const pz = z1 + dz * t;
  const ddx = px - cx;
  const ddz = pz - cz;
  return ddx * ddx + ddz * ddz < r * r;
}

// Line-of-sight: segmen bebas dari semua rintangan dan (opsional) lingkaran tamu.
export function hasLineOfSight(x1, z1, x2, z2, obstacles, blockers = []) {
  for (const o of obstacles) {
    if (segmentHitsRect(x1, z1, x2, z2, o)) return false;
  }
  for (const b of blockers) {
    if (segmentHitsCircle(x1, z1, x2, z2, b.x, b.z, b.r)) return false;
  }
  return true;
}

// Sudut terkecil antara dua arah (radian, 0..PI).
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// Apakah titik (px,pz) berada di dalam kerucut dari (ox,oz) menghadap `angle`?
export function pointInCone(px, pz, ox, oz, angle, range, halfAngle) {
  const dx = px - ox;
  const dz = pz - oz;
  const dist = Math.hypot(dx, dz);
  if (dist > range) return { inside: false, dist };
  if (dist < 0.01) return { inside: true, dist };
  const targetAngle = Math.atan2(dz, dx);
  return { inside: angleDiff(targetAngle, angle) <= halfAngle, dist };
}

// Dorong lingkaran (px,pz,r) keluar dari semua AABB + dinding ruangan.
// Mengembalikan posisi terkoreksi.
export function resolveCircle(px, pz, r, obstacles, room) {
  let x = Math.max(room.minX + r, Math.min(room.maxX - r, px));
  let z = Math.max(room.minZ + r, Math.min(room.maxZ - r, pz));
  for (const o of obstacles) {
    const closestX = Math.max(o.x - o.hx, Math.min(x, o.x + o.hx));
    const closestZ = Math.max(o.z - o.hz, Math.min(z, o.z + o.hz));
    const dx = x - closestX;
    const dz = z - closestZ;
    const dist2 = dx * dx + dz * dz;
    if (dist2 < r * r) {
      if (dist2 > 1e-9) {
        const dist = Math.sqrt(dist2);
        x = closestX + (dx / dist) * r;
        z = closestZ + (dz / dist) * r;
      } else {
        // Pusat tepat di dalam kotak: dorong ke sisi terdekat.
        const pushLeft = x - (o.x - o.hx);
        const pushRight = (o.x + o.hx) - x;
        const pushUp = z - (o.z - o.hz);
        const pushDown = (o.z + o.hz) - z;
        const m = Math.min(pushLeft, pushRight, pushUp, pushDown);
        if (m === pushLeft) x = o.x - o.hx - r;
        else if (m === pushRight) x = o.x + o.hx + r;
        else if (m === pushUp) z = o.z - o.hz - r;
        else z = o.z + o.hz + r;
      }
    }
  }
  return { x, z };
}
