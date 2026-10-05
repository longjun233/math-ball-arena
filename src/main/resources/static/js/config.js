// 物理常量与兜底配置。
// 与后端 application.yml / levels.yml 保持一致；后端不可用时前端必须仍能玩。

import { parseBigIntExpr } from './formula.js';

export const PHYSICS_DEFAULTS = {
  canvasWidth: 900,
  canvasHeight: 760,
  gravity: 1700,          // 弹跳周期 2*v0/g ≈ 0.494s
  bounceSpeed: 420,
  vxMin: 40,
  vxMax: 160,
  barrierGap: 180,        // 屏障间距放大 → 三道屏障占据屏幕大部分
  barrierHeight: 16,
  barrierTopY: [280, 460, 640],
  safeZoneTop: 700,
  ballRadius: 16,
  ballStartY: 100,
  ballStartN: 2,
  spikeHeight: 60,
  spikeTravel: 700,
  fixedStepSec: 1 / 120,
};

// 关卡之间无缝衔接：不停顿、不弹结算界面，只闪一下关卡号
export const TRANSITION_DEFAULTS = { enabled: true, bannerMs: 800 };

export const BALL_DEFAULTS = [
  { code: 'FACTORIAL', name: '阶乘球', formula: 'n!', step: 1, stars: 1, unlocked: true },
  { code: 'TRI', name: '三角阶乘球', formula: 'T(n)!', step: 1, stars: 2, unlocked: true },
  { code: 'SQR', name: '正方阶乘球', formula: '(n²)!', step: 1, stars: 3, unlocked: true },
];

// 关卡数值真值（与 src/main/resources/levels.yml 一致）
//
// barriers 是【血量表达式】，由 formula.js 的 parseBigIntExpr 实时解析成 BigInt，
// 配置里不出现任何大整数；改数值只需改表达式。
// 曲线由 tools/design-levels.mjs 生成，27 道屏障全局严格递增，终点 10^300。
export const LEVEL_SPECS = [
  { level: 1, barriers: ['1', '50', '100'], spikeSpeed: 18 },
  { level: 2, barriers: ['6105000', '60770000000000', '9.158e21'], spikeSpeed: 20.5 },
  { level: 3, barriers: ['1.035e31', '6.019e40', '1.418e51'], spikeSpeed: 23.1 },
  { level: 4, barriers: ['1.142e62', '2.772e73', '1.836e85'], spikeSpeed: 25.6 },
  { level: 5, barriers: ['3.065e97', '1.207e110', '1.061e123'], spikeSpeed: 28.1 },
  { level: 6, barriers: ['1.984e136', '7.578e149', '5.701e163'], spikeSpeed: 30.6 },
  { level: 7, barriers: ['8.182e177', '2.177e192', '1.047e207'], spikeSpeed: 33.2 },
  { level: 8, barriers: ['8.885e221', '1.304e237', '3.243e252'], spikeSpeed: 35.7 },
  { level: 9, barriers: ['1.344e268', '9.125e283', '1e300'], spikeSpeed: 38.2 },
];

export const FALLBACK_LEVELS = {
  levels: LEVEL_SPECS.map((s) => ({
    level: s.level,
    barrierHp: s.barriers.map((expr) => parseBigIntExpr(expr).toString()),
    spike: { speed: s.spikeSpeed, travel: PHYSICS_DEFAULTS.spikeTravel },
    timeLimitSec: PHYSICS_DEFAULTS.spikeTravel / s.spikeSpeed,
    formulaCheck: null, // 兜底配置下跳过前后端一致性自检
  })),
  physics: PHYSICS_DEFAULTS,
  transition: TRANSITION_DEFAULTS,
  offline: true,
};

export const TOTAL_LEVELS = LEVEL_SPECS.length;
