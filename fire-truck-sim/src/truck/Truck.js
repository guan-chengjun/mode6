import * as THREE from 'three';
import { buildTruck } from './TruckBuilder.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';

const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1);
const _v = new THREE.Vector3();

/**
 * 消防车控制器：负责驾驶运动学、车轮滚动/转向、
 * 云梯与消防炮的状态映射、警灯闪烁，并对外提供喷水口位姿。
 */
export class Truck {
  constructor(sceneManager) {
    this.sm = sceneManager;
    const built = buildTruck();
    this.group = built.group;
    this.refs = built.refs;
    this.refs.source = 'procedural';
    sceneManager.scene.add(this.group);

    this._beaconTime = 0;
    this._steerVisual = 0;
  }

  /** 重置车辆位置与所有运动状态（视角由 ControlPanel 单独调用 resetView） */
  reset() {
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    state.speed = 0;
    state.throttle = 0;
    state.steerInput = 0;
    state.brake = false;
    state.ladderYaw = 0;
    state.ladderPitch = 0.25;
    state.ladderExtension = 0;
    state.cannonYaw = 0;
    state.cannonPitch = 0.35;
    this._syncKinematics(0, 0);
    this._syncAppendages();
  }

  update(dt) {
    const cfg = CONFIG.truck;

    // ---- 纵向动力学 ----
    if (state.throttle > 0) {
      state.speed += cfg.accel * state.throttle * dt;
    } else if (state.throttle < 0) {
      state.speed += cfg.accel * state.throttle * dt;
    } else {
      // 自然阻力
      const drag = cfg.brakeDecel * 0.35 * dt;
      if (Math.abs(state.speed) <= drag) state.speed = 0;
      else state.speed -= Math.sign(state.speed) * drag;
    }
    if (state.brake) {
      const d = cfg.brakeDecel * dt;
      if (Math.abs(state.speed) <= d) state.speed = 0;
      else state.speed -= Math.sign(state.speed) * d;
    }
    state.speed = THREE.MathUtils.clamp(state.speed, -cfg.reverseSpeed, cfg.maxSpeed);

    // ---- 自行车转向模型 ----
    const steerAngle = state.steerInput * 0.5;
    let yawRate = 0;
    if (Math.abs(state.speed) > 0.05) {
      yawRate = (state.speed / cfg.wheelBase) * Math.tan(steerAngle);
      // 速度因子：静止不转向，高速转向收敛
      yawRate *= THREE.MathUtils.clamp(Math.abs(state.speed) / 3, 0, 1);
    }
    this.group.rotation.y += yawRate * dt;

    // ---- 位移 ----
    const fwd = _v.set(0, 0, 1).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.group.rotation.y);
    this.group.position.addScaledVector(fwd, state.speed * dt);

    // 场地边界
    const b = cfg.driveBounds - 1;
    const p = this.group.position;
    if (Math.abs(p.x) > b || Math.abs(p.z) > b) {
      p.x = THREE.MathUtils.clamp(p.x, -b, b);
      p.z = THREE.MathUtils.clamp(p.z, -b, b);
      state.speed = 0;
    }

    this._syncKinematics(dt, steerAngle);
    this._syncAppendages();
    this._updateBeacons(dt);
  }

  _syncKinematics(dt, steerAngle) {
    // 车轮滚动 + 前轮转向
    for (const w of this.refs.wheels) {
      w.spinner.rotation.x -= (state.speed * dt) / w.radius;
      if (w.front) {
        // 平滑趋近目标转角
        this._steerVisual = THREE.MathUtils.damp(this._steerVisual, steerAngle, 9, dt);
        w.pivot.rotation.y = this._steerVisual;
      }
    }
  }

  _syncAppendages() {
    const r = this.refs;
    r.ladderYaw.rotation.y = state.ladderYaw;
    r.ladderPitch.rotation.x = -state.ladderPitch;

    // 伸缩：二、三节沿梯架局部 +Z 滑出
    const ext = state.ladderExtension;
    if (r.ladderSegments.length >= 2) {
      r.ladderSegments[0].position.z = ext * 0.62;
      r.ladderSegments[1].position.z = ext * 1.24;
    }

    r.cannonYaw.rotation.y = state.cannonYaw;
    r.cannonPitch.rotation.x = -state.cannonPitch;
  }

  _updateBeacons(dt) {
    const active = state.beaconsOn;
    this._beaconTime += dt;
    for (const b of this.refs.beacons) {
      const pulse = active && Math.sin(this._beaconTime * 9 + b.phase) > 0.15;
      if (b.light) b.light.intensity = pulse ? 7 : 0;
      if (b.mesh?.material?.emissive) {
        b.mesh.material.emissiveIntensity = pulse ? 2.4 : 0.15;
      }
    }
  }

  /** 喷水口世界坐标与世界朝向（单位向量） */
  getMuzzlePose(position, direction) {
    if (!this._mq) this._mq = new THREE.Quaternion();
    this.refs.muzzle.getWorldPosition(position);
    this.refs.muzzle.getWorldQuaternion(this._mq);
    direction.copy(LOCAL_FORWARD).applyQuaternion(this._mq).normalize();
    return { position, direction };
  }

  // ------------------------------------------------------------------
  // 外部 GLTF/GLB 模型替换
  // ------------------------------------------------------------------

  /**
   * 用已加载的 GLTF 场景替换程序化车体。
   * 节点按名称约定识别可动部件（见 README「模型命名约定」），
   * 识别不到的部件对应功能会自动降级（仅保留可识别部分）。
   */
  applyModel(gltfScene) {
    this.sm.scene.remove(this.group);

    const wrapper = new THREE.Group();
    wrapper.name = 'FireTruck';
    wrapper.add(gltfScene);
    normalizeModel(wrapper, gltfScene);
    this.group = wrapper;
    this.refs = extractRefs(wrapper);
    this.refs.source = 'gltf';
    this.sm.scene.add(wrapper);

    this.reset();
  }
}

/**
 * 缩放 / 居中：车长归一到约 7.5m，底部落在 y=0，中心对齐原点。
 * 缩放挂在包装组上，居中偏移烘焙进模型子节点，
 * 这样 reset() 把包装组位置清零时不会丢失居中结果。
 */
function normalizeModel(wrapper, gltfScene) {
  const box0 = new THREE.Box3().setFromObject(gltfScene);
  const size0 = box0.getSize(new THREE.Vector3());
  const len = Math.max(size0.x, size0.z);
  if (len > 0.001) wrapper.scale.setScalar(7.5 / len);

  const box = new THREE.Box3().setFromObject(wrapper);
  const center = box.getCenter(new THREE.Vector3());
  gltfScene.position.x -= center.x;
  gltfScene.position.z -= center.z;
  gltfScene.position.y -= box.min.y;
}

const has = (name, ...keys) => keys.some((k) => name.includes(k));

/**
 * 按名称约定从 GLTF 子树提取具名部件与材质。
 */
function extractRefs(root) {
  const wheels = [];
  const beacons = [];
  const ladderSegments = [];
  let ladderYaw = null, ladderPitch = null;
  let cannonYaw = null, cannonPitch = null, muzzle = null;
  const materialSet = new Set();

  root.traverse((obj) => {
    const name = (obj.name || '').toLowerCase();

    if (obj.isMesh) {
      obj.castShadow = true;
      obj.geometry?.computeBoundingSphere?.();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m && materialSet.add(m));
    }

    if (has(name, 'wheel', 'tire', '轮胎')) {
      const wp = obj.parent && obj.parent.name ? obj.parent : obj;
      wheels.push({
        pivot: wp,
        spinner: obj,
        radius: obj.geometry?.boundingSphere?.radius || 0.5,
        front: obj.position.z > 0,
      });
    }
    if (has(name, 'ladder', '云梯')) {
      if (has(name, 'yaw', 'rot', 'turn', 'base', 'turntable') && !ladderYaw) ladderYaw = obj;
      if (has(name, 'pitch', 'tilt', 'lift') && !ladderPitch) ladderPitch = obj;
      if (has(name, 'extend', 'telescop', 'section', 'segment', '节')) ladderSegments.push(obj);
    }
    if (has(name, 'cannon', 'monitor', 'nozzle', '炮')) {
      if (has(name, 'yaw', 'rot', 'base') && !cannonYaw) cannonYaw = obj;
      if (has(name, 'pitch', 'tilt') && !cannonPitch) cannonPitch = obj;
      if (has(name, 'muzzle', 'nozzle', 'outlet', 'tip') && !muzzle) muzzle = obj;
    }
    if (has(name, 'beacon', 'siren', 'warning', '警灯', 'lamp')) {
      const isRed = has(name, 'red', '红');
      const color = new THREE.Color(isRed ? 0xff2233 : 0x2266ff);
      let light = null;
      if (obj.isPointLight) light = obj;
      const mat = obj.material && !Array.isArray(obj.material) ? obj.material : null;
      if (mat && mat.emissive) mat.emissive = color;
      beacons.push({
        mesh: obj.isMesh ? obj : null,
        light,
        phase: isRed ? 0 : Math.PI,
        baseColor: color,
      });
    }
  });

  // 降级：未识别到的节点挂到根上，保证引用不为空
  if (!ladderYaw) ladderYaw = root;
  if (!ladderPitch) ladderPitch = ladderYaw;
  if (!cannonYaw) cannonYaw = root;
  if (!cannonPitch) cannonPitch = cannonYaw;
  if (!muzzle) muzzle = makeFallbackMuzzle(root);

  const allMats = [...materialSet];
  // 外部模型统一归入外壳分组参与线框 / 剖切
  const materials = {
    body: allMats, glass: [], internal: [], tank: [], pipe: [],
    dark: [], door: [], wheel: [], ladder: [], headlight: [],
    beacons: allMats.filter((m) => m.emissive),
    _shellKinds: ['body'],
    _clipKinds: ['body'],
  };

  return {
    wheels, beacons, ladderYaw, ladderPitch, ladderSegments,
    basket: null, cannonYaw, cannonPitch, muzzle, materials,
  };
}

function makeFallbackMuzzle(root) {
  const m = new THREE.Object3D();
  m.name = 'fallback-muzzle';
  m.position.set(0, 2.8, 3.2);
  root.add(m);
  return m;
}
