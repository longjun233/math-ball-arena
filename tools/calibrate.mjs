// 尖刺速度标定器：用真实 physics.js 逐帧模拟，二分搜索每关的临界速度，
// 再按目标时限余量 k 反推实际尖刺速度。
//
// 为什么不能用解析公式：尖刺的触发点是「小球在屏障 1 上弹跳到最高点时的球顶」，
// 而不是「尖刺走满 700px」。球会随关卡推进下落到更低的屏障，可用时间随之变长，
// 因此必须真机模拟。
//
// 运行：node tools/calibrate.mjs

import { createRunState, stepPhysics, STATUS } from '../src/main/resources/static/js/physics.js';
import { PHYSICS_DEFAULTS, LEVEL_SPECS } from '../src/main/resources/static/js/config.js';

const BALLS = {
  FACTORIAL: { code: 'FACTORIAL', name: '阶乘球', step: 2 },
  TRI: { code: 'TRI', name: '三角阶乘球', step: 1 },
  SQR: { code: 'SQR', name: '正方阶乘球', step: 1 },
};

const MAX_STEPS = 2_000_000;

function run(level, ballCode, speed) {
  const lv = { ...level, spike: { speed, travel: PHYSICS_DEFAULTS.spikeTravel } };
  const state = createRunState(lv, BALLS[ballCode], PHYSICS_DEFAULTS);
  const dt = PHYSICS_DEFAULTS.fixedStepSec;
  let steps = 0;
  while (state.status === STATUS.RUNNING && steps++ < MAX_STEPS) {
    stepPhysics(state, dt, null);
  }
  return {
    cleared: state.status === STATUS.LEVEL_CLEAR,
    elapsed: state.elapsed,
    hits: state.hits,
    finalN: state.ball.n,
    destroyed: state.barriers.filter((b) => !b.alive).length,
  };
}

/** 最大的、仍能通关的尖刺速度。cleared(speed) 单调递减。 */
function criticalSpeed(level, ballCode) {
  const HI = 400;
  if (run(level, ballCode, HI).cleared) return HI;
  let lo = 0.5;
  let hi = HI;
  for (let i = 0; i < 34; i++) {
    const mid = (lo + hi) / 2;
    if (run(level, ballCode, mid).cleared) lo = mid;
    else hi = mid;
  }
  return lo;
}

// 目标时限余量：第 1~7 关逐关收紧（阶乘球段）；第 8、9 关换成强球后先回升一档再收紧
const TARGET_K = [1.85, 1.72, 1.55, 1.48, 1.32, 1.26, 1.20, 1.45, 1.20];

const levels = LEVEL_SPECS.map((s) => ({
  level: s.level,
  recommendedBall: s.recommendedBall,
  barrierHp: s.hpExponent.map((e) => '1' + '0'.repeat(e)),
}));

console.log('=== 无尖刺基准（真实物理）===');
const baseline = [];
for (const lv of levels) {
  const r = run(lv, lv.recommendedBall, 0.0001);
  baseline.push(r);
  console.log(`第${lv.level}关 ${BALLS[lv.recommendedBall].name.padEnd(6)} ${String(r.hits).padStart(2)}击  耗时 ${r.elapsed.toFixed(2)}s  终球 n=${r.finalN}`);
}

console.log('');
console.log('=== 临界速度与标定结果 ===');
const calibrated = [];
for (let i = 0; i < levels.length; i++) {
  const lv = levels[i];
  const vCrit = criticalSpeed(lv, lv.recommendedBall);
  const k = TARGET_K[i];
  const speed = Math.round((vCrit / k) * 10) / 10;
  const check = run(lv, lv.recommendedBall, speed);
  const available = vCrit > 0 ? check.elapsed * (vCrit / speed) : 0;
  calibrated.push({ level: lv.level, speed, vCrit, k, elapsed: check.elapsed, hits: check.hits, cleared: check.cleared });
  console.log(
    `第${lv.level}关 临界 ${vCrit.toFixed(1)}px/s  目标余量 k=${k.toFixed(2)}  →  尖刺速度 ${speed}px/s`
    + `  |  ${check.hits}击/${check.elapsed.toFixed(2)}s  ${check.cleared ? '✅通过' : '❌失败'}`
    + `  |  实际余量 ${(vCrit && check.elapsed ? (check.elapsed * (vCrit / speed)) / check.elapsed : 0).toFixed(2)}`
  );
}

console.log('');
console.log('=== 标定后的门槛矩阵 ===');
console.log(['关卡', '尖刺', '阶乘球(+2)', '三角阶乘球(+1)', '正方阶乘球(+1)'].join('\t'));
for (let i = 0; i < levels.length; i++) {
  const lv = levels[i];
  const speed = calibrated[i].speed;
  const cells = [`第${lv.level}关`, `${speed}px/s`];
  for (const code of ['FACTORIAL', 'TRI', 'SQR']) {
    const r = run(lv, code, speed);
    cells.push(`${r.hits}击/${r.elapsed.toFixed(2)}s ${r.cleared ? '✅' : '❌'}`);
  }
  console.log(cells.join('\t'));
}

console.log('');
console.log('=== 直接抄进 config.js / levels.yml 的数值 ===');
console.log('hpExponent 与 spikeSpeed：');
for (let i = 0; i < LEVEL_SPECS.length; i++) {
  const s = LEVEL_SPECS[i];
  console.log(`  { level: ${s.level}, recommendedBall: '${s.recommendedBall}', hpExponent: [${s.hpExponent.join(', ')}], spikeSpeed: ${calibrated[i].speed} },`);
}

console.log('');
console.log('=== 门槛断言（标定后）===');
let pass = 0;
let fail = 0;
const chk = (label, cond) => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${label}`); };
const at = (lv, code) => run(levels[lv - 1], code, calibrated[lv - 1].speed);
for (let lv = 1; lv <= 7; lv++) {
  const r = at(lv, 'FACTORIAL');
  chk(`阶乘球可通关第 ${lv} 关（${r.hits}击/${r.elapsed.toFixed(2)}s）`, r.cleared);
}
chk('阶乘球无法通关第 8 关', !at(8, 'FACTORIAL').cleared);
chk('阶乘球无法通关第 9 关', !at(9, 'FACTORIAL').cleared);
chk('三角阶乘球可通关第 8 关', at(8, 'TRI').cleared);
chk('三角阶乘球无法通关第 9 关', !at(9, 'TRI').cleared);
chk('正方阶乘球可通关第 9 关', at(9, 'SQR').cleared);
chk('尖刺速度逐关递增', calibrated.every((c, i) => i === 0 || c.speed > calibrated[i - 1].speed));

console.log(`\n通过 ${pass} 条，失败 ${fail} 条`);
process.exit(fail === 0 ? 0 : 1);
