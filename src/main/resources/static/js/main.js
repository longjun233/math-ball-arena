// 入口：装配数据、物理、渲染、界面与状态机，驱动主循环。

import { loadGameData, reportRun } from './api.js';
import { PHYSICS_DEFAULTS, TRANSITION_DEFAULTS, BALL_DEFAULTS } from './config.js';
import { createRunState, stepPhysics, validatePhysics, STATUS } from './physics.js';
import { createRenderer, ballLabel, barrierColor } from './render.js';
import { createFx } from './fx.js';
import { formatDamage, hpPercent, selfCheck } from './formula.js';
import { createUi } from './ui.js';
import { createFlow, PHASE } from './levels.js';

const debugEnabled = new URLSearchParams(window.location.search).has('debug');
const MAX_SUBSTEPS = 600;

boot().catch((err) => {
  console.error('[boot] 启动失败', err);
  const box = document.getElementById('alert');
  box.textContent = '启动失败：' + err.message;
  box.classList.remove('hidden');
});

async function boot() {
  const data = await loadGameData();
  const physics = { ...PHYSICS_DEFAULTS, ...(data.physics || {}) };
  const transition = { ...TRANSITION_DEFAULTS, ...(data.transition || {}) };
  const balls = (data.balls && data.balls.length) ? data.balls : BALL_DEFAULTS;
  const fixedStep = physics.fixedStepSec || 1 / 120;

  // ---------- 启动自检 ----------
  const problems = [...selfCheck(data.levels), ...validatePhysics(physics)];
  for (const lv of data.levels) {
    const hp = lv.barrierHp.map(BigInt);
    if (!(hp[0] < hp[1] && hp[1] < hp[2])) {
      problems.push(`第 ${lv.level} 关屏障血量未指数递增`);
    }
  }

  const ui = createUi({ totalLevels: data.levels.length });
  ui.toggleDebug(debugEnabled);
  if (problems.length) {
    console.error('[selfCheck] 发现问题：\n' + problems.join('\n'));
    ui.showAlert('数值自检未通过，详见控制台');
  }

  // ---------- 渲染与特效 ----------
  const canvas = document.getElementById('stage');
  const renderer = createRenderer(canvas);
  renderer.resize(physics.canvasWidth, physics.canvasHeight);
  const fx = createFx();
  const flow = createFlow({ levels: data.levels, transition });

  // ---------- 运行时状态 ----------
  let runState = null;
  let activeBall = null;
  let accumulator = 0;
  let pulse = 0;

  ui.onDismiss(() => {
    ui.hideResult();
    flow.backHome();
    runState = null;
    activeBall = null;
    fx.clear();
    ui.showHome(balls, pickBall);
  });

  function pickBall(ball) {
    activeBall = ball;
    ui.hideHome();
    fx.clear();
    accumulator = 0;
    flow.startRun(ball);
    beginLevel();
  }

  function beginLevel() {
    const level = flow.enterLevel();
    runState = createRunState(level, activeBall, physics);
    accumulator = 0;
    pulse = 0;
    if (flow.state.phase === PHASE.RUNNING) {
      ui.hideIntro();
    } else {
      ui.showIntro(level.level);
    }
  }

  function handleEvent(ev) {
    switch (ev.type) {
      case 'hit': {
        const ratio = hpPercent(ev.barrier.hp > 0n ? ev.barrier.hp : 0n, ev.barrier.maxHp) / 100;
        pulse = 1;
        fx.burst(ev.x, ev.y, 14, barrierColor(ratio));
        fx.floatText(ev.x, ev.y - 16, `-${formatDamage(ev.damage)}`, '#ffd166');
        fx.shake(3);
        break;
      }
      case 'break':
        fx.shatter(ev.barrier, physics.canvasWidth, '#ff8fa6');
        fx.shake(9);
        break;
      case 'gameOver':
        finishRun(false);
        break;
      case 'levelClear':
        finishRun(true);
        break;
      default:
        break;
    }
  }

  function finishRun(cleared) {
    const snapshot = runState;
    if (!snapshot) return;
    const finalFormula = ballLabel(snapshot.ball);

    if (cleared) {
      const outcome = flow.levelClear(snapshot);
      if (outcome === 'ALL_CLEAR') {
        showResult(true, finalFormula);
      } else {
        beginLevel(); // 无缝进入下一关：不弹结算界面
      }
    } else {
      flow.gameOver(snapshot);
      showResult(false, finalFormula);
    }
  }

  function showResult(cleared, finalFormula) {
    const stats = { ...flow.state.stats, finalFormula };
    ui.showResult({ cleared, stats });
    reportRun({
      ball: stats.ballCode,
      reachedLevel: stats.reachedLevel,
      destroyedBarriers: stats.destroyed,
      cleared,
      totalDamage: stats.totalDamage.toString(),
      maxSingleDamage: stats.maxSingleDamage.toString(),
      elapsedMs: Math.round(stats.elapsedSec * 1000),
    });
  }

  // ---------- 主循环 ----------
  let lastTs = performance.now();
  let fps = 0;
  let fpsAccum = 0;
  let fpsFrames = 0;

  function frame(ts) {
    const rawDt = (ts - lastTs) / 1000;
    lastTs = ts;
    const dt = Math.min(Math.max(rawDt, 0), 0.1); // 钳制，防切后台跳变

    fpsAccum += rawDt;
    fpsFrames += 1;
    if (fpsAccum >= 0.5) {
      fps = fpsFrames / fpsAccum;
      fpsAccum = 0;
      fpsFrames = 0;
    }

    const phase = flow.state.phase;

    if (phase === PHASE.INTRO) {
      if (flow.tickIntro(dt)) ui.hideIntro();
    } else if (phase === PHASE.RUNNING && runState) {
      accumulator += dt;
      const frameState = runState;
      let steps = 0;
      while (accumulator >= fixedStep && steps < MAX_SUBSTEPS) {
        if (frameState.status !== STATUS.RUNNING) break;
        stepPhysics(frameState, fixedStep, handleEvent);
        accumulator -= fixedStep;
        steps += 1;
      }
      if (steps >= MAX_SUBSTEPS) accumulator = 0;
    }

    fx.update(dt);
    pulse = Math.max(0, pulse - dt * 5);

    if (runState && (phase === PHASE.RUNNING || phase === PHASE.INTRO)) {
      const spikeProgress = (runState.spike.y + runState.spike.height) / physics.safeZoneTop;
      ui.updateHud({
        level: flow.state.levelIndex + 1,
        ballName: activeBall ? activeBall.name : '',
        step: activeBall ? activeBall.step : 0,
        spikeProgress,
        offline: !!data.offline,
      });
    }

    renderer.draw(runState, fx, ts, { pulse });

    if (debugEnabled && runState) {
      const bar = runState.barriers.find((b) => b.alive) || null;
      ui.updateDebug([
        `fps        ${fps.toFixed(1)}`,
        `phase      ${phase}`,
        `level      ${flow.state.levelIndex + 1} / ${data.levels.length}`,
        `ball       ${activeBall ? activeBall.name : '-'} (n=${runState.ball.n}, step=+${runState.ball.step})`,
        `vx / vy    ${runState.ball.vx.toFixed(1)} / ${runState.ball.vy.toFixed(1)}`,
        `elapsed    ${runState.elapsed.toFixed(2)} s   (limit ${runState.level.timeLimitSec.toFixed(2)} s)`,
        `余量       ${((1 - runState.elapsed / runState.level.timeLimitSec) * 100).toFixed(0)} %`,
        `hits       ${runState.hits}`,
        `barrier    ${bar ? `#${bar.index + 1} hp=${bar.hp}` : 'none'}`,
        `spike y    ${runState.spike.y.toFixed(0)} px`,
        `physics    g=${physics.gravity} v0=${physics.bounceSpeed} vx=[${physics.vxMin},${physics.vxMax}]`,
      ]);
    }

    requestAnimationFrame(frame);
  }

  ui.showHome(balls, pickBall);
  renderer.draw(null, fx, performance.now(), {});
  requestAnimationFrame(frame);
}
