import { CONFIG } from '../config.js';
import { state } from '../state.js';

/**
 * 侧边控制面板。只负责 DOM 与事件分发，
 * 所有动作通过构造时传入的 actions 回调交给 main.js。
 */
export class ControlPanel {
  constructor(actions) {
    this.actions = actions;
    this.el = document.createElement('div');
    this.el.className = 'control-panel';
    this.el.innerHTML = this._template();
    document.body.appendChild(this.el);

    this._refs = this._collectRefs();
    this._bind();
    this.toastEl = this._createToast();
  }

  // ------------------------------------------------------------------
  _template() {
    return `
      <h1><span class="dot"></span>消防车 3D 交互仿真</h1>
      <p class="panel-hint">拖拽旋转视角 · 滚轮缩放 · 右键平移。驾驶支持键盘 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>。</p>

      <div class="section">
        <h2>观察控制</h2>
        <div class="row">
          <button data-act="auto-rotate" class="blue">自动旋转：关</button>
        </div>
        <div class="row">
          <button data-act="reset-view">重置视角</button>
          <button data-act="reset-truck">重置车辆</button>
        </div>
      </div>

      <div class="section">
        <h2>透视模式</h2>
        <div class="row">
          <button data-act="view-solid" class="active">实体着色</button>
          <button data-act="view-wire">线框透视</button>
          <button data-act="view-section">剖切透视</button>
        </div>
        <div data-when="section">
          <label class="slider-label">剖切轴向
            <select data-el="clip-axis">
              <option value="x">X 轴（左右切）</option>
              <option value="y">Y 轴（水平切）</option>
              <option value="z">Z 轴（前后切）</option>
            </select>
          </label>
          <label class="slider-label">剖切位置 <span data-el="clip-val">0.00 m</span></label>
          <input type="range" data-el="clip-slider"
                 min="${-CONFIG.clipping.range}" max="${CONFIG.clipping.range}"
                 step="0.05" value="0" />
          <p class="panel-hint" style="margin-top:6px">也可直接拖拽场景中的青色球形手柄移动剖切平面。</p>
        </div>
      </div>

      <div class="section">
        <h2>车辆驾驶（按住生效）</h2>
        <div class="row">
          <button data-hold="forward">前进 W</button>
          <button data-hold="backward">后退 S</button>
        </div>
        <div class="row">
          <button data-hold="left">左转 A</button>
          <button data-hold="right">右转 D</button>
        </div>
        <div class="row">
          <button data-act="brake">刹车</button>
        </div>
        <label class="slider-label">当前车速 <span data-el="speed-val">0.0 m/s</span></label>
      </div>

      <div class="section">
        <h2>云梯控制（按住）</h2>
        <div class="row">
          <button data-hold="ladder-left">左转</button>
          <button data-hold="ladder-right">右转</button>
        </div>
        <div class="row">
          <button data-hold="ladder-up">抬升</button>
          <button data-hold="ladder-down">下放</button>
        </div>
        <div class="row">
          <button data-hold="ladder-extend">伸出</button>
          <button data-hold="ladder-retract">收回</button>
        </div>
      </div>

      <div class="section">
        <h2>警灯</h2>
        <div class="row">
          <button data-act="beacon" class="green">警灯：关</button>
        </div>
      </div>

      <div class="section">
        <h2>消防炮 / 喷水</h2>
        <div class="row">
          <button data-hold="cannon-left">炮头左转</button>
          <button data-hold="cannon-right">炮头右转</button>
        </div>
        <div class="row">
          <button data-hold="cannon-up">炮头上抬</button>
          <button data-hold="cannon-down">炮头下压</button>
        </div>
        <div class="row">
          <button data-act="water" class="blue">喷水：关</button>
        </div>
        <label class="slider-label">水流大小 <span data-el="flow-val">60%</span></label>
        <input type="range" data-el="flow-slider" min="0.15" max="1" step="0.05" value="0.6" />
      </div>

      <div class="section">
        <h2>外部模型（GLTF / GLB）</h2>
        <p class="panel-hint">可加载同源 <code>/models/</code> 文件或支持 CORS 的公开合规 URL。</p>
        <div class="model-row">
          <input type="text" data-el="model-url" placeholder="https://…/firetruck.glb" />
        </div>
        <div class="model-row">
          <button data-act="load-model">加载模型</button>
          <button data-act="restore-procedural">恢复内置车</button>
        </div>
        <p class="panel-hint" style="margin-top:6px">当前车体：<span class="mode-indicator" data-el="model-source">内置程序化模型</span></p>
      </div>

      <div class="kbd-hint">
        <kbd>空格</kbd> 刹车 · <kbd>L</kbd> 警灯 · <kbd>F</kbd> 喷水开关 · <kbd>R</kbd> 重置车辆
      </div>
    `;
  }

  _collectRefs() {
    const q = (sel) => this.el.querySelector(sel);
    return {
      autoRotate: q('[data-act="auto-rotate"]'),
      beacon: q('[data-act="beacon"]'),
      water: q('[data-act="water"]'),
      brake: q('[data-act="brake"]'),
      sectionBox: q('[data-when="section"]'),
      clipSlider: q('[data-el="clip-slider"]'),
      clipVal: q('[data-el="clip-val"]'),
      clipAxis: q('[data-el="clip-axis"]'),
      flowSlider: q('[data-el="flow-slider"]'),
      flowVal: q('[data-el="flow-val"]'),
      speedVal: q('[data-el="speed-val"]'),
      modelUrl: q('[data-el="model-url"]'),
      modelSource: q('[data-el="model-source"]'),
      viewButtons: {
        solid: q('[data-act="view-solid"]'),
        wire: q('[data-act="view-wire"]'),
        section: q('[data-act="view-section"]'),
      },
    };
  }

  // ------------------------------------------------------------------
  _bind() {
    // 离散按钮
    this.el.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      this.actions.action?.(btn.dataset.act);
    });

    // 按住型按钮：pointerdown/up + 失焦兜底
    this.el.querySelectorAll('button[data-hold]').forEach((btn) => {
      const key = btn.dataset.hold;
      const on = (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        this.actions.hold?.(key, true);
        btn.classList.add('active');
      };
      const off = () => {
        this.actions.hold?.(key, false);
        btn.classList.remove('active');
      };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    });

    // 滑块
    this._refs.flowSlider.addEventListener('input', (e) => {
      this.actions.setFlow?.(parseFloat(e.target.value));
    });
    this._refs.clipSlider.addEventListener('input', (e) => {
      this.actions.setClipOffset?.(parseFloat(e.target.value));
    });
    this._refs.clipAxis.addEventListener('change', (e) => {
      this.actions.setClipAxis?.(e.target.value);
    });

    // 拖拽手柄移动剖切平面后，回写滑块
    window.addEventListener('clip-offset-changed', (e) => {
      this._refs.clipSlider.value = e.detail.toFixed(2);
      this._refs.clipVal.textContent = `${e.detail.toFixed(2)} m`;
    });
  }

  // ------------------------------------------------------------------
  // 状态回写（由 main.js 在状态变化后调用）

  setAutoRotate(on) {
    const b = this._refs.autoRotate;
    b.classList.toggle('active', on);
    b.textContent = `自动旋转：${on ? '开' : '关'}`;
  }

  setViewMode(mode) {
    for (const [k, btn] of Object.entries(this._refs.viewButtons)) {
      btn.classList.toggle('active', mode === (k === 'wire' ? 'wireframe' : k === 'section' ? 'section' : 'solid'));
    }
    this._refs.sectionBox.style.display = mode === 'section' ? 'block' : 'none';
  }

  setClipOffset(v) {
    this._refs.clipSlider.value = v.toFixed(2);
    this._refs.clipVal.textContent = `${v.toFixed(2)} m`;
  }

  setBeacon(on) {
    const b = this._refs.beacon;
    b.classList.toggle('active', on);
    b.textContent = `警灯：${on ? '开' : '关'}`;
  }

  setWater(on) {
    const b = this._refs.water;
    b.classList.toggle('active', on);
    b.textContent = `喷水：${on ? '开' : '关'}`;
  }

  setFlow(v) {
    this._refs.flowSlider.value = v;
    this._refs.flowVal.textContent = `${Math.round(v * 100)}%`;
  }

  setBrake(on) {
    this._refs.brake.classList.toggle('active', on);
  }

  setSpeed(v) {
    this._refs.speedVal.textContent = `${v.toFixed(1)} m/s`;
  }

  setModelSource(label) {
    this._refs.modelSource.textContent = label;
  }

  // ---------------- 加载遮罩 / toast ----------------

  showLoader(text = '正在加载模型…') {
    const overlay = document.getElementById('loader-overlay');
    document.getElementById('loader-text').textContent = text;
    overlay.hidden = false;
  }

  hideLoader() {
    document.getElementById('loader-overlay').hidden = true;
  }

  _createToast() {
    const el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
    this._toastTimer = null;
    return el;
  }

  toast(msg, isError = false) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.toggle('error', isError);
    this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 2600);
  }
}
