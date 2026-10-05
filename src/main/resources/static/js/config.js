// 物理常量与兜底配置。
// 与后端 application.yml / levels.yml 保持一致；后端不可用时前端必须仍能玩。

import { parseBigIntExpr } from './formula.js';

export const PHYSICS_DEFAULTS = {
  canvasWidth: 900,
  canvasHeight: 760,
  gravity: 1000,          // 放慢球的下落：弹跳周期 2*v0/g = 0.6s，弹跳高度 45px
  bounceSpeed: 300,
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
  { level: 2, barriers: ['187', '1815', '118000'], spikeSpeed: 18.4 },
  { level: 3, barriers: ['60920000', '282600000000', '1.303e16'], spikeSpeed: 18.8 },
  { level: 4, barriers: ['6.513e21', '3.799e28', '2.765e36'], spikeSpeed: 19.2 },
  { level: 5, barriers: ['2.668e45', '3.605e55', '7.178e66'], spikeSpeed: 19.7 },
  { level: 6, barriers: ['2.208e79', '1.097e93', '9.173e107'], spikeSpeed: 20.1 },
  { level: 7, barriers: ['1.343e124', '3.573e141', '1.789e160'], spikeSpeed: 20.5 },
  { level: 8, barriers: ['1.745e180', '3.422e201', '1.392e224'], spikeSpeed: 20.9 },
  { level: 9, barriers: ['1.21e248', '2.314e273', '1e300'], spikeSpeed: 21.3 },
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
