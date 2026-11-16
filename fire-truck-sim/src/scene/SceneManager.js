import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config.js';

/**
 * 渲染器、场景、相机、轨道控制器与全局裁剪平面的统一管理。
 */
export class SceneManager {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.colors.sceneBg);
    this.scene.fog = new THREE.Fog(CONFIG.colors.sceneBg, 70, 190);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      container.clientWidth / container.clientHeight,
      CONFIG.camera.near,
      CONFIG.camera.far,
    );
    this.camera.position.set(...CONFIG.camera.startPos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...CONFIG.camera.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = CONFIG.camera.minDistance;
    this.controls.maxDistance = CONFIG.camera.maxDistance;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.autoRotateSpeed = 1.6;
    this.controls.update();

    // 全局剖切平面（在车辆局部坐标系内由 ClippingController 每帧重设）
    this.clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    this.renderer.localClippingEnabled = true;

    this._setupLights();

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x30363d, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(22, 34, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
    fill.position.set(-18, 12, -20);
    this.scene.add(fill);
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  resetView() {
    this.camera.position.set(...CONFIG.camera.startPos);
    this.controls.target.set(...CONFIG.camera.target);
    this.controls.update();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
