/**
 * 全局可调参数。集中管理，便于调参。
 */
export const CONFIG = {
  truck: {
    maxSpeed: 12,          // 最大前进速度 m/s
    reverseSpeed: 6,       // 最大倒车速度 m/s
    accel: 9,              // 油门加速度
    brakeDecel: 16,        // 刹车 / 阻力减速度
    steerSpeed: 2.4,       // 转向角速度 rad/s（低速时）
    wheelBase: 3.6,        // 轴距，用于转向几何
    driveBounds: 60,       // 场地行驶边界
  },

  ladder: {
    yawSpeed: 0.9,         // 云梯回转速度 rad/s
    minPitch: 0.12,        // 最小俯仰
    maxPitch: 1.25,        // 最大俯仰（约 72°）
    pitchSpeed: 0.7,
    extensionSpeed: 3.2,   // 伸缩速度 m/s
    maxExtension: 5.2,
  },

  cannon: {
    yawSpeed: 1.6,
    minPitch: -0.25,
    maxPitch: 1.1,
    pitchSpeed: 1.4,
  },

  water: {
    gravity: 14,
    maxParticles: 2200,
    spawnBase: 90,         // 流量 0.5 时每秒粒子数
    spawnMax: 260,         // 流量 1.0 时每秒粒子数
    speed: 22,             // 出膛速度
    spread: 0.035,         // 散射锥角
    particleLife: 2.6,
  },

  ground: { size: 160, gridDiv: 80 },

  clipping: {
    range: 5,              // 滑块行程（相对车辆中心 ±range 米）
  },

  camera: {
    fov: 55,
    near: 0.1,
    far: 600,
    startPos: [11, 7.5, 13],
    target: [0, 2, 0],
    minDistance: 4,
    maxDistance: 70,
  },

  colors: {
    sceneBg: 0x0e131b,
    ground: 0x20262f,
    grid: 0x3a4554,
    road: 0x2b313b,
  },
};
