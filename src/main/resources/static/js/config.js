// 物理常量与兜底配置。
// 与后端 application.yml / levels.yml 保持一致；后端不可用时前端必须仍能玩。

import { parseBigIntExpr } from './formula.js';

export const PHYSICS_DEFAULTS = {
  canvasWidth: 900,
  canvasHeight: 760,
  gravity: 500,           // 弹跳周期 2*v0/g = 1.2s、弹跳高度 v0²/2g = 90px（相对上一版都翻倍）
  bounceSpeed: 300,       // 反弹速度不变
  vxMin: 40,
  vxMax: 160,
  barrierGap: 180,        // 三道屏障占据屏幕大部分
  barrierHeight: 28,       // 屏障加厚，血量数字有足够空间显示清楚
  barrierTopY: [280, 460, 640],
  safeZoneTop: 700,
  ballRadius: 16,
  ballStartY: 100,
  ballStartN: 2,
  spikeHeight: 30,        // 尖刺长度缩短为原来一半
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
// 血量只动位数：除第 1 关外全部是 10 的整数次幂；显示仍走科学计数法。
// barriers 是【血量表达式】，由 parseBigIntExpr 实时解析，配置里不出现任何大整数。
export const LEVEL_SPECS = [
  { level: 1, barriers: ['1', '50', '100'], spikeSpeed: 14.8 },
  { level: 2, barriers: ['1e3', '1e4', '1e6'], spikeSpeed: 14.8 },
  { level: 3, barriers: ['1e8', '1e11', '1e16'], spikeSpeed: 14.8 },
  { level: 4, barriers: ['1e22', '1e29', '1e36'], spikeSpeed: 14.8 },
  { level: 5, barriers: ['1e45', '1e56', '1e67'], spikeSpeed: 14.8 },
  { level: 6, barriers: ['1e79', '1e93', '1e108'], spikeSpeed: 14.8 },
  { level: 7, barriers: ['1e130', '1e150', '1e170'], spikeSpeed: 14.8 },
  { level: 8, barriers: ['1e180', '1e202', '1e224'], spikeSpeed: 14.8 },
  { level: 9, barriers: ['1e248', '1e273', '1e300'], spikeSpeed: 14.8 },
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
