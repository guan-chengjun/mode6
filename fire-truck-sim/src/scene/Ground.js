import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * 场地：地面、网格、环形车道与若干场地标识物。
 */
export function createGround() {
  const group = new THREE.Group();
  group.name = 'ground';

  const groundMat = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.ground,
    roughness: 0.95,
    metalness: 0,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.ground.size, CONFIG.ground.size),
    groundMat,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const grid = new THREE.GridHelper(
    CONFIG.ground.size,
    CONFIG.ground.gridDiv,
    CONFIG.colors.grid,
    CONFIG.colors.grid,
  );
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  grid.position.y = 0.01;
  group.add(grid);

  // 环形车道
  const roadMat = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.road,
    roughness: 0.9,
  });
  const road = new THREE.Mesh(new THREE.RingGeometry(13.5, 20.5, 96), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.015;
  road.receiveShadow = true;
  group.add(road);

  // 车道虚线
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd9d9c0 });
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.1), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.z = -a;
    dash.position.set(Math.cos(a) * 17, 0.025, Math.sin(a) * 17);
    group.add(dash);
  }

  // 场地边界锥桶
  const coneGeo = new THREE.ConeGeometry(0.28, 0.85, 16);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.6 });
  const coneBaseMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const cone = new THREE.Group();
    const body = new THREE.Mesh(coneGeo, coneMat);
    body.position.y = 0.425;
    body.castShadow = true;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), coneBaseMat);
    base.position.y = 0.04;
    cone.add(base, body);
    cone.position.set(
      Math.cos(a) * CONFIG.truck.driveBounds,
      0,
      Math.sin(a) * CONFIG.truck.driveBounds,
    );
    group.add(cone);
  }

  return group;
}
