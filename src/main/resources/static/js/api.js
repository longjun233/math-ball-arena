// 数据加载：优先后端，失败回退内置配置。

import { FALLBACK_LEVELS, BALL_DEFAULTS } from './config.js';

async function getJson(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadGameData() {
  try {
    const [levels, balls] = await Promise.all([
      getJson('/api/levels'),
      getJson('/api/balls').catch(() => BALL_DEFAULTS),
    ]);
    if (!levels || !Array.isArray(levels.levels) || levels.levels.length === 0) {
      throw new Error('关卡配置为空');
    }
    return {
      levels: levels.levels,
      physics: levels.physics,
      transition: levels.transition,
      balls,
      offline: false,
    };
  } catch (err) {
    console.warn('[api] 后端不可用，使用内置兜底配置：', err.message);
    return { ...FALLBACK_LEVELS, balls: BALL_DEFAULTS };
  }
}

export function reportRun(report) {
  return fetch('/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  }).catch(() => null);
}
