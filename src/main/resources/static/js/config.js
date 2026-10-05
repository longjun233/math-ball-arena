// 物理常量与兜底配置。
// 与后端 application.yml / levels.yml 保持一致；后端不可用时前端必须仍能玩。

export const PHYSICS_DEFAULTS = {
  canvasWidth: 900,
  canvasHeight: 760,
  gravity: 1700,          // 放慢节奏：弹跳周期 2*v0/g ≈ 0.494s（原 2400 → 0.35s 偏快）
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

// 关卡之间无缝衔接：不停顿、不弹结算界面，只闪一下关卡号
export const TRANSITION_DEFAULTS = { enabled: true, bannerMs: 800 };

export const BALL_DEFAULTS = [
  { code: 'FACTORIAL', name: '阶乘球', formula: 'n!', step: 1, stars: 1, unlocked: true },
  { code: 'TRI', name: '三角阶乘球', formula: 'T(n)!', step: 1, stars: 2, unlocked: true },
  { code: 'SQR', name: '正方阶乘球', formula: '(n²)!', step: 1, stars: 3, unlocked: true },
];

// 关卡数值真值（与 src/main/resources/levels.yml 一致）
//
// 血量曲线由 tools/design-levels.mjs 生成：以阶乘球每 3 击推进一道屏障为节奏基准，
// 27 道屏障的血量指数【全局严格递增】，终点锁定 10^300。
// 9 关本质是同一条成长曲线被切成 9 段，不允许出现关卡间倒挂。
export const LEVEL_SPECS = [
  { level: 1, recommendedBall: 'FACTORIAL', hpExponent: [4, 10, 18], spikeSpeed: 52 },
  { level: 2, recommendedBall: 'FACTORIAL', hpExponent: [27, 36, 45], spikeSpeed: 55 },
  { level: 3, recommendedBall: 'FACTORIAL', hpExponent: [55, 66, 76], spikeSpeed: 58 },
  { level: 4, recommendedBall: 'FACTORIAL', hpExponent: [87, 98, 110], spikeSpeed: 61 },
  { level: 5, recommendedBall: 'FACTORIAL', hpExponent: [121, 133, 145], spikeSpeed: 64 },
  { level: 6, recommendedBall: 'FACTORIAL', hpExponent: [157, 170, 182], spikeSpeed: 67 },
  { level: 7, recommendedBall: 'FACTORIAL', hpExponent: [195, 207, 220], spikeSpeed: 70 },
  { level: 8, recommendedBall: 'FACTORIAL', hpExponent: [233, 247, 260], spikeSpeed: 76 },
  { level: 9, recommendedBall: 'FACTORIAL', hpExponent: [273, 287, 300], spikeSpeed: 82 },
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
