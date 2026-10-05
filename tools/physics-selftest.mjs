// 前端物理内核自测：用真实 physics.js 模拟 9 关 × 3 球，验证门槛矩阵。
//
// 关键：这里的"限时"不是固定秒数，而是尖刺落到小球所在位置的时刻，
// 因此它取决于小球当时的高度。balance-calc.mjs 用的是均匀行程近似，
// 本脚本做的是逐帧真实模拟，两者必须一致，不一致以本脚本为准。
//
// 运行：node tools/physics-selftest.mjs

import { createRunState, stepPhysics, STATUS, validatePhysics } from '../src/main/resources/static/js/physics.js';
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
  spike: { speed: s.spikeSpeed, travel: PHYSICS_DEFAULTS.spikeTravel },
  timeLimitSec: PHYSICS_DEFAULTS.spikeTravel / s.spikeSpeed,
}));

function simulate(level, ballCode) {
  const state = createRunState(level, BALLS[ballCode], PHYSICS_DEFAULTS);
  const dt = PHYSICS_DEFAULTS.fixedStepSec;
  let guard = 0;
  const maxSteps = 2_000_000;
  while (state.status === STATUS.RUNNING && guard++ < maxSteps) {
    stepPhysics(state, dt, null);
  }
  const destroyed = state.barriers.filter((b) => !b.alive).length;
  return {
    cleared: state.status === STATUS.LEVEL_CLEAR,
    hits: state.totalHits ?? state.hits,
    elapsed: state.elapsed,
    destroyed,
    finalN: state.ball.n,
    spikeY: state.spike.y,
    timedOut: guard >= maxSteps,
  };
}

console.log('=== 物理不变量校验 ===');
const problems = validatePhysics(PHYSICS_DEFAULTS);
if (problems.length === 0) {
  console.log('✅ 物理常量全部通过');
} else {
  for (const p of problems) console.log('❌ ' + p);
}
const h = (PHYSICS_DEFAULTS.bounceSpeed ** 2) / (2 * PHYSICS_DEFAULTS.gravity);
console.log(`   弹跳高度 ${h.toFixed(2)}px   弹跳周期 ${((2 * PHYSICS_DEFAULTS.bounceSpeed) / PHYSICS_DEFAULTS.gravity).toFixed(3)}s`);
console.log('');

console.log('=== 逐关真实模拟 ===');
console.log(['关卡', '尖刺', '阶乘球(+2)', '三角阶乘球(+1)', '正方阶乘球(+1)'].join('\t'));
const results = [];
for (const level of LEVELS) {
  const row = { level: level.level, cells: {} };
  const cells = [`第${level.level}关`, `${level.spike.speed}px/s`];
  for (const code of ['FACTORIAL', 'TRI', 'SQR']) {
    const r = simulate(level, code);
    row.cells[code] = r;
    const label = r.timedOut
      ? '∞'
      : `${r.hits}击/${r.elapsed.toFixed(2)}s ${r.cleared ? '✅' : '❌'}`;
    cells.push(label);
  }
  results.push(row);
  console.log(cells.join('\t'));
}

console.log('');
console.log('=== 难度曲线 ===');
console.log('推荐球通关耗时：' + results
  .map((r) => {
    const rec = LEVELS.find((l) => l.level === r.level).recommendedBall;
    return r.cells[rec].elapsed.toFixed(2);
  })
  .join(' → '));

console.log('');
console.log('=== 门槛断言 ===');
let pass = 0;
let fail = 0;
const chk = (label, cond) => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '✅' : '❌'} ${label}`);
};
const at = (lv, code) => results.find((r) => r.level === lv).cells[code];

for (let lv = 1; lv <= 7; lv++) {
  chk(`阶乘球可通关第 ${lv} 关（${at(lv, 'FACTORIAL').hits}击/${at(lv, 'FACTORIAL').elapsed.toFixed(2)}s）`,
    at(lv, 'FACTORIAL').cleared);
}
chk('阶乘球无法通关第 8 关', !at(8, 'FACTORIAL').cleared);
chk('阶乘球无法通关第 9 关', !at(9, 'FACTORIAL').cleared);
chk('三角阶乘球可通关第 8 关', at(8, 'TRI').cleared);
chk('三角阶乘球无法通关第 9 关', !at(9, 'TRI').cleared);
chk('正方阶乘球可通关第 9 关', at(9, 'SQR').cleared);

let totalClear = 0;
for (let lv = 1; lv <= 9; lv++) {
  if (at(lv, 'SQR').cleared) totalClear++;
}
chk('正方阶乘球可通关全部 9 关', totalClear === 9);

console.log(`\n通过 ${pass} 条，失败 ${fail} 条`);
process.exit(fail === 0 ? 0 : 1);
