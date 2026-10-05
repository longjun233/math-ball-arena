// 特效：粒子迸发、伤害飘字、震屏、屏障碎片。

export function createFx() {
  const particles = [];
  const texts = [];
  const debris = [];
  let shakeAmount = 0;
  let shakeTime = 0;

  function burst(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        size: 1.5 + Math.random() * 3,
        color,
      });
    }
  }

  function floatText(x, y, text, color) {
    texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function shatter(bar, canvasWidth, color) {
    const count = 7 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      debris.push({
        x: (canvasWidth / 2) + (Math.random() - 0.5) * canvasWidth * 0.8,
        y: bar.top + 8,
        vx: (Math.random() - 0.5) * 260,
        vy: -80 - Math.random() * 160,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 8,
        w: 24 + Math.random() * 40,
        h: 8 + Math.random() * 8,
        life: 1.1,
        maxLife: 1.1,
        color,
      });
    }
  }

  function shake(amount) {
    shakeAmount = Math.max(shakeAmount, amount);
    shakeTime = 0.12;
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.995;
    }

    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      if (t.life <= 0) { texts.splice(i, 1); continue; }
      t.y -= 46 * dt;
    }

    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.life -= dt;
      if (d.life <= 0) { debris.splice(i, 1); continue; }
      d.vy += 1400 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vrot * dt;
    }

    if (shakeTime > 0) {
      shakeTime -= dt;
      if (shakeTime <= 0) shakeAmount = 0;
    }
  }

  function shakeOffset() {
    if (shakeTime <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * 2 * shakeAmount,
      y: (Math.random() - 0.5) * 2 * shakeAmount,
    };
  }

  function clear() {
    particles.length = 0;
    texts.length = 0;
    debris.length = 0;
    shakeAmount = 0;
    shakeTime = 0;
  }

  return { particles, texts, debris, burst, floatText, shatter, shake, update, shakeOffset, clear };
}
