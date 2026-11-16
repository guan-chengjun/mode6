/**
 * 全局仿真状态（单一数据源）。
 * 离散动作走 main.js 的回调，连续量各模块每帧读写此对象。
 */
export const state = {
  // 观察
  autoRotate: false,

  // 透视模式：solid（实体） / wireframe（线框透视） / section（剖切透视）
  viewMode: 'solid',
  clipAxis: 'x',
  clipOffset: 0,

  // 车辆运动输入
  throttle: 0,        // -1（倒车）~ 1（前进）
  brake: false,
  steerInput: 0,      // -1（左）~ 1（右）
  speed: 0,

  // 云梯
  ladderYaw: 0,
  ladderPitch: 0.25,
  ladderExtension: 0,

  // 消防炮
  cannonYaw: 0,
  cannonPitch: 0.35,

  // 警灯
  beaconsOn: false,

  // 喷水
  waterOn: false,
  waterFlow: 0.6,
};

export function resetState() {
  state.autoRotate = false;
  state.viewMode = 'solid';
  state.clipAxis = 'x';
  state.clipOffset = 0;
  state.throttle = 0;
  state.brake = false;
  state.steerInput = 0;
  state.speed = 0;
  state.ladderYaw = 0;
  state.ladderPitch = 0.25;
  state.ladderExtension = 0;
  state.cannonYaw = 0;
  state.cannonPitch = 0.35;
  state.beaconsOn = false;
  state.waterOn = false;
  state.waterFlow = 0.6;
}
