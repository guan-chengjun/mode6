import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { state } from '../state.js';

function makeDropTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(200,235,255,1)');
  g.addColorStop(0.5, 'rgba(120,195,255,0.85)');
  g.addColorStop(1, 'rgba(80,160,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 消防炮喷水系统：GPU 点精灵粒子，
 * 出膛后仅受重力作用形成抛物线，落地 / 超时回收。
 */
export class WaterSystem {
  constructor(truck) {
    this.truck = truck;
    const max = CONFIG.water.maxParticles;
    this.max = max;

    this.positions = new Float32Array(max * 3);
    this.velocities = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);

    this.geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.PointsMaterial({
      size: 0.16,
      map: makeDropTexture(),
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;

    this.cursor = 0;     // 环形分配游标
    this.active = 0;     // 已使用槽位数（上界）
    this.spawnAcc = 0;
    this._p = new THREE.Vector3();
    this._d = new THREE.Vector3();
  }

  get object() {
    return this.points;
  }

  _spawnOne() {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.active = Math.min(this.active + 1, this.max);

    this.truck.getMuzzlePose(this._p, this._d);

    const spread = CONFIG.water.spread;
    const dir = this._d.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
      ),
    ).normalize();

    const speed = CONFIG.water.speed * (0.92 + Math.random() * 0.16);
    const i3 = i * 3;
    this.positions[i3] = this._p.x;
    this.positions[i3 + 1] = this._p.y;
    this.positions[i3 + 2] = this._p.z;
    this.velocities[i3] = dir.x * speed;
    this.velocities[i3 + 1] = dir.y * speed;
    this.velocities[i3 + 2] = dir.z * speed;

    this.maxLife[i] = CONFIG.water.particleLife * (0.75 + Math.random() * 0.5);
    this.life[i] = this.maxLife[i];
  }

  update(dt) {
    // ---- 发射 ----
    if (state.waterOn) {
      const rate = THREE.MathUtils.lerp(
        CONFIG.water.spawnBase,
        CONFIG.water.spawnMax,
        state.waterFlow,
      );
      this.spawnAcc += rate * dt;
      let n = Math.floor(this.spawnAcc);
      this.spawnAcc -= n;
      while (n-- > 0) this._spawnOne();
    }

    // ---- 积分 ----
    const g = CONFIG.water.gravity;
    let alive = 0;
    for (let i = 0; i < this.active; i++) {
      if (this.life[i] <= 0) continue;
      const i3 = i * 3;

      this.life[i] -= dt;
      this.velocities[i3 + 1] -= g * dt;
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      // 落地 / 出界 / 死亡 → 回收
      const outOfBounds =
        Math.abs(this.positions[i3]) > 80 || Math.abs(this.positions[i3 + 2]) > 80;
      if (this.positions[i3 + 1] <= 0.05 || this.life[i] <= 0 || outOfBounds) {
        this.life[i] = 0;
        continue;
      }
      alive++;
    }

    // ---- 压缩存活粒子到数组前部，更新 drawRange ----
    if (alive < this.active) {
      let write = 0;
      for (let i = 0; i < this.active; i++) {
        if (this.life[i] <= 0) continue;
        if (write !== i) {
          const w3 = write * 3, r3 = i * 3;
          this.positions[w3] = this.positions[r3];
          this.positions[w3 + 1] = this.positions[r3 + 1];
          this.positions[w3 + 2] = this.positions[r3 + 2];
          this.velocities[w3] = this.velocities[r3];
          this.velocities[w3 + 1] = this.velocities[r3 + 1];
          this.velocities[w3 + 2] = this.velocities[r3 + 2];
          this.life[write] = this.life[i];
          this.maxLife[write] = this.maxLife[i];
        }
        write++;
      }
      this.active = alive;
      this.cursor = alive % this.max;
    }

    this.geometry.setDrawRange(0, this.active);
    this.posAttr.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
    this.active = 0;
    this.cursor = 0;
    this.spawnAcc = 0;
    this.geometry.setDrawRange(0, 0);
  }
}
