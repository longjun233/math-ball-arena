// DOM 界面：HUD、选球主界面、关卡过场、结束界面（纯数据无按钮）、调试面板。

import { formatDamage, formatHp } from './formula.js';

const $ = (id) => document.getElementById(id);

export function createUi({ totalLevels }) {
  const hud = $('hud');
  const home = $('home');
  const result = $('result');
  const intro = $('intro');
  const introText = $('intro-text');
  const alertBox = $('alert');
  const debugBox = $('debug');
  const cards = $('ball-cards');

  let dismissHandler = null;
  result.addEventListener('click', () => {
    if (dismissHandler) dismissHandler();
  });

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
  }

  function showHome(balls, onPick) {
    cards.innerHTML = '';
    for (const b of balls) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ball-card';
      card.innerHTML = `
        <div class="bc-formula">${b.formula}</div>
        <div class="bc-name">${b.name}</div>
        <div class="bc-step">每击 +${b.step} 阶</div>
        <div class="bc-stars">${'★'.repeat(b.stars)}${'☆'.repeat(Math.max(0, 3 - b.stars))}</div>`;
      card.addEventListener('click', () => onPick(b));
      cards.appendChild(card);
    }
    home.classList.remove('hidden');
    hud.classList.add('hidden');
    result.classList.add('hidden');
  }

  function hideHome() {
    home.classList.add('hidden');
    hud.classList.remove('hidden');
  }

  function showIntro(level) {
    introText.textContent = `LEVEL ${level} / ${totalLevels}`;
    intro.classList.remove('hidden');
    intro.classList.remove('fade');
  }

  function hideIntro() {
    intro.classList.add('fade');
    setTimeout(() => intro.classList.add('hidden'), 200);
  }

  function updateHud({ level, ballName, step, degree, spikeProgress, offline }) {
    $('hud-level').textContent = `LEVEL ${level} / ${totalLevels}`;
    const degreeText = Number.isFinite(degree) ? ` · n = ${degree}` : '';
    $('hud-ball').textContent = `${ballName} · 每击 +${step} 阶${degreeText}`;
    $('hud-progress').style.width = `${Math.round(Math.min(1, Math.max(0, spikeProgress)) * 100)}%`;
    $('hud-offline').classList.toggle('hidden', !offline);
  }

  function showResult({ cleared, stats }) {
    $('result-title').textContent = cleared ? 'ALL CLEAR' : 'GAME OVER';
    $('result-title').className = cleared ? 'clear' : 'over';

    const rows = [
      ['到达关卡', `第 ${stats.reachedLevel} 关`],
      ['摧毁屏障', `${stats.destroyed} / ${totalLevels * 3}`],
      ['最终公式', stats.finalFormula],
      ['累计总伤害', formatDamage(stats.totalDamage)],
      ['单次最高伤害', formatDamage(stats.maxSingleDamage)],
      ['存活时间', `${stats.elapsedSec.toFixed(2)} s`],
      ['使用球种', `${stats.ballName}（每击 +${stats.step} 阶）`],
    ];
    $('result-stats').innerHTML = rows
      .map(([k, v]) => `<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');

    result.classList.remove('hidden');
    hud.classList.add('hidden');
  }

  function onDismiss(handler) {
    dismissHandler = handler;
  }

  function hideResult() {
    result.classList.add('hidden');
  }

  function updateDebug(lines) {
    if (!debugBox) return;
    debugBox.textContent = lines.join('\n');
  }

  function toggleDebug(enabled) {
    debugBox.classList.toggle('hidden', !enabled);
  }

  return {
    showHome, hideHome,
    showIntro, hideIntro,
    updateHud,
    showResult, hideResult, onDismiss,
    showAlert, updateDebug, toggleDebug,
  };
}
