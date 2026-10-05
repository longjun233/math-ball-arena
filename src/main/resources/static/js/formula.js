// 公式求值与数值格式化。
// 全部伤害/血量运算使用 BigInt；Number 只用于动画插值与位数统计。

const FACT = [1n];

export function factorial(n) {
  for (let i = FACT.length; i <= n; i++) {
    FACT.push(FACT[i - 1] * BigInt(i));
  }
  return FACT[n];
}

/** T(n)!，T(n) = n(n+1)/2 */
export function triFactorial(n) {
  return factorial((n * (n + 1)) / 2);
}

/** (n²)! */
export function squareFactorial(n) {
  return factorial(n * n);
}

export function damageOf(ballCode, n) {
  switch (ballCode) {
    case 'FACTORIAL':
      return factorial(n);
    case 'TRI':
      return triFactorial(n);
    case 'SQR':
      return squareFactorial(n);
    default:
      throw new Error('未知球种: ' + ballCode);
  }
}

const SUP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

export function superscript(value) {
  return [...String(value)].map((c) => SUP[c] ?? c).join('');
}

export function groupThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 伤害格式化规则（规格 §8.2，必须完全一致）：
 *   < 1,000,000  → 千分位
 *   >= 1,000,000 → 科学计数法，3 位有效数字
 */
export function formatDamage(d) {
  const s = d.toString();
  if (s.length <= 6) return groupThousands(s);
  const e = s.length - 1;
  const mantissa = Number(s.slice(0, 4)) / 1000;
  return `${mantissa.toFixed(2)}×10${superscript(e)}`;
}

/** 血量格式化：10 的整数次幂显示为 10^n，其它退化为科学计数法。 */
export function formatHp(d) {
  const s = d.toString();
  if (s[0] === '1' && /^0*$/.test(s.slice(1))) {
    return `10${superscript(s.length - 1)}`;
  }
  return formatDamage(d);
}

/** 血条百分比：全程 BigInt 运算，避免转 Number 溢出。 */
export function hpPercent(hp, maxHp) {
  if (maxHp <= 0n) return 0;
  if (hp <= 0n) return 0;
  const basisPoints = (hp * 10000n) / maxHp; // 万分比
  return Math.min(100, Number(basisPoints) / 100);
}

/**
 * 启动自检：用本地公式重算后端下发的 formulaCheck，不一致即返回问题描述。
 * 防止前后端公式实现漂移。
 */
export function selfCheck(levels) {
  const problems = [];
  for (const lv of levels) {
    const c = lv.formulaCheck;
    if (!c) continue;
    let n = c.startN;
    let cum = 0n;
    for (let i = 0; i < c.damage.length; i++) {
      n += c.step;
      const d = damageOf(c.ball, n);
      cum += d;
      if (d.toString() !== c.damage[i]) {
        problems.push(`第 ${lv.level} 关第 ${i + 1} 次伤害不一致：本地 ${d}，后端 ${c.damage[i]}`);
      }
      if (cum.toString() !== c.cumulative[i]) {
        problems.push(`第 ${lv.level} 关第 ${i + 1} 次累积不一致：本地 ${cum}，后端 ${c.cumulative[i]}`);
      }
    }
  }
  return problems;
}
