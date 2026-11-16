import './styles.css';
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { state } from './state.js';
import { SceneManager } from './scene/SceneManager.js';
import { createGround } from './scene/Ground.js';
import { Truck } from './truck/Truck.js';
import { loadTruckModel } from './truck/ModelLoader.js';
import { WaterSystem } from './water/WaterSystem.js';
import { ClippingController } from './controls/ClippingController.js';
import { InputController } from './controls/InputController.js';
import { ControlPanel } from './ui/ControlPanel.js';

class App {
  constructor() {
    const container = document.getElementById('app');
    this.sm = new SceneManager(container);
    this.sm.scene.add(createGround());

    this.truck = new Truck(this.sm);
    this.water = new WaterSystem(this.truck);
    this.sm.scene.add(this.water.object);
    this.clipping = new ClippingController(this.sm, this.truck);

    // 按住型输入的当前状态（面板按钮与键盘共用）
    this.holds = new Set();

    this.panel = new ControlPanel({
      action: (act) => this.onAction(act),
      hold: (key, pressed) => this.onHold(key, pressed),
      setFlow: (v) => { state.waterFlow = v; this.panel.setFlow(v); },
      setClipOffset: (v) => this.clipping.setOffset(v),
      setClipAxis: (axis) => this.clipping.setAxis(axis),
    });
    this.panel.setViewMode('solid');
    this.panel.setFlow(state.waterFlow);
    this.panel.setClipOffset(0);

    this.input = new InputController({
      action: (act) => this.onAction(act),
      hold: (key, pressed) => this.onHold(key, pressed),
    });

    this.timer = new THREE.Timer();
    this._render = this._render.bind(this);
    this._animate();
  }

  // ----------------------------------------------------------------
  // 离散动作
  onAction(act) {
    switch (act) {
      case 'auto-rotate':
        state.autoRotate = !state.autoRotate;
        this.sm.controls.autoRotate = state.autoRotate;
        this.panel.setAutoRotate(state.autoRotate);
        break;
      case 'reset-view':
        this.sm.resetView();
        this.panel.toast('视角已重置');
        break;
      case 'reset-truck':
        this.truck.reset();
        this.clipping.setMode(state.viewMode);
        this.panel.setClipOffset(0);
        this.panel.setSpeed(0);
        this.panel.toast('车辆位置与姿态已重置');
        break;
      case 'view-solid':
        this.clipping.setMode('solid');
        this.panel.setViewMode('solid');
        break;
      case 'view-wire':
        this.clipping.setMode('wireframe');
        this.panel.setViewMode('wireframe');
        break;
      case 'view-section':
        this.clipping.setMode('section');
        this.panel.setViewMode('section');
        this.clipping.update();
        break;
      case 'brake':
        state.brake = !state.brake;
        this.panel.setBrake(state.brake);
        break;
      case 'beacon':
        state.beaconsOn = !state.beaconsOn;
        this.panel.setBeacon(state.beaconsOn);
        break;
      case 'water':
        state.waterOn = !state.waterOn;
        this.panel.setWater(state.waterOn);
        if (!state.waterOn) this.water.clear();
        break;
      case 'load-model':
        this._loadModel();
        break;
      case 'restore-procedural':
        location.reload();
        break;
      default:
        break;
    }
  }

  // 按住型输入
  onHold(key, pressed) {
    if (pressed) this.holds.add(key);
    else this.holds.delete(key);
  }

  // ----------------------------------------------------------------
  // 外部模型加载

  async _loadModel() {
    const raw = this.panel._refs.modelUrl.value.trim();
    if (!raw) {
      this.panel.toast('请先输入 GLTF/GLB 的 URL 或 /models/ 路径', true);
      return;
    }
    let url = raw;
    try {
      // 相对路径（/models/...）直接放行；绝对 URL 仅允许 http/https
      if (!url.startsWith('/')) new URL(url);
    } catch {
      this.panel.toast('URL 格式不合法', true);
      return;
    }

    this.panel.showLoader('正在加载消防车模型…');
    try {
      const model = await loadTruckModel(url);
      this.truck.applyModel(model);
      // 剖切控制器重新绑定到新车组，并恢复当前透视模式
      this.clipping.bindTruck(this.truck);
      this.clipping.setMode(state.viewMode);
      this.panel.setModelSource(this._shortName(url));
      this.panel.toast('模型加载成功');
    } catch (err) {
      console.error(err);
      this.panel.toast(`模型加载失败：${err?.message ?? '网络或 CORS 错误'}`, true);
    } finally {
      this.panel.hideLoader();
    }
  }

  _shortName(url) {
    try {
      if (url.startsWith('/')) return url.split('/').pop();
      return new URL(url).pathname.split('/').pop() || '外部 GLTF 模型';
    } catch {
      return '外部 GLTF 模型';
    }
  }

  // ----------------------------------------------------------------
  // 连续输入 → 状态量

  _applyHolds(dt) {
    const h = this.holds;

    // 驾驶
    state.throttle = (h.has('forward') ? 1 : 0) - (h.has('backward') ? 1 : 0);
    state.steerInput = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0);

    const L = CONFIG.ladder;
    if (h.has('ladder-left')) state.ladderYaw += L.yawSpeed * dt;
    if (h.has('ladder-right')) state.ladderYaw -= L.yawSpeed * dt;
    if (h.has('ladder-up')) {
      state.ladderPitch = Math.min(L.maxPitch, state.ladderPitch + L.pitchSpeed * dt);
    }
    if (h.has('ladder-down')) {
      state.ladderPitch = Math.max(L.minPitch, state.ladderPitch - L.pitchSpeed * dt);
    }
    if (h.has('ladder-extend')) {
      state.ladderExtension = Math.min(L.maxExtension, state.ladderExtension + L.extensionSpeed * dt);
    }
    if (h.has('ladder-retract')) {
      state.ladderExtension = Math.max(0, state.ladderExtension - L.extensionSpeed * dt);
    }

    const C = CONFIG.cannon;
    if (h.has('cannon-left')) state.cannonYaw += C.yawSpeed * dt;
    if (h.has('cannon-right')) state.cannonYaw -= C.yawSpeed * dt;
    if (h.has('cannon-up')) {
      state.cannonPitch = Math.min(C.maxPitch, state.cannonPitch + C.pitchSpeed * dt);
    }
    if (h.has('cannon-down')) {
      state.cannonPitch = Math.max(C.minPitch, state.cannonPitch - C.pitchSpeed * dt);
    }
  }

  // ----------------------------------------------------------------
  _animate() {
    requestAnimationFrame(this._render);
  }

  _render() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    this._applyHolds(dt);
    this.truck.update(dt);
    this.water.update(dt);
    this.clipping.update();
    this.panel.setSpeed(state.speed);
    this.sm.render();
    this._animate();
  }
}

const app = new App();
export default app;
