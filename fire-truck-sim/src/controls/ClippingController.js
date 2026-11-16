import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { state } from '../state.js';

const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/**
 * 透视剖切控制器。
 *  solid     ：实体着色
 *  wireframe ：外覆盖件线框化，内部车架 / 水箱 / 管路保持实体可见
 *  section   ：启用全局裁剪平面（车辆局部坐标），可通过滑块或拖拽手柄移动
 */
export class ClippingController {
  constructor(sceneManager, truck) {
    this.sm = sceneManager;
    this.truck = truck;
    this.clipPlane = sceneManager.clipPlane;

    // 剖切辅助面（跟随车辆，挂在车组下）
    this.helper = new THREE.Group();
    this.helper.name = 'clip-helper';
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x66ddff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), planeMat);
    planeMesh.rotation.x = -Math.PI / 2;
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(4.6, 4.6)),
      new THREE.LineBasicMaterial({ color: 0x9beaff, transparent: true, opacity: 0.9 }),
    );
    edge.rotation.x = -Math.PI / 2;

    this.handleMat = new THREE.MeshBasicMaterial({ color: 0x8ff0ff, depthTest: false });
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), this.handleMat);
    // 辅助面局部 +Z 即裁剪法线方向，旋转辅助面后手柄始终位于轴线上
    handle.position.set(0, 0, 2.5);
    handle.renderOrder = 999;

    this.helper.add(planeMesh, edge, handle);
    this.handle = handle;
    this.helper.visible = false;
    truck.group.add(this.helper);

    this._saved = new Map();
    this._dragging = false;
    this._setupDrag();
  }

  /** 外部 GLTF 模型替换车体后，重新挂载辅助面与车辆引用 */
  bindTruck(truck) {
    this.truck = truck;
    truck.group.add(this.helper);
    this.helper.visible = state.viewMode === 'section';
  }

  // ---------------- 材质快照 / 还原 ----------------

  _allMaterials() {
    const groups = this.truck.refs.materials;
    const out = [];
    for (const key of Object.keys(groups)) {
      if (key.startsWith('_')) continue;
      const v = groups[key];
      if (Array.isArray(v)) out.push(...v);
    }
    return [...new Set(out)];
  }

  _snapshot(mat) {
    if (!this._saved.has(mat)) {
      this._saved.set(mat, {
        wireframe: mat.wireframe ?? false,
        opacity: mat.opacity ?? 1,
        transparent: mat.transparent ?? false,
        clippingPlanes: mat.clippingPlanes ?? null,
        clipShadows: mat.clipShadows ?? false,
      });
    }
  }

  _restoreAll() {
    for (const [mat, s] of this._saved) {
      mat.wireframe = s.wireframe;
      mat.opacity = s.opacity;
      mat.transparent = s.transparent;
      mat.clippingPlanes = s.clippingPlanes;
      mat.clipShadows = s.clipShadows;
      mat.needsUpdate = true;
    }
    this._saved.clear();
  }

  // ---------------- 模式切换 ----------------

  setMode(mode) {
    state.viewMode = mode;
    this._restoreAll();
    const groups = this.truck.refs.materials;

    if (mode === 'wireframe') {
      for (const kind of groups._shellKinds ?? ['body']) {
        for (const mat of groups[kind] ?? []) {
          this._snapshot(mat);
          mat.wireframe = true;
          mat.needsUpdate = true;
        }
      }
      // 玻璃进一步淡化，避免遮挡内部
      for (const mat of groups.glass ?? []) {
        this._snapshot(mat);
        mat.transparent = true;
        mat.opacity = 0.1;
      }
      this.helper.visible = false;
    } else if (mode === 'section') {
      const clipKinds = groups._clipKinds ?? ['body'];
      for (const kind of clipKinds) {
        for (const mat of groups[kind] ?? []) {
          this._snapshot(mat);
          mat.clippingPlanes = [this.clipPlane];
          mat.clipShadows = true;
          mat.needsUpdate = true;
        }
      }
      this.helper.visible = true;
    } else {
      this.helper.visible = false;
    }
  }

  setAxis(axis) {
    state.clipAxis = axis;
    if (state.viewMode === 'section') this._updatePlane();
  }

  setOffset(offset) {
    state.clipOffset = offset;
    if (state.viewMode === 'section') this._updatePlane();
  }

  // ---------------- 每帧同步 ----------------

  update() {
    if (state.viewMode !== 'section') return;
    this._updatePlane();
  }

  _updatePlane() {
    // 裁剪平面在车辆局部空间定义，再变换到世界空间（跟随车辆移动/转向）
    const localNormal = AXIS_VECTORS[state.clipAxis].clone();
    const localPoint = localNormal.clone().multiplyScalar(state.clipOffset);

    const worldNormal = localNormal
      .clone()
      .transformDirection(this.truck.group.matrixWorld);
    const worldPoint = localPoint
      .clone()
      .applyMatrix4(this.truck.group.matrixWorld);

    this.clipPlane.normal.copy(worldNormal);
    this.clipPlane.constant = -worldPoint.dot(worldNormal);

    // 辅助面朝向：法线与裁剪平面一致
    this.helper.position.copy(localPoint);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      localNormal,
    );
    this.helper.quaternion.copy(q);
  }

  // ---------------- 手柄拖拽 ----------------

  _setupDrag() {
    const dom = this.sm.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane();
    const hit = new THREE.Vector3();
    const start = new THREE.Vector3();

    const setPointer = (e) => {
      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    dom.addEventListener('pointerdown', (e) => {
      if (state.viewMode !== 'section' || this.helper.visible === false) return;
      setPointer(e);
      raycaster.setFromCamera(pointer, this.sm.camera);
      if (!raycaster.intersectObject(this.handle, false).length) return;

      this._dragging = true;
      this.sm.controls.enabled = false;
      dom.setPointerCapture(e.pointerId);

      const axis = AXIS_VECTORS[state.clipAxis]
        .clone()
        .transformDirection(this.truck.group.matrixWorld);
      const origin = new THREE.Vector3().setFromMatrixPosition(this.truck.group.matrixWorld);
      dragPlane.setFromNormalAndCoplanarPoint(axis, origin);
      raycaster.ray.intersectPlane(dragPlane, start);
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this._dragging) return;
      setPointer(e);
      raycaster.setFromCamera(pointer, this.sm.camera);
      if (!raycaster.ray.intersectPlane(dragPlane, hit)) return;

      const axis = AXIS_VECTORS[state.clipAxis]
        .clone()
        .transformDirection(this.truck.group.matrixWorld);
      const origin = new THREE.Vector3().setFromMatrixPosition(this.truck.group.matrixWorld);
      const offset = hit.clone().sub(origin).dot(axis);
      const clamped = THREE.MathUtils.clamp(offset, -CONFIG.clipping.range, CONFIG.clipping.range);
      this.setOffset(clamped);
      // 通知 UI 滑块同步（main.js 监听）
      window.dispatchEvent(new CustomEvent('clip-offset-changed', { detail: clamped }));
    });

    const endDrag = (e) => {
      if (!this._dragging) return;
      this._dragging = false;
      this.sm.controls.enabled = true;
      try { dom.releasePointerCapture(e.pointerId); } catch { /* 忽略 */ }
    };
    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointercancel', endDrag);
  }
}
