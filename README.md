# 数学弹球闯关（Math Ball Arena）

自动演示型数学闯关小游戏。玩家只在开局选一颗「公式球」，之后全程无需操作：
小球在屏障上反复弹跳，每次碰撞公式升阶、伤害按公式爆炸增长；屏幕顶部一整排尖刺匀速下落，
就是可视化的时间限制。尖刺触球即失败，穿过一关的 3 道屏障落入底部安全区即过关。

**核心设定：9 关本质是同一条成长曲线被切成 9 段。**

- 小球的阶数 **跨关累加**，第 9 关是第 1 关的延续，不重置（实测 `n: 2 → 167`）
- 27 道屏障的血量 **全局严格递增**，第 9 关第 3 道锁定 **10³⁰⁰**
- 关卡之间 **无缝衔接**：不停顿、不弹结算界面，只闪一下关卡号
- 球上 **固定显示公式符号本身**（`n!` / `T(n)!` / `(n²)!`），不显示具体阶数，永不溢出
- 后端 Java 17 + Spring Boot 3 下发关卡配置，前端原生 HTML5/Canvas，零构建链

---

## 快速开始

前置：**JDK 17+**、Maven 3.9+

```powershell
.\mvnw.ps1 test              # 跑后端单元测试
.\mvnw.ps1 spring-boot:run   # 启动，浏览器打开 http://localhost:8080
```

`mvnw.ps1` 做两件事：自动挑选一个 JDK 17+（本机 `JAVA_HOME` 可能指向 JDK 8），
以及把 Maven 本地仓库固定到项目内的 `.m2repo/`。

### 用 IDE 打开（无需额外配置）

这已经是一个标准 Maven 工程，**依赖也已预下载在 `.m2repo/`（73MB），可以离线构建**。

| IDE | 打开方式 |
|---|---|
| **VS Code** | `File → Open Folder` 选 `math-ball-arena`。已内置 `.vscode/`（JDK 路径、启动配置、任务、推荐扩展），装好 `vscjava.vscode-java-pack` + `vmware.vscode-boot-dev-pack` 后按 **F5** 直接调试运行 |
| **IntelliJ IDEA** | `Open` 选 `math-ball-arena/pom.xml`，按 Maven 工程导入即可。若提示 JDK，选 17 或更高 |
| **Eclipse** | `File → Import → Existing Maven Projects`，选工程根目录 |

VS Code 里可直接用的东西：

- **F5** → `运行 MathBallApplication（Spring Boot）`（`launch.json` 已配好 `JAVA_HOME`）
- **Ctrl+Shift+P → Run Task** → `Maven: 跑测试` / `Maven: 启动服务` / `Tools: 数值与物理全套校验`
- 换机器时只需改 `.vscode/settings.json` 里的两处 `"C:\\Java"`，指向你自己的 JDK 17+ 路径

> 本地仓库位置写在 `.mvn/maven.config`（`-Dmaven.repo.local=.m2repo`），
> 所以 IDE、`mvnw.ps1`、命令行 `mvn` 三者用的是同一个仓库，不会各拉一份。

调试面板：`http://localhost:8080/?debug=1` —— 实时显示当前阶数、撞击计数、尖刺位置。

---

## 改数值只需要改表达式

关卡血量在 `src/main/resources/levels.yml` 里写成**表达式**，后端启动时实时解析成 `BigInteger`：

```yaml
mathball:
  levels:
    - level: 1
      barriers: ["1", "50", "100"]                  # 纯整数
      spike-speed: 18
    - level: 2
      barriers: ["6105000", "60770000e6", "9.158e21"]  # 科学计数法，尾数可带小数
      spike-speed: 20.5
    # ...
    - level: 9
      barriers: ["1.344e268", "9.125e283", "1e300"]  # 10^300
      spike-speed: 38.2
```

- **配置里不出现任何大整数**，`10^300` 只写 `1e300`
- 想调难度，只改表达式与 `spike-speed` 即可，不用碰一行 Java
- 服务端启动时会强校验：每关 3 道、关内递增、**27 道全局严格递增**（关卡间倒挂直接拒绝启动）
- 前端断网时用 `static/js/config.js` 里的同一套表达式兜底（`parseBigIntExpr` 与后端同一规则）

### 当前数值

| 关 | 屏障 1 | 屏障 2 | 屏障 3 | 关内倍数 | 尖刺速度 |
|---|---|---|---|---|---|
| 1 | 1 | 50 | 100 | 50× / 2× | 18 px/s |
| 2 | 6.11e6 | 6.08e13 | 9.16e21 | 10^7.0 / 10^8.2 | 20.5 px/s |
| 3 | 1.04e31 | 6.02e40 | 1.42e51 | 10^9.8 / 10^10.4 | 23.1 px/s |
| 4 | 1.14e62 | 2.77e73 | 1.84e85 | 10^11.4 / 10^11.8 | 25.6 px/s |
| 5 | 3.07e97 | 1.21e110 | 1.06e123 | 10^12.6 / 10^12.9 | 28.1 px/s |
| 6 | 1.98e136 | 7.58e149 | 5.70e163 | 10^13.6 / 10^13.9 | 30.6 px/s |
| 7 | 8.18e177 | 2.18e192 | 1.05e207 | 10^14.4 / 10^14.7 | 33.2 px/s |
| 8 | 8.89e221 | 1.30e237 | 3.24e252 | 10^15.2 / 10^15.4 | 35.7 px/s |
| 9 | 1.34e268 | 9.13e283 | **1e300** | 10^15.8 / 10^16.0 | 38.2 px/s |

曲线由 `tools/design-levels.mjs` 实时生成：第 1 关锚定 1/50/100，末端锚定 10³⁰⁰，
中间用一条加速曲线贯通（关内倍数从 10^1.7 递增到 10^15.8），**第 9 关不做特殊跳变，它只是曲线末端所以最难**。

实测（真机逐帧模拟，与浏览器内结果一致）：

| 球种 | 每关击数 | 整局时长 | 终球 |
|---|---|---|---|
| 阶乘球 (+1) | 4~22 击 | **91.6s** | 167! |
| 三角阶乘球 (+1) | 3 击 | **23.7s** | 29! |
| 正方阶乘球 (+1) | 3 击 | **23.7s** | 29! |

---

## 数值验证工具（改任何物理参数后按顺序跑）

```powershell
node tools/design-levels.mjs     # 生成血量曲线：27 道全局严格递增，终点 10^300
node tools/calibrate.mjs         # 二分搜索每关临界尖刺速度，再按统一余量自动定速
node tools/physics-selftest.mjs  # 连续跑完 9 关，验证跨关累加、整局时长、物理不变量
node tools/syntax-check.mjs      # 前端模块加载 + 数值格式化边界
node tools/api-check.mjs         # 接口契约（需先启动服务）
```

⚠️ **三个容易踩的坑：**

1. **不要用解析公式估算限时。** 尖刺的触发点是「小球在屏障 1 上弹跳到最高点时的球顶」，
   不是「尖刺走满画布」；小球还会随关卡推进下落到更低的屏障，可用时间随之变长。
   早期版本用"均匀行程"近似，导致多关判定全部算错。
2. **标定必须按第 1 关 → 第 9 关的顺序连续推进。** 阶数跨关累加，每关的起始 n 取决于上一关的结束 n。
3. **屏障位置一动，尖刺速度就必须重标。** 屏障越靠上，尖刺可用行程越短、速度上限越低。
   当前屏障在 `[280, 460, 640]`（间距 180），三道屏障占据屏幕约 47%。

### 修改物理参数的标准流程

1. 改 `src/main/resources/application.yml` 的 `mathball.physics`
2. 同步 `src/main/resources/static/js/config.js` 的 `PHYSICS_DEFAULTS`
3. 跑 `node tools/calibrate.mjs`，把输出的 `spikeSpeed` 抄回 `levels.yml` 与 `config.js`
4. 跑 `node tools/physics-selftest.mjs`，11 条断言必须全绿

---

## ⚠️ 关于「重力球」

`js/traits.js` 里预留了 `gravity` 钩子（每次碰撞后 `gravityMul *= 1.06`），但 **v1 未启用**。

原因：重力 `g` 一旦变化，弹跳高度 `v0²/2g` 与弹跳周期 `2v0/g` 全部改变，
上表所有尖刺速度立刻失效。**启用任何改变 `g` 或 `v0` 的球种前，必须重跑上面的标定流程。**

---

## 目录结构

```
math-ball-arena/
├── mvnw.ps1                    本地 Maven 包装（固定 JDK 与仓库位置）
├── docs/
│   ├── 技术栈.md                 完整技术清单（版本、依赖、算法、限制）
│   ├── 工程提示词.md             实现规格（唯一实现依据）
│   ├── 开发计划.md               历史决策记录
│   └── shots/                   浏览器实测截图
├── tools/
│   ├── design-levels.mjs       血量曲线设计器
│   ├── calibrate.mjs           尖刺速度标定器
│   ├── physics-selftest.mjs    连续 9 关物理与门槛验证
│   ├── syntax-check.mjs        前端模块与格式化自检
│   └── api-check.mjs           接口契约验收
└── src/
    ├── main/java/com/example/mathball/     后端：公式服务、关卡服务、REST
    ├── main/resources/levels.yml            9 关数值（只写表达式与速度）
    └── main/resources/static/                前端：Canvas + 原生 ES Module
```

---

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/levels` | 9 关配置 + 物理常量 + 过场配置 |
| GET | `/api/levels/{n}` | 单关配置 |
| GET | `/api/balls` | 公式球清单 |
| POST | `/api/runs` | 上报战报 |
| GET | `/api/runs/best` | 最佳成绩 |

血量以**十进制字符串**下发（`10^300` 会超出 JSON number 精度）。
每关还附带 `formulaCheck`，前端启动时用本地 BigInt 重算比对，防止前后端公式实现漂移。
