// 物理内核：固定步长积分 + 垂直分量固定 / 水平分量随机的反弹。
// 纯函数风格，不接触 DOM，便于单测。
//
// 为什么固定垂直分量：见 docs/工程提示词.md §6.2。
// 若改成「速度大小固定、角度真随机」，垂直分量会随角度波动，
// 弹跳高度与弹跳周期都不再恒定，9 关限时表会全部失效。

import { damageOf } from './formula.js';
import { TRAITS } from './traits.js';

export const STATUS = {
  RUNNING: 'RUNNING',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
  GAME_OVER: 'GAME_OVER',
};

export function createRunState(level, ball, physics, traitCode = 'none') {
  const barriers = physics.barrierTopY.map((top, i) => {
    const hp = BigInt(level.barrierHp[i]);
    return { index: i, top, hp, maxHp: hp, alive: true };
  });

  return {
    level,
    physics,
    traitCode,
    ball: {
      x: physics.canvasWidth / 2,
      y: physics.ballStartY,
      vx: 0,
      vy: 0,
      n: physics.ballStartN,
      step: ball.step,
      ballCode: ball.code,
      radius: physics.ballRadius,
      gravityMul: 1,
    },
    barriers,
    spike: {
      y: -physics.spikeHeight,
      speed: level.spike.speed,
      height: physics.spikeHeight,
    },
    hitCooldown: 0,
    elapsed: 0,
    hits: 0,
    totalDamage: 0n,
    maxSingleDamage: 0n,
    status: STATUS.RUNNING,
  };
}

/** 当前尚未破碎的最低一道屏障。 */
export function currentBarrier(state) {
  for (const b of state.barriers) {
    if (b.alive) return b;
  }
  return null;
}

/** 球体与屏障矩形是否相交（屏障横跨全宽）。 */
export function ballHitsBarrier(ball, bar, barrierHeight) {
  const bottom = ball.y + ball.radius;
  return ball.vy > 0 && bottom >= bar.top && ball.y - ball.radius < bar.top + barrierHeight;
}

/**
 * 推进一个固定步长。
 * @param onEvent 事件回调：hit / break / gameOver / levelClear
 */
export function stepPhysics(state, dt, onEvent) {
  if (state.status !== STATUS.RUNNING) return;

  const p = state.physics;
  const ball = state.ball;
  const r = ball.radius;

  ball.vy += p.gravity * ball.gravityMul * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // 左右实体墙：水平反弹，垂直分量不受影响
  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = -ball.vx;
  } else if (ball.x + r > p.canvasWidth) {
    ball.x = p.canvasWidth - r;
    ball.vx = -ball.vx;
  }

  // 尖刺下落
  state.spike.y += state.spike.speed * dt;
  if (state.spike.y + state.spike.height >= ball.y - r) {
    state.status = STATUS.GAME_OVER;
    onEvent?.({ type: 'gameOver' });
    return;
  }

  // 屏障碰撞
  const bar = currentBarrier(state);
  if (bar && state.hitCooldown <= 0 && ballHitsBarrier(ball, bar, p.barrierHeight)) {
    ball.y = bar.top - r;
    ball.vy = -p.bounceSpeed;                       // 垂直分量固定 → 弹跳高度恒定
    const sign = Math.random() < 0.5 ? -1 : 1;
    ball.vx = sign * (p.vxMin + Math.random() * (p.vxMax - p.vxMin)); // 水平分量随机
    state.hitCooldown = 0.06;

    TRAITS[state.traitCode]?.onHit?.(ball);

    ball.n += ball.step;                            // 先升阶
    const damage = damageOf(ball.ballCode, ball.n); // 后结算伤害
    bar.hp -= damage;
    state.hits += 1;
    state.totalDamage += damage;
    if (damage > state.maxSingleDamage) state.maxSingleDamage = damage;

    onEvent?.({ type: 'hit', barrier: bar, damage, n: ball.n, x: ball.x, y: bar.top });
    if (bar.hp <= 0n) {
      bar.alive = false;
      onEvent?.({ type: 'break', barrier: bar });
    }
  }

  if (state.hitCooldown > 0) state.hitCooldown -= dt;
  state.elapsed += dt;

  if (ball.y - r > p.safeZoneTop) {
    state.status = STATUS.LEVEL_CLEAR;
    onEvent?.({ type: 'levelClear' });
  }
}

/**
 * 校验物理不变量（规格 §6.3）。
 * @returns 问题描述数组，空数组表示全部通过
 */
export function validatePhysics(p) {
  const problems = [];
  const bounceHeight = (p.bounceSpeed * p.bounceSpeed) / (2 * p.gravity);
  if (bounceHeight >= 0.6 * p.barrierGap) {
    problems.push(`弹跳高度 ${bounceHeight.toFixed(2)}px 必须小于屏障间距的 60%（${(0.6 * p.barrierGap).toFixed(2)}px）`);
  }
  if (p.barrierTopY.length !== 3) {
    problems.push(`屏障数量必须为 3，当前 ${p.barrierTopY.length}`);
  }
  for (let i = 1; i < p.barrierTopY.length; i++) {
    if (p.barrierTopY[i] <= p.barrierTopY[i - 1]) {
      problems.push('屏障 y 坐标必须自上而下递增');
    }
  }
  if (p.vxMin > p.vxMax) {
    problems.push('vxMin 不能大于 vxMax');
  }
  return problems;
}
