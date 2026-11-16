# GLTF / GLB 模型命名约定

外部模型加载后，系统按**节点名称（不区分大小写，支持子串匹配）**识别可动部件。
建模时请给节点（Node / Object）命名包含下列关键字；中英文均可。
识别不到的部件对应功能会自动降级，其余功能不受影响。

> 坐标约定：车辆朝 **+Z**，向上为 **+Y**，右侧为 **+X**。
> 若模型朝向不同，可在建模软件中先旋转归正再导出。

## 部件关键字

| 功能部件 | 名称需包含的关键字（任一） | 说明 |
| --- | --- | --- |
| 车轮 | `wheel` / `tire` / `轮胎` | 建议每个轮子做成独立节点；其父节点作为转向枢轴 |
| 云梯回转台 | `ladder` + `yaw` / `rot` / `turntable` / `base` | 绕 Y 轴旋转 |
| 云梯俯仰架 | `ladder` + `pitch` / `tilt` / `lift` | 绕 X 轴俯仰 |
| 云梯伸缩节 | `ladder` + `extend` / `telescop` / `section` / `segment` / `节` | 按识别顺序沿局部 +Z 滑出 |
| 消防炮回转 | `cannon` / `monitor` / `炮` + `yaw` / `rot` / `base` | |
| 消防炮俯仰 | 同上 + `pitch` / `tilt` | |
| 喷水口 | `muzzle` / `nozzle` / `outlet` / `tip` | 粒子从此节点的 +Z 方向发射 |
| 警灯 | `beacon` / `siren` / `warning` / `警灯` | 名称含 `red`/`红` 视为红色，其余按蓝色处理 |

## 命名示例

```
FireTruck
├─ Chassis
├─ Wheel_Front_L        ← 前轮（z>0 判定为前轮，参与转向）
├─ Wheel_Front_R
├─ Wheel_Rear_L
├─ Wheel_Rear_R
├─ LadderYaw_Turntable
│  └─ LadderPitch_Frame
│     ├─ LadderSection_1
│     ├─ LadderSection_2
│     └─ LadderSection_3
├─ CannonYaw_Base
│  └─ CannonPitch_Head
│     └─ CannonNozzle_Muzzle
├─ Beacon_Red_Top
└─ Beacon_Blue_Top
```

## 其它注意事项

- 推荐导出 **glTF Binary (`.glb`)** 单文件，避免贴图路径问题。
- 材质使用标准 PBR（`metalness` / `roughness`）即可，系统会自动纳入
  线框 / 剖切材质管理。
- 模型面数建议控制在 10 万三角面以内，以保证粒子与阴影的运行帧率。
- 车辆尺寸无需精确，加载时会按包围盒自动缩放到车长约 7.5 m。
