// 前端模块语法与加载检查（不含 main.js，它需要 DOM）。
// 运行：node tools/syntax-check.mjs

const MODULES = ['config', 'formula', 'traits', 'api', 'physics', 'fx', 'render', 'ui', 'levels'];

let fail = 0;
for (const name of MODULES) {
  try {
    await import(`../src/main/resources/static/js/${name}.js`);
    console.log(`✅ ${name}.js 加载正常`);
  } catch (err) {
    fail++;
    console.log(`❌ ${name}.js 加载失败：${err.message}`);
  }
}

// 顺手校验格式化规则的关键边界（规格 §8.2）
const { formatDamage, formatHp, damageOf, hpPercent, selfCheck } = await import('../src/main/resources/static/js/formula.js');
const cases = [
  [720n, '720'],
  [362880n, '362,880'],
  [479001600n, '4.79×10⁸'],
  [10n ** 300n, '1.00×10³⁰⁰'],
];
for (const [input, expected] of cases) {
  const got = formatDamage(input);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} formatDamage(${input}) = ${got}${ok ? '' : ` 期望 ${expected}`}`);
}

const hpCases = [[10n ** 20n, '10²⁰'], [10n ** 300n, '10³⁰⁰']];
for (const [input, expected] of hpCases) {
  const got = formatHp(input);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} formatHp(${input}) = ${got}${ok ? '' : ` 期望 ${expected}`}`);
}

// 血条百分比必须走 BigInt，10^300 不能溢出
const pct = hpPercent(10n ** 300n, 10n ** 300n);
const okPct = pct === 100;
if (!okPct) fail++;
console.log(`${okPct ? '✅' : '❌'} hpPercent(10^300, 10^300) = ${pct}`);

const half = hpPercent(10n ** 299n, 10n ** 300n);
const okHalf = Math.abs(half - 10) < 0.01;
if (!okHalf) fail++;
console.log(`${okHalf ? '✅' : '❌'} hpPercent(10^299, 10^300) = ${half}`);

// 公式球正确性
const formulaCases = [
  ['FACTORIAL', 4, 24n],
  ['TRI', 4, 3628800n],
  ['SQR', 3, 362880n],
];
for (const [ball, n, expected] of formulaCases) {
  const got = damageOf(ball, n);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} damageOf(${ball}, ${n}) = ${got}${ok ? '' : ` 期望 ${expected}`}`);
}

// 自检函数对空 formulaCheck 必须静默通过
const problems = selfCheck([{ level: 1, formulaCheck: null }]);
const okSilent = problems.length === 0;
if (!okSilent) fail++;
console.log(`${okSilent ? '✅' : '❌'} selfCheck 对兜底配置静默通过`);

console.log(`\n${fail === 0 ? '全部通过' : `失败 ${fail} 项`}`);
process.exit(fail === 0 ? 0 : 1);
