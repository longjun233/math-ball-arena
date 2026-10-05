// 状态机与关卡推进。
//
// 两条关键约束：
//   1. 【无缝】过关不弹结算界面、不暂停：小球落入安全区的下一帧就直接进入下一关。
//      9 关本质是同一条成长曲线被切成 9 段。
//   2. 【跨关累加】小球阶数不重置，必须由调用方把上一关结束时的 n 传给下一关。

export const PHASE = {
  HOME: 'HOME',
  RUNNING: 'RUNNING',
  ALL_CLEAR: 'ALL_CLEAR',
  GAME_OVER: 'GAME_OVER',
};

export function createFlow({ levels, transition }) {
  const state = {
    phase: PHASE.HOME,
    levelIndex: 0,
    stats: null,
    bannerMs: transition?.bannerMs ?? 800,
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

  /** 进入当前关：立刻开跑，不停顿。 */
  function enterLevel() {
    const level = currentLevel();
    state.phase = PHASE.RUNNING;
    if (state.stats) state.stats.reachedLevel = level.level;
    return { level, bannerMs: state.bannerMs };
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
  }

  return { state, startRun, enterLevel, gameOver, levelClear, backHome, currentLevel };
}
