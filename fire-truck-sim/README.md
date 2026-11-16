# 消防车 3D 交互仿真（Three.js + Vite）

基于 Three.js 的模块化消防车仿真工程，支持自由观察、透视剖切、驾驶模拟、
云梯动画、警灯特效与带重力抛物线的粒子喷水，并可从网络加载公开合规的
消防车 GLTF/GLB 模型。

## 快速开始

```bash
cd fire-truck-sim
npm install
npm run dev        # 启动开发服务器（默认 http://localhost:5173）
npm run build      # 生产构建到 dist/
npm run preview    # 预览构建产物
```

## 功能一览

| 模块 | 功能 | 操作 |
| --- | --- | --- |
| 观察 | 360° 旋转 / 缩放 / 平移 | 鼠标左键拖拽、滚轮、右键拖拽 |
| 观察 | 自动旋转预览开关 | 面板「自动旋转」按钮 |
| 透视 | 实体 / 线框透视 / 剖切透视 三模式 | 「透视模式」分组按钮 |
| 剖切 | 剖切轴向、位置调节 | 滑块或直接拖拽场景中的青色手柄 |
| 驾驶 | 前进后退、转向、刹车，车轮同步滚动/偏转 | W/A/S/D 或面板按住按钮，空格刹车 |
| 云梯 | 回转、俯仰、三节伸缩 | 「云梯控制」按住按钮 |
| 警灯 | 红蓝交替闪烁 + 点光源发光 | 「警灯」按钮或 L 键 |
| 喷水 | 炮头朝向调节、开关、流量调节、重力抛物线粒子 | 消防炮分组按钮 / F 键 / 流量滑块 |
| 重置 | 重置视角、重置车辆位置姿态 | 对应按钮，R 键重置车辆 |

## 目录结构

```
fire-truck-sim/
├─ index.html                  # 入口 HTML
├─ package.json
├─ vite.config.js
├─ public/
│  └─ models/                  # 放置本地 GLTF/GLB（同源加载，无 CORS 问题）
└─ src/
   ├─ main.js                  # 应用入口：事件编排 + 渲染循环
   ├─ config.js                # 全部可调参数（动力学、流量、裁剪行程等）
   ├─ state.js                 # 全局仿真状态（单一数据源）
   ├─ styles.css
   ├─ scene/
   │  ├─ SceneManager.js       # 渲染器 / 相机 / OrbitControls / 灯光 / 裁剪平面
   │  └─ Ground.js             # 场地、车道、边界锥桶
   ├─ truck/
   │  ├─ TruckBuilder.js       # 程序化消防车（车架/水箱/管路/云梯/炮/警灯）
   │  ├─ Truck.js              # 车辆控制器：运动学、部件映射、GLTF 适配
   │  └─ ModelLoader.js        # GLTFLoader 封装
   ├─ controls/
   │  ├─ ClippingController.js # 三模式透视 + 可拖拽裁剪平面
   │  └─ InputController.js    # 键盘输入
   ├─ water/
   │  └─ WaterSystem.js        # 点精灵粒子水流（重力、落地回收、流量）
   └─ ui/
      └─ ControlPanel.js       # 侧边控制面板（按钮 / 滑块 / 加载遮罩 / toast）
```

## 加载外部消防车模型

两种方式：

1. **同源本地模型（推荐）**：把 `.glb` / `.gltf`（及贴图、`.bin`）放入
   `public/models/`，面板中输入 `/models/你的模型.glb` 后点击「加载模型」。
2. **公开网络 URL**：直接粘贴完整 `https://` 地址。要求资源公开、授权合规，
   且服务器返回正确的 CORS 头（`Access-Control-Allow-Origin`），否则浏览器
   会拦截加载。仅允许 `http(s)` 与同源相对路径。

加载后模型会自动归一化（车长约 7.5 m、底部接地、居中），并按节点名称
约定识别可动部件；识别不到的功能自动降级，不影响其它功能。
命名约定见 [`docs/model-naming.md`](./docs/model-naming.md)。
点击「恢复内置车」可回到程序化模型。

## 实现要点

- **驾驶模型**：自行车模型（bicycle model），横摆角速度
  `ω = v/L · tan(δ)`；车轮滚动角按弧长 `Δθ = v·dt/r` 积分，前轮平滑转向。
- **剖切**：`THREE.Plane` 定义在车辆局部空间、每帧变换到世界空间，
  通过 `material.clippingPlanes` 实现，裁剪面随车辆移动；辅助手柄支持射线拖拽。
- **线框透视**：仅外覆盖件切换 `wireframe`，内部车架 / 水箱 / 管路保持实体，
  切换时对材质做快照，可无损还原。
- **喷水**：环形缓冲的 `THREE.Points` 粒子，出膛速度 + 重力积分形成抛物线，
  落地/超时/出界回收并压缩存活数组；发射率随流量滑块线性变化。
- **警灯**：正弦阈值交替的自发光强度 + `PointLight` 脉冲。

## 浏览器要求

支持 WebGL2 的现代浏览器（Chrome / Edge / Firefox 最新两个大版本）。
