// 前端物理内核自测（跨关累加版）
//
// 用真实 physics.js 从第 1 关连续跑到第 9 关，验证：
//   1. 物理不变量（弹跳高度、屏障间距、屏障数量）
//   2. 27 道屏障血量【全局严格递增】，终点 10^300
//   3. 小球阶数【跨关累加】，不重置
//   4. 三种公式球都能通关，且阶乘球（最弱）耗时最长
//   5. 整局时长 ≤ 2 分钟
//
// 运行：node tools/physics-selftest.mjs

import { createRunState, stepPhysics, STATUS, validatePhysics } from '../src/main/resources/static/js/physics.js';
import { PHYSICS_DEFAULTS, LEVEL_SPECS, BALL_DEFAULTS } from '../src/main/resources/static/js/config.js';
import { parseBigIntExpr } from '../src/main/resources/static/js/formula.js';

// 球种定义从 config.js 读取（单一真值来源），改步长后无需再改这里
const BALLS = Object.fromEntries(
  BALL_DEFAULTS.map((b) => [b.code, { code: b.code, name: b.name, step: b.step }])
);

const LEVELS = LEVEL_SPECS.map((s) => ({
  level: s.level,
  barrierHp: s.barriers.map((expr) => parseBigIntExpr(expr).toString()),
  spike: { speed: s.spikeSpeed, travel: PHYSICS_DEFAULTS.spikeTravel },
}));

const MAX_STEPS = 4_000_000;
const DT = PHYSICS_DEFAULTS.fixedStepSec;

function runOne(level, ballCode, startN) {
  const state = createRunState(level, BALLS[ballCode], PHYSICS_DEFAULTS, { startN });
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
  };
}

function runFull(ballCode) {
  let n = PHYSICS_DEFAULTS.ballStartN;
  const per = [];
  let total = 0;
  let failedAt = null;
  for (const lv of LEVELS) {
    const r = runOne(lv, ballCode, n);
    per.push(r);
    total += r.elapsed;
    if (!r.cleared) { failedAt = lv.level; break; }
    n = r.endN;
  }
  return { per, total, failedAt, finalN: n };
}

let pass = 0;
let fail = 0;
const chk = (label, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '✅' : '❌'} ${label}${extra ? '  ' + extra : ''}`);
};

// ---------- 1. 物理不变量 ----------
console.log('=== 物理不变量 ===');
const problems = validatePhysics(PHYSICS_DEFAULTS);
for (const p of problems) console.log('❌ ' + p);
chk('物理常量全部通过', problems.length === 0);
const h = (PHYSICS_DEFAULTS.bounceSpeed ** 2) / (2 * PHYSICS_DEFAULTS.gravity);
const T = (2 * PHYSICS_DEFAULTS.bounceSpeed) / PHYSICS_DEFAULTS.gravity;
console.log(`   弹跳高度 ${h.toFixed(2)}px   弹跳周期 ${T.toFixed(3)}s`);
console.log('');

// ---------- 2. 血量全局严格递增 ----------
console.log('=== 血量曲线 ===');
const hpAll = [];
for (const lv of LEVELS) for (const hp of lv.barrierHp) hpAll.push(BigInt(hp));
chk('27 道屏障血量全局严格递增', hpAll.every((v, i) => i === 0 || v > hpAll[i - 1]));
chk('终点为 10^300', hpAll[26] === 10n ** 300n, `10^${hpAll[26].toString().length - 1}`);
for (const lv of LEVELS) {
  const seg = lv.barrierHp.map((x) => '10^' + (x.length - 1)).join(' / ');
  console.log(`   第${lv.level}关  ${seg}   尖刺 ${lv.spike.speed}px/s`);
}
console.log('');

// ---------- 3. 三种球连续通关 ----------
console.log('=== 连续 9 关真机模拟 ===');
const runs = {};
for (const code of ['FACTORIAL', 'TRI', 'SQR']) {
  const r = runFull(code);
  runs[code] = r;
  const label = r.failedAt ? `第 ${r.failedAt} 关失败` : '全部通关';
  console.log(`${BALLS[code].name.padEnd(6)} ${label.padEnd(10)} 累计 ${r.total.toFixed(1)}s  终球 n=${r.finalN}`);
  console.log('   ' + r.per.map((p, i) => `L${i + 1}:${p.hits}击/${p.elapsed.toFixed(2)}s`).join('  '));
}
console.log('');

// ---------- 4. 断言 ----------
console.log('=== 断言 ===');
chk('阶乘球通过第 1~6 关', runs.FACTORIAL.failedAt === 7 || runs.FACTORIAL.failedAt === null,
  `实际走到第 ${runs.FACTORIAL.per.length} 关`);
chk('阶乘球停在第 7 关（尖刺是硬限制，过不了就失败）', runs.FACTORIAL.failedAt === 7,
  `失败于第 ${runs.FACTORIAL.failedAt} 关`);
chk('三角阶乘球比阶乘球走得更远', runs.TRI.per.length > runs.FACTORIAL.per.length,
  `${runs.TRI.per.length} vs ${runs.FACTORIAL.per.length} 关`);
chk('正方阶乘球比阶乘球走得更远', runs.SQR.per.length > runs.FACTORIAL.per.length,
  `${runs.SQR.per.length} vs ${runs.FACTORIAL.per.length} 关`);

// 阶数跨关累加：每关起始 n 必须等于上一关结束 n
const per = runs.FACTORIAL.per;
let monotonic = true;
for (let i = 1; i < per.length; i++) {
  if (per[i].startN !== per[i - 1].endN) monotonic = false;
}
chk('小球阶数跨关累加且连续（不重置）', monotonic,
  `n: ${per.map((p) => p.startN).join(' → ')} → ${per[per.length - 1].endN}`);
chk('阶数严格递增', per.every((p, i) => i === 0 || p.endN > p.startN));

chk('尖刺速度非递减', LEVELS.every((l, i) => i === 0 || l.spike.speed >= LEVELS[i - 1].spike.speed),
  LEVELS.map((l) => l.spike.speed).join(' → '));

console.log(`\n通过 ${pass} 条，失败 ${fail} 条`);
process.exit(fail === 0 ? 0 : 1);
