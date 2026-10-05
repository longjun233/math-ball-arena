// 接口验收脚本：启动服务后运行，逐项核对契约。
// 运行：node tools/api-check.mjs [baseUrl]

const BASE = process.argv[2] || 'http://localhost:8080';

let pass = 0;
let fail = 0;
const chk = (label, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '✅' : '❌'} ${label}${extra ? '  ' + extra : ''}`);
};

async function main() {
  // ---------- /api/levels ----------
  const res = await fetch(`${BASE}/api/levels`);
  chk('GET /api/levels 返回 200', res.status === 200, `HTTP ${res.status}`);
  const data = await res.json();

  chk('关卡数量为 9', data.levels?.length === 9, `实际 ${data.levels?.length}`);
  chk('返回物理常量', !!data.physics && data.physics.gravity > 0);
  chk('返回过场配置', !!data.transition);

  for (const lv of data.levels) {
    const lens = lv.barrierHp.map((h) => h.length);
    const okInc = BigInt(lv.barrierHp[0]) < BigInt(lv.barrierHp[1]) && BigInt(lv.barrierHp[1]) < BigInt(lv.barrierHp[2]);
    chk(`第 ${lv.level} 关血量严格指数递增`, okInc, `位数 ${lens.join('/')}`);
  }

  const lv9 = data.levels[8];
  chk('第 9 关第 3 道屏障为 10^300（301 位字符串）', lv9.barrierHp[2].length === 301 && lv9.barrierHp[2][0] === '1',
    `位数 ${lv9.barrierHp[2].length}`);

  const speeds = data.levels.map((l) => l.spike.speed);
  chk('尖刺速度逐关递增', speeds.every((s, i) => i === 0 || s > speeds[i - 1]), speeds.join(' → '));

  const limits = data.levels.map((l) => l.timeLimitSec);
  chk('限时逐关收紧', limits.every((s, i) => i === 0 || s < limits[i - 1]), limits.map((v) => v.toFixed(2)).join(' → '));

  chk('每关附带 formulaCheck（前端启动自检用）', data.levels.every((l) => l.formulaCheck?.damage?.length === 4));

  // ---------- /api/balls ----------
  const ballsRes = await fetch(`${BASE}/api/balls`);
  chk('GET /api/balls 返回 200', ballsRes.status === 200);
  const balls = await ballsRes.json();
  chk('球种数量 >= 3', balls.length >= 3, balls.map((b) => `${b.name}${b.formula}+${b.step}`).join(' | '));
  chk('每种球都有固定步长', balls.every((b) => Number.isInteger(b.step) && b.step > 0));

  // ---------- 静态资源 ----------
  for (const path of ['/', '/css/style.css', '/js/main.js', '/js/physics.js', '/js/formula.js']) {
    const r = await fetch(`${BASE}${path}`);
    chk(`静态资源 ${path} 可访问`, r.status === 200, `HTTP ${r.status}`);
  }

  // ---------- /api/runs ----------
  const post = await fetch(`${BASE}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ball: 'SQR',
      reachedLevel: 9,
      destroyedBarriers: 27,
      cleared: true,
      totalDamage: '1' + '0'.repeat(300),
      maxSingleDamage: '1' + '0'.repeat(304),
      elapsedMs: 30500,
    }),
  });
  chk('POST /api/runs 返回 200', post.status === 200);
  const best = await (await fetch(`${BASE}/api/runs/best`)).json();
  chk('GET /api/runs/best 记录到 9 关', best.maxLevel === 9, JSON.stringify(best));

  console.log(`\n通过 ${pass} 条，失败 ${fail} 条`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('接口验收失败：', err.message);
  process.exit(1);
});
