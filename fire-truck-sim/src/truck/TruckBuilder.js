import * as THREE from 'three';

/**
 * 程序化消防车建模。
 * 所有可动部件均以具名引用返回：
 *  - wheels（转向枢轴 + 滚动轴）、ladderYaw/Pitch、伸缩节、
 *  - cannonYaw/Pitch、muzzle（喷水口）、beacons（警灯）
 *  - materials 按用途分组，供透视 / 剖切 / 线框模式统一切换
 *
 * 局部坐标约定：+Z 为车头方向，+Y 向上，+X 为车辆右侧。
 */
export function buildTruck() {
  const mats = createMaterials();
  const group = new THREE.Group();
  group.name = 'FireTruck';

  const wheels = [];
  const beacons = [];

  // ---------- 内部结构：车架 ----------
  const frame = new THREE.Group();
  frame.name = 'chassis-frame';
  for (const x of [-0.55, 0.55]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 6.4), mats.internal);
    rail.position.set(x, 0.82, -0.1);
    rail.castShadow = true;
    frame.add(rail);
  }
  for (const z of [-1.9, 0, 1.9]) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.16), mats.internal);
    cross.position.set(0, 0.82, z);
    frame.add(cross);
  }
  group.add(frame);

  // ---------- 车桥 ----------
  for (const z of [1.9, -1.9]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.35, 12), mats.dark);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.58, z);
    group.add(axle);
  }

  // ---------- 车轮（前轮带转向枢轴） ----------
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 24);
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.46, 16);
  for (const z of [1.9, -1.9]) {
    for (const x of [-1.15, 1.15]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.58, z);

      const spinner = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, mats.wheel);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      const hub = new THREE.Mesh(hubGeo, mats.internal);
      hub.rotation.z = Math.PI / 2;
      spinner.add(tire, hub);
      pivot.add(spinner);
      group.add(pivot);

      wheels.push({ pivot, spinner, radius: 0.55, front: z > 0 });
    }
  }

  // ---------- 水箱（车厢内部，半透明青色） ----------
  const tank = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.25, 3.0), mats.tank);
  tank.position.set(0, 1.62, -1.05);
  group.add(tank);

  // ---------- 管路（底盘两侧 + 通向消防炮的竖管） ----------
  const pipeGroup = new THREE.Group();
  for (const x of [-0.85, 0.85]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 4.6, 12),
      mats.pipe,
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, 0.98, -0.6);
    pipeGroup.add(pipe);
  }
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 12), mats.pipe);
  riser.position.set(0, 2.0, 2.05);
  pipeGroup.add(riser);
  const crossPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.7, 12),
    mats.pipe,
  );
  crossPipe.rotation.z = Math.PI / 2;
  crossPipe.position.set(0, 2.72, 2.05);
  pipeGroup.add(crossPipe);
  group.add(pipeGroup);

  // ---------- 驾驶室 ----------
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.0, 2.0), mats.body);
  cab.position.set(0, 1.72, 2.35);
  cab.castShadow = true;
  group.add(cab);

  // 前挡风玻璃
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 0.08), mats.glass);
  windshield.position.set(0, 2.15, 3.37);
  group.add(windshield);
  // 侧窗
  for (const x of [-1.19, 1.19]) {
    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.95), mats.glass);
    sideWin.position.set(x, 2.15, 2.45);
    group.add(sideWin);
  }
  // 车灯
  for (const x of [-0.8, 0.8]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.1), mats.headlight);
    head.position.set(x, 1.1, 3.38);
    group.add(head);
  }
  // 保险杠
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 0.2), mats.dark);
  bumperF.position.set(0, 0.7, 3.45);
  group.add(bumperF);

  // ---------- 车厢（设备箱体） ----------
  const bodyBox = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.9, 3.7), mats.body);
  bodyBox.position.set(0, 1.78, -1.05);
  bodyBox.castShadow = true;
  group.add(bodyBox);

  // 卷帘门（两侧）
  for (const x of [-1.19, 1.19]) {
    for (const z of [-2.2, -0.95, 0.3]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.45, 1.05), mats.door);
      door.position.set(x, 1.65, z);
      group.add(door);
    }
  }
  // 后保险杠与踏板
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, 0.2), mats.dark);
  bumperR.position.set(0, 0.7, -3.0);
  group.add(bumperR);

  // ---------- 云梯：回转台 → 俯仰架 → 三节伸缩梯 ----------
  const ladderYaw = new THREE.Group();
  ladderYaw.name = 'ladder-yaw';
  ladderYaw.position.set(0, 2.78, -1.1);
  group.add(ladderYaw);

  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.7, 0.24, 24),
    mats.dark,
  );
  turntable.castShadow = true;
  ladderYaw.add(turntable);

  const ladderPitch = new THREE.Group();
  ladderPitch.name = 'ladder-pitch';
  ladderYaw.add(ladderPitch);

  const ladderSegments = [];
  const segWidths = [0.56, 0.44, 0.33];
  const segLen = 3.4;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    const w = segWidths[i];
    for (const sx of [-w / 2, w / 2]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, segLen), mats.ladder);
      beam.position.set(sx, 0, segLen / 2);
      beam.castShadow = true;
      seg.add(beam);
    }
    // 梯蹬
    const rungCount = 7;
    for (let r = 0; r < rungCount; r++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.06), mats.ladder);
      rung.position.set(0, 0, 0.3 + (r * (segLen - 0.6)) / (rungCount - 1));
      seg.add(rung);
    }
    ladderPitch.add(seg);
    ladderSegments.push(seg);
  }

  // 梯端工作斗
  const basket = new THREE.Group();
  basket.position.set(0, 0, segLen + 0.15);
  const basketFloor = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.75), mats.ladder);
  basketFloor.position.z = 0.3;
  basket.add(basketFloor);
  for (const sx of [-0.36, 0.36]) {
    for (const sz of [-0.02, 0.62]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), mats.ladder);
      post.position.set(sx, 0.38, sz);
      basket.add(post);
    }
  }
  ladderSegments[2].add(basket);

  // ---------- 消防炮（车顶）：回转 + 俯仰 + 炮管 + 喷口 ----------
  const cannonYaw = new THREE.Group();
  cannonYaw.name = 'cannon-yaw';
  cannonYaw.position.set(0, 2.78, 2.35);
  group.add(cannonYaw);

  const cannonBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.32, 0.22, 20),
    mats.dark,
  );
  cannonYaw.add(cannonBase);

  const cannonPitch = new THREE.Group();
  cannonPitch.name = 'cannon-pitch';
  cannonYaw.add(cannonPitch);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, 0.95, 16),
    mats.pipe,
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.45;
  barrel.castShadow = true;
  cannonPitch.add(barrel);
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.09, 0.28, 16),
    mats.dark,
  );
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = 1.02;
  cannonPitch.add(nozzle);

  const muzzle = new THREE.Object3D();
  muzzle.name = 'muzzle';
  muzzle.position.set(0, 0, 1.18);
  cannonPitch.add(muzzle);

  // ---------- 警灯 ----------
  const beaconSpecs = [
    { x: -0.72, y: 2.86, z: 2.7, color: 0xff2233, phase: 0 },
    { x: 0.72, y: 2.86, z: 2.7, color: 0x2266ff, phase: Math.PI },
    { x: -0.72, y: 2.86, z: -2.5, color: 0xff2233, phase: Math.PI },
    { x: 0.72, y: 2.86, z: -2.5, color: 0x2266ff, phase: 0 },
  ];
  for (const spec of beaconSpecs) {
    const color = new THREE.Color(spec.color);
    const mat = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.25),
      emissive: color,
      emissiveIntensity: 0.15,
      roughness: 0.3,
    });
    mats.beacons.push(mat);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.26), mat);
    mesh.position.set(spec.x, spec.y, spec.z);
    group.add(mesh);

    const light = new THREE.PointLight(spec.color, 0, 9, 2);
    light.position.set(spec.x, spec.y + 0.15, spec.z);
    group.add(light);
    beacons.push({ mesh, light, phase: spec.phase, baseColor: color });
  }

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = obj.castShadow ?? true;
      obj.receiveShadow = false;
    }
  });

  return {
    group,
    refs: {
      wheels,
      beacons,
      ladderYaw,
      ladderPitch,
      ladderSegments: [ladderSegments[1], ladderSegments[2]],
      basket,
      cannonYaw,
      cannonPitch,
      muzzle,
      materials: mats,
    },
  };
}

/**
 * 材质分组：
 *  body     车身外覆盖件（红色）—— 线框 / 剖切的主要对象
 *  glass    玻璃
 *  internal 车架 / 轮毂等内部金属结构
 *  tank     水箱
 *  pipe     管路 / 炮管
 *  dark / door / wheel / ladder / headlight / beacons
 */
function createMaterials() {
  const body = new THREE.MeshStandardMaterial({
    color: 0xd21f2b,
    roughness: 0.42,
    metalness: 0.25,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fc8e8,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.45,
  });
  const internal = new THREE.MeshStandardMaterial({
    color: 0x9aa3ad,
    roughness: 0.55,
    metalness: 0.7,
  });
  const tank = new THREE.MeshPhysicalMaterial({
    color: 0x39c6e8,
    roughness: 0.15,
    metalness: 0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const pipe = new THREE.MeshStandardMaterial({
    color: 0xc9772e,
    roughness: 0.45,
    metalness: 0.55,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x23272d,
    roughness: 0.7,
    metalness: 0.4,
  });
  const door = new THREE.MeshStandardMaterial({
    color: 0x8f969e,
    roughness: 0.5,
    metalness: 0.6,
  });
  const wheel = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.85,
    metalness: 0.1,
  });
  const ladder = new THREE.MeshStandardMaterial({
    color: 0xe8e4da,
    roughness: 0.4,
    metalness: 0.65,
  });
  const headlight = new THREE.MeshStandardMaterial({
    color: 0xfff4c2,
    emissive: 0xffe9a0,
    emissiveIntensity: 0.9,
  });

  return {
    body: [body],
    glass: [glass],
    internal: [internal],
    tank: [tank],
    pipe: [pipe],
    dark: [dark],
    door: [door],
    wheel: [wheel],
    ladder: [ladder],
    headlight: [headlight],
    beacons: [],
    // 会被线框化的外覆盖件分组
    _shellKinds: ['body', 'glass', 'door'],
    // 会被剖切的分组（外壳 + 水箱 + 管路，车架不切以保持结构可读）
    _clipKinds: ['body', 'glass', 'door', 'tank', 'pipe'],
  };
}
