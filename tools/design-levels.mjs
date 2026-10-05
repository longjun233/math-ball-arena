// 关卡血量设计器
//
// 设计前提（本版变更）：
//   1. 小球阶数跨关累加，第 N 关从上一关结束时的 n 继续，不重置
//   2. 9 关是一条连续成长曲线被切成 9 段，27 道屏障的血量指数必须【全局严格递增】
//      不允许出现「第 8 关第 3 道 10^150 而第 9 关第 1 道 10^100」这种倒挂
//   3. 第 27 道（第 9 关第 3 道）屏障锁定 10^300
//   4. 每关 3 道屏障，血量均为 10 的整数次幂
//
// 方法：以阶乘球（每击 +2，n 从 2 起）为节奏基准，每 3 击推进一道屏障，
//       取该段累积伤害的量级作为该道屏障的血量指数，再强制全局严格递增，
//       最后把终点对齐到 10^300。
//
// 运行：node tools/design-levels.mjs

import { factorial } from '../src/main/resources/static/js/formula.js';

const START_N = 2;
const STEP = 2;              // 阶乘球固定步长
const HITS_PER_BARRIER = 3;  // 节奏基准：每 3 击破一道屏障
const LEVELS = 9;
const BARRIERS_PER_LEVEL = 3;
const TOTAL_BARRIERS = LEVELS * BARRIERS_PER_LEVEL; // 27
const FINAL_EXPONENT = 300;

function log10Big(x) {
  const s = x.toString();
  if (s.length <= 16) return Math.log10(Number(x));
  return (s.length - 1) + Math.log10(Number(s.slice(0, 16)) / 1e15);
}

// ---------- 1. 按节奏基准求出每道屏障的理想量级 ----------
let n = START_N;
const raw = [];
for (let i = 0; i < TOTAL_BARRIERS; i++) {
  let segment = 0n;
  for (let h = 0; h < HITS_PER_BARRIER; h++) {
    n += STEP;
    segment += factorial(n);
  }
  raw.push({ barrier: i + 1, n, log: log10Big(segment) });
}

console.log('=== 节奏基准（阶乘球每 3 击一道屏障）===');
console.log(raw.map((r) => `#${r.barrier}:${r.log.toFixed(1)}`).join('  '));
console.log('');

// ---------- 2. 取整并强制全局严格递增 ----------
const exps = [];
let prev = -1;
for (const r of raw) {
  let e = Math.floor(r.log);
  if (e <= prev) e = prev + 1;
  exps.push(e);
  prev = e;
}

// ---------- 3. 把终点对齐到 10^300，并从后往前平滑低指数 ----------
// 终点固定，前面的指数在「节奏基准」与「终点」之间做保序拉伸
const last = exps.length - 1;
if (exps[last] !== FINAL_EXPONENT) {
  const scale = FINAL_EXPONENT / exps[last];
  for (let i = 0; i <= last; i++) {
    exps[i] = Math.max(i === 0 ? 1 : exps[i - 1] + 1, Math.round(exps[i] * scale));
  }
  exps[last] = FINAL_EXPONENT;
  // 再次保证严格递增（缩放可能造成尾部相等）
  for (let i = last - 1; i >= 0; i--) {
    if (exps[i] >= exps[i + 1]) exps[i] = exps[i + 1] - 1;
  }
  for (let i = 1; i <= last; i++) {
    if (exps[i] <= exps[i - 1]) exps[i] = exps[i - 1] + 1;
  }
  exps[last] = FINAL_EXPONENT;
}

console.log('=== 27 道屏障血量指数（全局严格递增）===');
for (let lv = 0; lv < LEVELS; lv++) {
  const seg = exps.slice(lv * 3, lv * 3 + 3);
  console.log(`第${lv + 1}关: 10^${seg[0]} / 10^${seg[1]} / 10^${seg[2]}`);
}
console.log('');
console.log('严格递增检查：' + (exps.every((e, i) => i === 0 || e > exps[i - 1]) ? '✅' : '❌'));
console.log('终点检查：' + (exps[26] === 300 ? '✅ 10^300' : `❌ 10^${exps[26]}`));
console.log('');

// ---------- 4. 输出可直接粘贴的配置 ----------
console.log('=== levels.yml / config.js 的 hpExponent ===');
for (let lv = 0; lv < LEVELS; lv++) {
  const seg = exps.slice(lv * 3, lv * 3 + 3);
  console.log(`  { level: ${lv + 1}, hpExponent: [${seg.join(', ')}] },`);
}
