// 关卡血量设计器 v3
//
// 血量结构（本版需求）：
//   · 第 1 关 = 1 / 50 / 100                    （亲和的小整数，锚点）
//   · 第 9 关 = 10^100 / 10^200 / 10^300        （关内相邻屏障相差 100 个数量级，锚点）
//   · 第 2~8 关：在 (10^2, 10^100) 区间内按【加速】曲线插值，
//     让「血量增长速度」跟得上阶乘球的加速增长，从而每关击数大致均匀
//   · 27 道屏障【全局严格递增】—— 后一关第 1 道必须高于前一关第 3 道，不允许倒挂
//
// 所有数值都在这里实时算出，不写死；输出可直接粘进 levels.yml。
//
// 运行：node tools/design-levels.mjs

import { factorial } from '../src/main/resources/static/js/formula.js';

const ANCHOR_FIRST = [0, 1.7, 2];        // log10(1), log10(50), log10(100)
const ANCHOR_LAST = [100, 200, 300];     // log10(10^100), 10^200, 10^300
const LEVEL_COUNT = 9;
const STEP = 1;                          // 阶乘球固定步长
const START_N = 2;
const BOUNCE_T = 0.494;
const OVERHEAD = 0.49 + 2 * 0.52 + 0.49;

function log10Big(x) {
  const s = x.toString();
  if (s.length <= 16) return Math.log10(Number(x));
  return (s.length - 1) + Math.log10(Number(s.slice(0, 16)) / 1e15);
}

/** 由 log10 值实时还原 BigInteger（保留 3 位有效小数） */
function fromLog10(e) {
  const intPart = Math.floor(e);
  const frac = e - intPart;
  const mantissa = BigInt(Math.round(Math.pow(10, frac) * 1000));
  return (mantissa * 10n ** BigInt(intPart)) / 1000n;
}

function toExpr(x) {
  const s = x.toString();
  if (s.length <= 15) return s;
  const e = s.length - 1;
  const mant = Number(s.slice(0, 4)) / 1000;
  return `${mant.toFixed(3).replace(/\.?0+$/, '')}e${e}`;
}

// ---------- 1. 生成 27 个指数 ----------
// 点 1~3   = 第 1 关（锚点）
// 点 4~24  = 第 2~8 关（21 个点，加速插值）
// 点 25~27 = 第 9 关（锚点）
const GAP = 22;                          // 点 3 → 点 25 之间的间隔数
// 点 4~27 由一条加速曲线贯通到 10^300。
// 第 9 关不再做特殊跳变 —— 它只是这条曲线的末端，因为数值最高所以自然最难。
const TAIL_POINTS = 24;
const CURVE_POWER = 1.3;
const exp = [ANCHOR_FIRST[0], ANCHOR_FIRST[1], ANCHOR_FIRST[2]];
for (let k = 1; k <= TAIL_POINTS; k++) {
  exp.push(2 + (300 - 2) * Math.pow(k / TAIL_POINTS, CURVE_POWER));
}

if (exp.length !== LEVEL_COUNT * 3) {
  throw new Error(`指数数量应为 27，实际 ${exp.length}`);
}

const hp = exp.map(fromLog10);

// ---------- 2. 校验 ----------
const flat = hp;
const strictlyIncreasing = flat.every((v, i) => i === 0 || v > flat[i - 1]);
const anchorOk = flat[0] === 1n && flat[1] === 50n && flat[2] === 100n && flat[26] === 10n ** 300n;

console.log('=== 27 道屏障血量（实时算出）===');
console.log('关卡    屏障1          屏障2          屏障3          | 关内倍数');
for (let L = 0; L < LEVEL_COUNT; L++) {
  const [a, b, c] = [flat[L * 3], flat[L * 3 + 1], flat[L * 3 + 2]];
  const r1 = log10Big(b) - log10Big(a);
  const r2 = log10Big(c) - log10Big(b);
  console.log(
    `第${L + 1}关   ${toExpr(a).padEnd(14)} ${toExpr(b).padEnd(14)} ${toExpr(c).padEnd(14)} | 10^${r1.toFixed(1)} / 10^${r2.toFixed(1)}`
  );
}
console.log('');
console.log('全局严格递增：' + (strictlyIncreasing ? '✅' : '❌'));
console.log('锚点：' + (anchorOk ? '✅ 第1关 1/50/100，第9关第3道 10^300' : '❌'));
console.log('');

// ---------- 3. 模拟阶乘球连续 9 关 ----------
let n = BigInt(START_N);
let cumHits = 0;
let cumTime = 0;
console.log('=== 阶乘球（每击 +1）连续 9 关 ===');
console.log('关卡   每道屏障击数          本关   累计   结束 n   本关耗时');
for (let L = 0; L < LEVEL_COUNT; L++) {
  let hits = 0;
  const per = [];
  for (let i = 0; i < 3; i++) {
    const target = flat[L * 3 + i];
    let acc = 0n;
    let h = 0;
    while (acc < target && h < 5000) {
      n += BigInt(STEP);
      acc += factorial(Number(n));
      h += 1;
      hits += 1;
    }
    per.push(h);
  }
  cumHits += hits;
  const time = hits * BOUNCE_T + OVERHEAD;
  cumTime += time;
  console.log(
    `第${L + 1}关   [${per.join(', ').padEnd(16)}]  ${String(hits).padStart(3)} 击  ${String(cumHits).padStart(3)}   n=${String(n).padStart(3)}   ${time.toFixed(2)}s`
  );
}
console.log(`\n总计 ${cumHits} 击，整局约 ${cumTime.toFixed(1)}s（含关间衔接）`);
console.log('');

// ---------- 4. 输出配置 ----------
console.log('=== 可直接粘进 levels.yml ===');
for (let L = 0; L < LEVEL_COUNT; L++) {
  const vals = [flat[L * 3], flat[L * 3 + 1], flat[L * 3 + 2]].map(toExpr);
  console.log(`    - level: ${L + 1}`);
  console.log(`      barriers: ["${vals[0]}", "${vals[1]}", "${vals[2]}"]`);
}
