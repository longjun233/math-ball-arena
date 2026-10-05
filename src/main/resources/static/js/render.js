// Canvas 渲染：背景、安全区、屏障、尖刺墙、小球、粒子、飘字。
// 只画游戏世界；HUD 与界面由 ui.js 用 DOM 绘制。

import { formatHp, hpPercent } from './formula.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function barrierColor(ratio) {
  if (ratio > 0.6) return '#31d0aa';
  if (ratio > 0.3) return '#ffb020';
  return '#ff4d5e';
}

export function ballLabel(ball) {
  switch (ball.ballCode) {
    case 'FACTORIAL': return `${ball.n}!`;
    case 'TRI': return `T(${ball.n})!`;
    case 'SQR': return `(${ball.n}²)!`;
    default: return `${ball.n}!`;
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let logicalWidth = 900;
  let logicalHeight = 760;

  function resize(width, height) {
    logicalWidth = width;
    logicalHeight = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.aspectRatio = `${width} / ${height}`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawBackground(W, H, now) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1020');
    g.addColorStop(1, '#131a33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 缓慢流动的网格
    const offset = (now / 60) % 60;
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -60 + offset; x < W + 60; x += 60) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += 60) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  }

  function drawSafeZone(p) {
    const W = p.canvasWidth;
    const top = p.safeZoneTop;
    const h = p.canvasHeight - top;
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, 'rgba(124, 245, 255, 0.02)');
    g.addColorStop(1, 'rgba(124, 245, 255, 0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, h);

    ctx.strokeStyle = 'rgba(124, 245, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(W, top);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(124, 245, 255, 0.55)';
    ctx.font = '600 13px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SAFE ZONE', W / 2, top + h / 2);
  }

  function drawBarrier(bar, p) {
    const W = p.canvasWidth;
    const h = p.barrierHeight;
    const ratio = hpPercent(bar.hp, bar.maxHp) / 100;
    const color = barrierColor(ratio);

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(10, 18, 36, 0.92)';
    roundRect(ctx, 0, bar.top, W, h, 8);
    ctx.fill();
    ctx.restore();

    // 血条
    ctx.save();
    roundRect(ctx, 0, bar.top, W, h, 8);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, bar.top, W * Math.max(0, ratio), h);
    ctx.restore();

    // 边框
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.9;
    roundRect(ctx, 0.75, bar.top + 0.75, W - 1.5, h - 1.5, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 血量数字（10 的幂形式）
    const label = formatHp(bar.hp > 0n ? bar.hp : 0n);
    ctx.font = '700 14px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(6, 12, 24, 0.85)';
    ctx.fillText(label, W / 2 + 1, bar.top + h / 2 + 1);
    ctx.fillStyle = ratio < 0.5 ? '#ffffff' : '#04121f';
    ctx.fillText(label, W / 2, bar.top + h / 2);
  }

  function drawSpikes(spike, W, height) {
    const toothW = 36;
    const count = Math.ceil(W / toothW);
    const top = spike.y;
    const bottom = spike.y + height;

    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#7a0f24');
    g.addColorStop(0.55, '#ff2d55');
    g.addColorStop(1, '#ff8fa6');

    ctx.save();
    ctx.shadowColor = 'rgba(255, 45, 85, 0.85)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x0 = i * toothW;
      ctx.moveTo(x0, top);
      ctx.lineTo(x0 + toothW / 2, bottom);
      ctx.lineTo(x0 + toothW, top);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 顶部压条
    ctx.fillStyle = '#5c0b1c';
    ctx.fillRect(0, top, W, 6);
  }

  function drawBall(ball, pulse) {
    const r = ball.radius;
    const scale = 1 + 0.15 * pulse;
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.scale(scale, scale);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.6);
    glow.addColorStop(0, 'rgba(124, 245, 255, 0.55)');
    glow.addColorStop(1, 'rgba(124, 245, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.45, '#7cf5ff');
    body.addColorStop(1, '#1b7fa8');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    if (pulse > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.9})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.2 + pulse * 0.9), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 公式：常态只显示公式本身，不显示算出来的数值
    const label = ballLabel(ball);
    const fontSize = Math.max(9, Math.min(17, 84 / label.length));
    ctx.font = `800 ${fontSize}px "JetBrains Mono", Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(4, 14, 26, 0.8)';
    ctx.strokeText(label, ball.x, ball.y);
    ctx.fillStyle = '#04222e';
    ctx.fillText(label, ball.x, ball.y);
  }

  function drawDebris(fx) {
    for (const d of fx.debris) {
      const alpha = Math.max(0, d.life / d.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
      ctx.restore();
    }
  }

  function drawParticles(fx) {
    for (const p of fx.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts(fx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of fx.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = '800 22px "JetBrains Mono", Consolas, monospace';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2, 8, 18, 0.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function draw(state, fx, now, opts = {}) {
    if (!state) {
      drawBackground(logicalWidth, logicalHeight, now);
      return;
    }
    const p = state.physics;
    const W = p.canvasWidth;
    const H = p.canvasHeight;
    const off = fx.shakeOffset();

    ctx.save();
    ctx.translate(off.x, off.y);

    drawBackground(W, H, now);
    drawSafeZone(p);
    for (const b of state.barriers) {
      if (b.alive) drawBarrier(b, p);
    }
    drawDebris(fx);
    drawSpikes(state.spike, W, state.spike.height);
    if (!opts.hideBall) drawBall(state.ball, opts.pulse || 0);
    drawParticles(fx);
    drawTexts(fx);

    ctx.restore();
  }

  return { resize, draw, drawBackground, drawBall };
}
