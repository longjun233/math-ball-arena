// 尖刺速度标定器 —— 阶乘球止步第 7 关版
//
// 设计目标（本版）：
//   · 阶乘球（每击 +1）能过第 1~6 关，**第 7 关必定被尖刺追上**
//     尖刺是硬限制，过不了就是失败，这是正常结果，不需要保证谁通关
//   · 更强的球种（三角阶乘球 / 正方阶乘球）靠更高的单次伤害走得更远
//
// 为什么必须连续标定：阶数跨关累加，每关起始 n 取决于上一关结束 n；
// 而每关的血量又直接决定成长速度 —— 改任何一关的血量都会改变全局，所以不能单关独立算。
//
// 运行：node tools/calibrate.mjs

import { createRunState, stepPhysics, STATUS } from '../src/main/resources/static/js/physics.js';
import { PHYSICS_DEFAULTS, LEVEL_SPECS, BALL_DEFAULTS } from '../src/main/resources/static/js/config.js';
import { parseBigIntExpr } from '../src/main/resources/static/js/formula.js';

const BALLS = Object.fromEntries(
  BALL_DEFAULTS.map((b) => [b.code, { code: b.code, name: b.name, step: b.step }])
);

const LEVELS = LEVEL_SPECS.map((s) => ({
  level: s.level,
  barrierHp: s.barriers.map((expr) => parseBigIntExpr(expr).toString()),
}));

const START_N = PHYSICS_DEFAULTS.ballStartN;
const DT = PHYSICS_DEFAULTS.fixedStepSec;
const MAX_STEPS = 20_000_000;
const FACTORIAL_LAST_CLEAR = 6;   // 阶乘球最多能过到第几关
const CLEAR_MARGIN = 1.12;        // 第 6 关留多少余量
const FAIL_FACTOR = 1.25;         // 第 7 关超出临界多少倍

function runOne(level, ballCode, startN, speed) {
  const lv = { ...level, spike: { speed, travel: PHYSICS_DEFAULTS.spikeTravel } };
  const state = createRunState(lv, BALLS[ballCode], PHYSICS_DEFAULTS, { startN });
  let steps = 0;
  while (state.status === STATUS.RUNNING && steps++ < MAX_STEPS) {
    stepPhysics(state, DT, null);
  }
  return {
    cleared: state.status === STATUS.LEVEL_CLEAR,
    elapsed: state.elapsed,
    hits: state.hits,
    startN,
    endN: state.ball.n,
    destroyed: state.barriers.filter((b) => !b.alive).length,
  };
}

/** 最大的、仍能通关的尖刺速度（cleared 对 speed 单调递减）。 */
function criticalSpeed(level, ballCode, startN) {
  const HI = 600;
  if (runOne(level, ballCode, startN, HI).cleared) return HI;
  let lo = 0.05;
  let hi = HI;
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2;
    if (runOne(level, ballCode, startN, mid).cleared) lo = mid;
    else hi = mid;
  }
  return lo;
}

const round1 = (x) => Math.round(x * 10) / 10;

// ---------- 1. 阶乘球基准（顺序推进，假设前 6 关都过） ----------
console.log('=== 阶乘球基准（无尖刺、顺序推进）===');
const base = [];
let n = START_N;
for (const lv of LEVELS) {
  const r = runOne(lv, 'FACTORIAL', n, 0.001);
  base.push({ startN: n, hits: r.hits, elapsed: r.elapsed, endN: r.endN });
  console.log(
    `第${lv.level}关  n: ${String(n).padStart(3)} → ${String(r.endN).padStart(3)}   `
    + `${String(r.hits).padStart(2)}击   ${r.elapsed.toFixed(2)}s`
  );
  n = r.endN;
}
console.log('');

// ---------- 2. 逐关临界速度 → 定一个统一速度 ----------
console.log('=== 逐关临界速度 ===');
const critics = [];
for (let i = 0; i < LEVELS.length; i++) {
  critics.push(criticalSpeed(LEVELS[i], 'FACTORIAL', base[i].startN));
  console.log(`第${LEVELS[i].level}关 临界 ${critics[i].toFixed(1)}px/s`);
}

const vLastClear = critics[FACTORIAL_LAST_CLEAR - 1];   // 第 6 关：必须能过
const vFirstFail = critics[FACTORIAL_LAST_CLEAR];       // 第 7 关：必须过不去
const speed = round1(Math.min(vLastClear / CLEAR_MARGIN, vFirstFail * FAIL_FACTOR));
const speeds = LEVELS.map(() => speed);

console.log('');
console.log(`第 6 关临界 ${vLastClear.toFixed(1)}px/s，第 7 关临界 ${vFirstFail.toFixed(1)}px/s`);
console.log(`→ 取统一尖刺速度 ${speed}px/s（< ${(vLastClear).toFixed(1)} 保证第 6 关能过；> ${(vFirstFail).toFixed(1)} 保证第 7 关必败）`);
console.log(
  `  第 6 关余量 k=${(vLastClear / speed).toFixed(2)}   第 7 关超出 ×${(speed / vFirstFail).toFixed(2)}`
);
console.log('');

// ---------- 3. 逐关复核 ----------
console.log('=== 逐关复核（阶乘球）===');
for (let i = 0; i < LEVELS.length; i++) {
  const r = runOne(LEVELS[i], 'FACTORIAL', base[i].startN, speed);
  console.log(
    `第${LEVELS[i].level}关  ${String(r.hits).padStart(2)}击/${r.elapsed.toFixed(2)}s`
    + `  ${r.cleared ? '✅通过' : '❌被尖刺追上'}`
  );
}
console.log('');

// ---------- 4. 连续验证三种球 ----------
console.log('=== 连续 9 关真机模拟 ===');
const fullLevels = LEVELS.map((lv, i) => ({
  ...lv,
  spike: { speed: speeds[i], travel: PHYSICS_DEFAULTS.spikeTravel },
}));

function runFull(ballCode) {
  let cur = START_N;
  let total = 0;
  let cleared = 0;
  const detail = [];
  for (let i = 0; i < fullLevels.length; i++) {
    const r = runOne(fullLevels[i], ballCode, cur, speeds[i]);
    total += r.elapsed;
    detail.push(`L${i + 1}:${r.hits}击${r.cleared ? '✅' : '❌'}`);
    if (!r.cleared) break;
    cleared += 1;
    cur = r.endN;
  }
  return { cleared, total, detail, failedAt: cleared === 9 ? null : cleared + 1 };
}

const runs = {};
for (const code of ['FACTORIAL', 'TRI', 'SQR']) {
  const r = runFull(code);
  runs[code] = r;
  const label = r.failedAt ? `第 ${r.failedAt} 关失败` : '全部通关';
  console.log(`${BALLS[code].name.padEnd(6)} ${label.padEnd(10)} 通过 ${r.cleared}/9 关，累计 ${r.total.toFixed(1)}s`);
  console.log(`   ${r.detail.join('  ')}`);
}
console.log('');

// ---------- 5. 断言 ----------
console.log('=== 断言 ===');
let pass = 0;
let fail = 0;
const chk = (label, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '✅' : '❌'} ${label}${extra ? '  ' + extra : ''}`);
};

chk('阶乘球通过第 1~6 关', runs.FACTORIAL.cleared >= FACTORIAL_LAST_CLEAR,
  `实际通过 ${runs.FACTORIAL.cleared} 关`);
chk('阶乘球停在第 7 关', runs.FACTORIAL.failedAt === FACTORIAL_LAST_CLEAR + 1,
  `失败于第 ${runs.FACTORIAL.failedAt} 关`);
chk('三角阶乘球比阶乘球走得更远', runs.TRI.cleared > runs.FACTORIAL.cleared,
  `${runs.TRI.cleared} vs ${runs.FACTORIAL.cleared} 关`);
chk('正方阶乘球比阶乘球走得更远', runs.SQR.cleared > runs.FACTORIAL.cleared,
  `${runs.SQR.cleared} vs ${runs.FACTORIAL.cleared} 关`);

console.log('');
console.log('=== 直接抄进 config.js / levels.yml 的 spikeSpeed ===');
speeds.forEach((s, i) => console.log(`  { level: ${i + 1}, spikeSpeed: ${s} },`));

console.log(`\n通过 ${pass} 条，失败 ${fail} 条`);
process.exit(fail === 0 ? 0 : 1);
