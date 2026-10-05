// 物理常量与兜底配置。
// 与后端 application.yml / levels.yml 保持一致；后端不可用时前端必须仍能玩。

export const PHYSICS_DEFAULTS = {
  canvasWidth: 900,
  canvasHeight: 760,
  gravity: 2400,
  bounceSpeed: 420,
  vxMin: 40,
  vxMax: 160,
  barrierGap: 110,
  barrierHeight: 16,
  barrierTopY: [390, 500, 610],
  safeZoneTop: 670,
  ballRadius: 16,
  ballStartY: 100,
  ballStartN: 2,
  spikeHeight: 60,
  spikeTravel: 700,
  fixedStepSec: 1 / 120,
};

export const TRANSITION_DEFAULTS = { enabled: true, durationMs: 600 };

export const BALL_DEFAULTS = [
  { code: 'FACTORIAL', name: '阶乘球', formula: 'n!', step: 2, stars: 1, unlocked: true },
  { code: 'TRI', name: '三角阶乘球', formula: 'T(n)!', step: 1, stars: 2, unlocked: true },
  { code: 'SQR', name: '正方阶乘球', formula: '(n²)!', step: 1, stars: 3, unlocked: true },
];

// 关卡数值真值（与 src/main/resources/levels.yml 一致）
// 血量指数规律：同关内相邻屏障相差 8 个数量级；第 1~7 关之间每关整体上移 1 个数量级
// （让阶乘球每关的撞击次数基本恒定 10~12 击，从而让尖刺速度可以逐关递增）。
export const LEVEL_SPECS = [
  { level: 1, recommendedBall: 'FACTORIAL', hpExponent: [4, 12, 20], spikeSpeed: 71.3 },
  { level: 2, recommendedBall: 'FACTORIAL', hpExponent: [5, 13, 21], spikeSpeed: 76.7 },
  { level: 3, recommendedBall: 'FACTORIAL', hpExponent: [6, 14, 22], spikeSpeed: 78.6 },
  { level: 4, recommendedBall: 'FACTORIAL', hpExponent: [7, 15, 23], spikeSpeed: 82.4 },
  { level: 5, recommendedBall: 'FACTORIAL', hpExponent: [8, 16, 24], spikeSpeed: 85.8 },
  { level: 6, recommendedBall: 'FACTORIAL', hpExponent: [9, 17, 25], spikeSpeed: 89.9 },
  { level: 7, recommendedBall: 'FACTORIAL', hpExponent: [10, 18, 26], spikeSpeed: 94.4 },
  { level: 8, recommendedBall: 'TRI', hpExponent: [20, 50, 80], spikeSpeed: 99.2 },
  { level: 9, recommendedBall: 'SQR', hpExponent: [85, 195, 300], spikeSpeed: 100.6 },
];

const pow10Str = (e) => '1' + '0'.repeat(e);

export const FALLBACK_LEVELS = {
  levels: LEVEL_SPECS.map((s) => ({
    level: s.level,
    recommendedBall: s.recommendedBall,
    barrierHp: s.hpExponent.map(pow10Str),
    spike: { speed: s.spikeSpeed, travel: PHYSICS_DEFAULTS.spikeTravel },
    timeLimitSec: PHYSICS_DEFAULTS.spikeTravel / s.spikeSpeed,
    formulaCheck: null, // 兜底配置下跳过前后端一致性自检
  })),
  physics: PHYSICS_DEFAULTS,
  transition: TRANSITION_DEFAULTS,
  offline: true,
};

export const TOTAL_LEVELS = LEVEL_SPECS.length;
