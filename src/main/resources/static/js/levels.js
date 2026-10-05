// 状态机与关卡推进。
// 关键约束：过关绝不弹结算界面，只走 0.6s 关卡号过场，然后小球回到顶部重新下落。

export const PHASE = {
  HOME: 'HOME',
  INTRO: 'INTRO',
  RUNNING: 'RUNNING',
  ALL_CLEAR: 'ALL_CLEAR',
  GAME_OVER: 'GAME_OVER',
};

export function createFlow({ levels, transition }) {
  const state = {
    phase: PHASE.HOME,
    levelIndex: 0,
    introRemaining: 0,
    run: null,
    stats: null,
  };

  function resetStats(ball) {
    state.stats = {
      ballCode: ball.code,
      ballName: ball.name,
      step: ball.step,
      totalDamage: 0n,
      maxSingleDamage: 0n,
      destroyed: 0,
      elapsedSec: 0,
      reachedLevel: 1,
      cleared: false,
    };
  }

  function startRun(ball) {
    state.levelIndex = 0;
    resetStats(ball);
    return levels[0];
  }

  function currentLevel() {
    return levels[state.levelIndex];
  }

  /** 进入关卡过场。返回该关配置。 */
  function enterLevel() {
    const level = currentLevel();
    state.phase = PHASE.INTRO;
    state.introRemaining = transition.enabled ? transition.durationMs / 1000 : 0;
    if (state.stats) state.stats.reachedLevel = level.level;
    if (state.phase === PHASE.INTRO && state.introRemaining <= 0) {
      state.phase = PHASE.RUNNING;
    }
    return level;
  }

  function tickIntro(dt) {
    if (state.phase !== PHASE.INTRO) return false;
    state.introRemaining -= dt;
    if (state.introRemaining <= 0) {
      state.phase = PHASE.RUNNING;
      return true; // 过场结束
    }
    return false;
  }

  function absorb(runState) {
    if (!state.stats) return;
    state.stats.totalDamage = runState.totalDamage;
    state.stats.maxSingleDamage = runState.maxSingleDamage;
    state.stats.elapsedSec += runState.elapsed;
    state.stats.destroyed += runState.barriers.filter((b) => !b.alive).length;
  }

  function gameOver(runState) {
    absorb(runState);
    state.phase = PHASE.GAME_OVER;
    return state.stats;
  }

  /** 本关通过。返回 'NEXT'（还有下一关）或 'ALL_CLEAR'。 */
  function levelClear(runState) {
    absorb(runState);
    if (state.levelIndex + 1 >= levels.length) {
      state.stats.cleared = true;
      state.phase = PHASE.ALL_CLEAR;
      return 'ALL_CLEAR';
    }
    state.levelIndex += 1;
    return 'NEXT';
  }

  function backHome() {
    state.phase = PHASE.HOME;
    state.run = null;
  }

  return { state, startRun, enterLevel, tickIntro, gameOver, levelClear, backHome, currentLevel };
}
