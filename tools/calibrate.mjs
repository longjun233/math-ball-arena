// 尖刺速度标定器（跨关累加版）
//
// 与上一版的区别：小球阶数跨关累加，标定必须按「第 1 关 → 第 9 关」的顺序推进，
// 每关的起始 n 由上一关的结束 n 决定，不能独立标定。
//
// 方法：
//   1. 用极小尖刺速度连续跑完 9 关 → 得到每关的起始 n、击数、无尖刺耗时（基准）
//   2. 对每关单独二分搜索临界尖刺速度（球的起始 n 用第 1 步的值；击数与速度无关）
//   3. 按目标时限余量 k 反推实际速度
//   4. 用反推得到的速度再连续跑一遍，验证能通关
//
// 运行：node tools/calibrate.mjs

import { createRunState, stepPhysics, STATUS } from '../src/main/resources/static/js/physics.js';
import { PHYSICS_DEFAULTS, LEVEL_SPECS } from '../src/main/resources/static/js/config.js';

const BALLS = {
  FACTORIAL: { code: 'FACTORIAL', name: '阶乘球', step: 2 },
  TRI: { code: 'TRI', name: '三角阶乘球', step: 1 },
  SQR: { code: 'SQR', name: '正方阶乘球', step: 1 },
};

const LEVELS = LEVEL_SPECS.map((s) => ({
  level: s.level,
  recommendedBall: s.recommendedBall,
  barrierHp: s.hpExponent.map((e) => '1' + '0'.repeat(e)),
}));

const MAX_STEPS = 4_000_000;
const DT = PHYSICS_DEFAULTS.fixedStepSec;

function runOne(level, ballCode, startN, speed) {
  const lv = { ...level, spike: { speed, travel: PHYSICS_DEFAULTS.spikeTravel } };
  const state = createRunState(lv, BALLS[ballCode], PHYSICS_DEFAULTS, { startN });
  let steps = 0;
  while (state.status === STATUS.RUNNING && steps++ < MAX_STEPS) {
    stepPhysics(state, DT, null);
  }
  return {
    cleared: state.status === STATUS.LEVEL_CLEAR,
    status: state.status,
    elapsed: state.elapsed,
    hits: state.hits,
    startN,
    endN: state.ball.n,
  };
}

function criticalSpeed(level, ballCode, startN) {
  const HI = 400;
  if (runOne(level, ballCode, startN, HI).cleared) return HI;
  let lo = 0.5;
  let hi = HI;
  for (let i = 0; i < 34; i++) {
    const mid = (lo + hi) / 2;
    if (runOne(level, ballCode, startN, mid).cleared) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ---------- 1. 基准 ----------
console.log('=== 无尖刺基准（阶乘球，跨关累加）===');
const baseline = [];
let n = PHYSICS_DEFAULTS.ballStartN;
for (const lv of LEVELS) {
  const r = runOne(lv, 'FACTORIAL', n, 0.001);
  baseline.push(r);
  console.log(`第${lv.level}关  n: ${r.startN} → ${r.endN}   ${String(r.hits).padStart(2)}击   ${r.elapsed.toFixed(2)}s`);
  n = r.endN;
}
console.log(`全场 27 道屏障共 ${baseline.reduce((a, b) => a + b.hits, 0)} 击，终球 n=${n}`);
console.log('');

// ---------- 2. 逐关临界速度 ----------
console.log('=== 逐关临界速度与标定 ===');
// 目标尖刺速度：平滑递增，观感上由慢到快；实际余量 k = 临界速度 / 目标速度
const TARGET_SPEED = [52, 55, 58, 61, 64, 67, 70, 76, 82];
const calibrated = [];
for (let i = 0; i < LEVELS.length; i++) {
  const lv = LEVELS[i];
  const startN = baseline[i].startN;
  const vCrit = criticalSpeed(lv, 'FACTORIAL', startN);
  const speed = TARGET_SPEED[i];
  const k = vCrit / speed;
  const chk = runOne(lv, 'FACTORIAL', startN, speed);
  calibrated.push({ level: lv.level, speed, vCrit, k, elapsed: chk.elapsed, hits: chk.hits, cleared: chk.cleared });
  console.log(
    `第${lv.level}关 临界 ${vCrit.toFixed(1)}px/s  目标 ${speed}px/s  → 余量 k=${k.toFixed(2)}`
    + `   | ${chk.hits}击/${chk.elapsed.toFixed(2)}s ${chk.cleared ? '✅' : '❌'}`
  );
}
console.log('');

// ---------- 3. 连续验证 ----------
console.log('=== 用标定速度连续跑完 9 关 ===');
const speeds = calibrated.map((c) => c.speed);
const fullLevels = LEVELS.map((lv, i) => ({ ...lv, spike: { speed: speeds[i], travel: PHYSICS_DEFAULTS.spikeTravel } }));
for (const code of ['FACTORIAL', 'TRI', 'SQR']) {
  let cur = PHYSICS_DEFAULTS.ballStartN;
  let total = 0;
  let failedAt = null;
  const detail = [];
  for (let i = 0; i < fullLevels.length; i++) {
    const r = runOne(fullLevels[i], code, cur, speeds[i]);
    total += r.elapsed;
    detail.push(`${r.hits}击/${r.elapsed.toFixed(2)}s${r.cleared ? '' : '❌'}`);
    if (!r.cleared) { failedAt = i + 1; break; }
    cur = r.endN;
  }
  const label = failedAt ? `第 ${failedAt} 关失败` : '全部通关';
  console.log(`${BALLS[code].name.padEnd(6)} ${label.padEnd(10)} 累计 ${total.toFixed(1)}s   ${detail.join(' | ')}`);
}
console.log('');

console.log('=== 直接抄进 config.js / levels.yml 的 spikeSpeed ===');
console.log(calibrated.map((c) => `  { level: ${c.level}, spikeSpeed: ${c.speed} },`).join('\n'));
console.log('');
console.log('尖刺速度序列：' + speeds.join(' → '));
console.log('单调递增：' + (speeds.every((s, i) => i === 0 || s >= speeds[i - 1]) ? '✅' : '❌'));
