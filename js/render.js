import { TABLE, KICK, LOCAL_VERTS, worldVerts, readKickDrag } from "./physics.js";

function tablePath(ctx) {
  ctx.beginPath();
  ctx.roundRect(TABLE.x, TABLE.y, TABLE.w, TABLE.h, TABLE.r);
}

function paintFormica(ctx, x, y, w, h) {
  const base = ctx.createLinearGradient(x, y, x, y + h);
  base.addColorStop(0, "#f3ead4");
  base.addColorStop(0.45, "#ead9b6");
  base.addColorStop(1, "#e0cba6");
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < 2600; i++) {
    const px = x + ((i * 131 + 17) % w);
    const py = y + ((i * 79 + 29) % h);
    const tone = i % 5;
    ctx.fillStyle =
      tone === 0
        ? "rgba(255, 252, 245, 0.42)"
        : tone === 1
          ? "rgba(150, 128, 92, 0.2)"
          : tone === 2
            ? "rgba(78, 64, 44, 0.1)"
            : "rgba(214, 196, 158, 0.22)";
    ctx.fillRect(px, py, tone === 2 ? 1.4 : 1, 1);
  }

  const sheen = ctx.createLinearGradient(x, y, x + w, y + h);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.2)");
  sheen.addColorStop(0.38, "rgba(255, 255, 255, 0)");
  sheen.addColorStop(1, "rgba(92, 72, 40, 0.05)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
}

function yardMarks(ctx) {
  ctx.save();
  ctx.strokeStyle = "rgba(42, 36, 28, 0.28)";
  ctx.fillStyle = "rgba(42, 36, 28, 0.45)";
  ctx.lineWidth = 1;
  ctx.font = "700 12px 'Barlow Condensed', sans-serif";
  ctx.textAlign = "center";
  for (let i = 0; i <= 10; i++) {
    const x = TABLE.x + (TABLE.w * i) / 10;
    ctx.beginPath();
    ctx.moveTo(x, TABLE.y + 8);
    ctx.lineTo(x, TABLE.y + TABLE.h - 8);
    ctx.stroke();
    if (i > 0 && i < 10) {
      const yards = i <= 5 ? i * 10 : (10 - i) * 10;
      ctx.fillText(String(yards), x, TABLE.y + 24);
      ctx.fillText(String(yards), x, TABLE.y + TABLE.h - 12);
    }
  }
  ctx.restore();
}

function drawArrow(ctx, x, y, dir, size) {
  const halfH = size * 0.48;
  const head = size * 0.72;
  const shaft = size * 0.55;
  const halfShaft = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(x + dir * head, y);
  ctx.lineTo(x, y - halfH);
  ctx.lineTo(x, y - halfShaft);
  ctx.lineTo(x - dir * shaft, y - halfShaft);
  ctx.lineTo(x - dir * shaft, y + halfShaft);
  ctx.lineTo(x, y + halfShaft);
  ctx.lineTo(x, y + halfH);
  ctx.closePath();
  ctx.fill();
}

export function drawPlayDirection(ctx, attackSide) {
  const towardRight = attackSide === "right";
  const dir = towardRight ? 1 : -1;
  const endX = towardRight ? TABLE.x + TABLE.w : TABLE.x;
  const bandW = 70;

  ctx.save();
  tablePath(ctx);
  ctx.clip();
  const band = ctx.createLinearGradient(
    towardRight ? endX - bandW : endX + bandW,
    0,
    endX,
    0
  );
  band.addColorStop(0, "rgba(228, 192, 74, 0)");
  band.addColorStop(1, "rgba(212, 168, 48, 0.32)");
  ctx.fillStyle = band;
  ctx.fillRect(towardRight ? endX - bandW : endX, TABLE.y, bandW, TABLE.h);
  ctx.restore();

  const cy = TABLE.y + TABLE.h + 26;
  const cx = TABLE.x + TABLE.w / 2;
  ctx.save();
  ctx.fillStyle = "#e4c04a";
  for (let i = -1; i <= 1; i++) {
    drawArrow(ctx, cx + i * 32 * dir, cy, dir, 18);
  }
  ctx.restore();
}

export function drawTable(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  tablePath(ctx);
  ctx.fillStyle = "#ead9b6";
  ctx.fill();
  ctx.restore();

  ctx.save();
  tablePath(ctx);
  ctx.clip();
  paintFormica(ctx, TABLE.x, TABLE.y, TABLE.w, TABLE.h);
  yardMarks(ctx);
  ctx.restore();
}

function localTrianglePath(ctx) {
  ctx.moveTo(LOCAL_VERTS[0].x, LOCAL_VERTS[0].y);
  ctx.lineTo(LOCAL_VERTS[1].x, LOCAL_VERTS[1].y);
  ctx.lineTo(LOCAL_VERTS[2].x, LOCAL_VERTS[2].y);
  ctx.closePath();
}

export function drawFlickFx(ctx, fx, ball) {
  if (fx.burst && fx.burst.age < 0.26) {
    const t = fx.burst.age / 0.26;
    const fade = (1 - t) * (0.28 + fx.burst.power * 0.35);
    const ang = Math.atan2(fx.burst.vy, fx.burst.vx);
    ctx.save();
    ctx.translate(fx.burst.x, fx.burst.y);
    ctx.strokeStyle = `rgba(42, 36, 28, ${fade})`;
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 6 + t * 20, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      const a = ang + i * 0.2;
      const inner = 5 + t * 6;
      const outer = 16 + t * 18 + Math.abs(i) * 3;
      ctx.lineWidth = 2.4 - Math.abs(i) * 0.35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const ghost of fx.trails) {
    if (ghost.life <= 0) continue;
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(ghost.rot);
    ctx.globalAlpha = ghost.life * 0.22;
    ctx.beginPath();
    localTrianglePath(ctx);
    ctx.fillStyle = "#f4efe4";
    ctx.fill();
    ctx.restore();
  }

  if (ball.falling || ball.z > 8) return;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < 90) return;
  const ang = Math.atan2(ball.vy, ball.vx);
  const back = 14 + Math.min(48, speed * 0.035);
  ctx.save();
  ctx.strokeStyle = `rgba(42, 36, 28, ${Math.min(0.32, (speed - 90) / 1400)})`;
  ctx.lineCap = "round";
  ctx.lineWidth = 1.7;
  for (let i = -1; i <= 1; i++) {
    const ox = -Math.sin(ang) * i * 5;
    const oy = Math.cos(ang) * i * 5;
    ctx.beginPath();
    ctx.moveTo(ball.x - Math.cos(ang) * 10 + ox, ball.y - Math.sin(ang) * 10 + oy);
    ctx.lineTo(ball.x - Math.cos(ang) * back + ox, ball.y - Math.sin(ang) * back + oy);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFootball(ctx, ball) {
  const verts = worldVerts(ball);
  ctx.save();
  ctx.translate(0, ball.z * 0.35);

  const lift = Math.min(ball.z, 140) / 140;
  const ox = 1 + lift * 5;
  const oy = 1 + lift * 7;
  ctx.beginPath();
  ctx.moveTo(verts[0].x + ox, verts[0].y + oy);
  ctx.lineTo(verts[1].x + ox, verts[1].y + oy);
  ctx.lineTo(verts[2].x + ox, verts[2].y + oy);
  ctx.closePath();
  ctx.fillStyle = `rgba(30, 24, 16, ${0.16 * (1 - lift * 0.4)})`;
  ctx.fill();

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.rot);

  ctx.beginPath();
  localTrianglePath(ctx);
  ctx.fillStyle = "#f4efe4";
  ctx.strokeStyle = "#2a3140";
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  localTrianglePath(ctx);
  ctx.clip();
  ctx.strokeStyle = "rgba(47, 92, 160, 0.45)";
  ctx.lineWidth = 1;
  const minY = Math.min(...LOCAL_VERTS.map((v) => v.y));
  const maxY = Math.max(...LOCAL_VERTS.map((v) => v.y));
  const minX = Math.min(...LOCAL_VERTS.map((v) => v.x));
  const maxX = Math.max(...LOCAL_VERTS.map((v) => v.x));
  for (let y = minY + 3; y < maxY; y += 5) {
    ctx.beginPath();
    ctx.moveTo(minX - 2, y);
    ctx.lineTo(maxX + 2, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(176, 48, 48, 0.35)";
  ctx.beginPath();
  ctx.moveTo(minX + 5, minY - 2);
  ctx.lineTo(minX + 5, maxY + 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

export function drawAim(ctx, ball, pointer, charging) {
  if (!charging || !pointer) return;
  const dx = pointer.x - ball.x;
  const dy = pointer.y - ball.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const power = Math.min(1, len / 180);
  ctx.save();
  ctx.strokeStyle = `rgba(28, 36, 48, ${0.35 + power * 0.45})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(ball.x + dx, ball.y + dy);
  ctx.stroke();

  ctx.restore();
}

function kickCamera(W, H) {
  const L = 500;
  return {
    W,
    H,
    L,
    halfW: 175,
    thick: 20,
    radius: 14,
    camY: -0.25 * L,
    camZ: 0.35 * L,
    lookY: 0.25 * L,
    focal: 560,
  };
}

function projectWorld(cam, x, y, z) {
  const vy = y - cam.camY;
  const vz = z - cam.camZ;
  const lookVy = cam.lookY - cam.camY;
  const lookVz = -cam.camZ;
  const len = Math.hypot(lookVy, lookVz);
  const fy = lookVy / len;
  const fz = lookVz / len;
  const depth = Math.max(60, vy * fy + vz * fz);
  const up = vy * -fz + vz * fy;
  const scale = cam.focal / depth;
  return {
    sx: cam.W / 2 + x * scale,
    sy: cam.H * 0.51 - up * scale,
    depth,
    scale,
  };
}

function projectKick(W, H, distance, x, y, z) {
  const cam = kickCamera(W, H);
  const yVis = (y / Math.max(1, distance)) * cam.L;
  const zVis = z * 0.62;
  const p = projectWorld(cam, x, yVis, zVis);
  const ground = projectWorld(cam, x, yVis, 0);
  const near = projectWorld(cam, 0, 0, 8);
  return {
    sx: p.sx,
    sy: p.sy,
    persp: p.scale / near.scale,
    groundY: ground.sy,
  };
}

function roundedRectRing(halfW, length, r, segs = 16) {
  const rad = Math.min(r, halfW - 2, length / 2 - 2);
  const pts = [];
  const corners = [
    { cx: -halfW + rad, cy: rad, a0: Math.PI, a1: Math.PI * 1.5 },
    { cx: halfW - rad, cy: rad, a0: Math.PI * 1.5, a1: Math.PI * 2 },
    { cx: halfW - rad, cy: length - rad, a0: 0, a1: Math.PI * 0.5 },
    { cx: -halfW + rad, cy: length - rad, a0: Math.PI * 0.5, a1: Math.PI },
  ];
  for (const c of corners) {
    for (let i = 0; i < segs; i++) {
      const a = c.a0 + (c.a1 - c.a0) * (i / segs);
      pts.push({ x: c.cx + Math.cos(a) * rad, y: c.cy + Math.sin(a) * rad });
    }
  }
  return pts;
}

function sideFill(ax, ay, bx, by) {
  const ex = bx - ax;
  const ey = by - ay;
  const nlen = Math.hypot(ey, -ex) || 1;
  const ox = ey / nlen;
  const oy = -ex / nlen;
  const lit = Math.max(0, ox * 0.18 + oy * -0.72 + 0.32);
  const t = 0.22 + 0.78 * lit;
  const r = Math.round(90 + 110 * t);
  const g = Math.round(68 + 88 * t);
  const b = Math.round(28 + 42 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawKickTable(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const cam = kickCamera(W, H);
  const ring = roundedRectRing(cam.halfW, cam.L, cam.radius);
  const top = ring.map((p) => projectWorld(cam, p.x, p.y, 0));
  const bot = ring.map((p) => projectWorld(cam, p.x, p.y, -cam.thick));
  const n = ring.length;

  const walls = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    walls.push({
      i,
      j,
      depth: (top[i].depth + top[j].depth + bot[i].depth + bot[j].depth) / 4,
    });
  }
  walls.sort((a, b) => b.depth - a.depth);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 14;
  ctx.beginPath();
  ctx.moveTo(bot[0].sx, bot[0].sy);
  for (let i = 1; i < n; i++) ctx.lineTo(bot[i].sx, bot[i].sy);
  ctx.closePath();
  ctx.fillStyle = "#5a421c";
  ctx.fill();
  ctx.restore();

  for (const w of walls) {
    const a = ring[w.i];
    const b = ring[w.j];
    const mid = sideFill(a.x, a.y, b.x, b.y);
    const g = ctx.createLinearGradient(
      (top[w.i].sx + top[w.j].sx) / 2,
      (top[w.i].sy + top[w.j].sy) / 2,
      (bot[w.i].sx + bot[w.j].sx) / 2,
      (bot[w.i].sy + bot[w.j].sy) / 2
    );
    g.addColorStop(0, "#d8c08a");
    g.addColorStop(0.22, mid);
    g.addColorStop(1, "#6a4e22");
    ctx.beginPath();
    ctx.moveTo(top[w.i].sx, top[w.i].sy);
    ctx.lineTo(top[w.j].sx, top[w.j].sy);
    ctx.lineTo(bot[w.j].sx, bot[w.j].sy);
    ctx.lineTo(bot[w.i].sx, bot[w.i].sy);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(top[0].sx, top[0].sy);
  for (let i = 1; i < n; i++) ctx.lineTo(top[i].sx, top[i].sy);
  ctx.closePath();
  ctx.fillStyle = "#ead9b6";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 248, 230, 0.45)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.save();
  ctx.clip();
  const xs = top.map((p) => p.sx);
  const ys = top.map((p) => p.sy);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const topY = Math.min(...ys);
  const botY = Math.max(...ys);
  paintFormica(ctx, left, topY, right - left, botY - topY);
  ctx.restore();
}

function drawFinger(ctx, x0, y0, x1, y1, width, fill, stroke) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x1, y1, width * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFingerPosts(ctx, W, H, distance) {
  const leftBar = projectKick(W, H, distance, -KICK.postHalf, distance, KICK.crossbar);
  const rightBar = projectKick(W, H, distance, KICK.postHalf, distance, KICK.crossbar);
  const midBar = projectKick(W, H, distance, 0, distance, KICK.crossbar);
  const leftTop = projectKick(W, H, distance, -KICK.postHalf, distance, KICK.postTop);
  const rightTop = projectKick(W, H, distance, KICK.postHalf, distance, KICK.postTop);
  const leftFist = projectKick(W, H, distance, -KICK.postHalf - 6, distance, 0);
  const rightFist = projectKick(W, H, distance, KICK.postHalf + 6, distance, 0);
  const scale = midBar.persp;
  const skin = "#c48a62";
  const line = "#5c4030";
  const fist = 11 * scale + 7;
  const fingerW = 4.6 * scale + 2;

  ctx.fillStyle = skin;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(leftFist.sx, leftFist.sy + fist * 0.15, fist * 1.1, fist * 0.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(rightFist.sx, rightFist.sy + fist * 0.15, fist * 1.1, fist * 0.6, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawFinger(ctx, leftFist.sx, leftFist.sy, leftBar.sx, leftBar.sy, fingerW, skin, line);
  drawFinger(ctx, rightFist.sx, rightFist.sy, rightBar.sx, rightBar.sy, fingerW, skin, line);
  drawFinger(ctx, leftBar.sx, leftBar.sy, midBar.sx, midBar.sy, fingerW + 0.3, skin, line);
  drawFinger(ctx, rightBar.sx, rightBar.sy, midBar.sx, midBar.sy, fingerW + 0.3, skin, line);
  drawFinger(ctx, leftBar.sx, leftBar.sy, leftTop.sx, leftTop.sy, fingerW, skin, line);
  drawFinger(ctx, rightBar.sx, rightBar.sy, rightTop.sx, rightTop.sy, fingerW, skin, line);

  const leftSky = projectKick(W, H, distance, -KICK.postHalf, distance, KICK.postTop + 140);
  const rightSky = projectKick(W, H, distance, KICK.postHalf, distance, KICK.postTop + 140);
  ctx.save();
  ctx.strokeStyle = "rgba(228, 192, 74, 0.28)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(leftTop.sx, leftTop.sy);
  ctx.lineTo(leftSky.sx, leftSky.sy);
  ctx.moveTo(rightTop.sx, rightTop.sy);
  ctx.lineTo(rightSky.sx, rightSky.sy);
  ctx.stroke();
  ctx.restore();
}

function rightTrianglePath(ctx, s) {
  const L = s * 1.85;
  ctx.moveTo(-s * 0.35, s * 0.85);
  ctx.lineTo(-s * 0.35, s * 0.85 - L);
  ctx.lineTo(-s * 0.35 + L, s * 0.85 - L);
  ctx.closePath();
}

function paintKickFootball(ctx, s) {
  ctx.save();
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.lineWidth = 1;
  ctx.beginPath();
  rightTrianglePath(ctx, s);
  ctx.fillStyle = "#f4efe4";
  ctx.strokeStyle = "#2a3140";
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  rightTrianglePath(ctx, s);
  ctx.clip();
  ctx.strokeStyle = "rgba(47, 92, 160, 0.4)";
  ctx.lineWidth = 0.8;
  const top = -s * 1.05;
  const bot = s * 0.85;
  for (let y = top + 3; y < bot; y += 4.2) {
    ctx.beginPath();
    ctx.moveTo(-s * 1.2, y);
    ctx.lineTo(s * 1.6, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(176, 48, 48, 0.32)";
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, top);
  ctx.lineTo(-s * 0.08, bot);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

export function drawKickScene(ctx, W, H, kick, distance, drawBall = true) {
  drawKickTable(ctx, W, H);
  drawFingerPosts(ctx, W, H, distance);

  if (drawBall) {
    const p = projectKick(W, H, distance, kick.kx, kick.ky, kick.kz);
    const s = 16 * p.persp + 5;
    const lift = Math.min(1, kick.kz / 80);
    ctx.fillStyle = `rgba(30, 24, 16, ${0.16 + lift * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(p.sx + 1 + lift * 4, p.groundY + 1 + lift * 6, s * 0.7, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.rotate(kick.krot);
    paintKickFootball(ctx, s);
    ctx.restore();
  }
}

export function drawKickAim(ctx, W, H, pointer, origin) {
  if (!pointer) return;
  const dx = pointer.x - origin.x;
  const dy = pointer.y - origin.y;
  ctx.save();
  ctx.strokeStyle = "rgba(28, 36, 48, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(pointer.x, pointer.y);
  ctx.stroke();
  const { power, loft, aimX } = readKickDrag(dx, dy);
  ctx.setLineDash([]);
  ctx.font = "700 14px 'Barlow Condensed', sans-serif";
  ctx.fillStyle = "#e4c04a";
  const aim = Math.round(aimX * 100);
  const aimTxt = aim === 0 ? "center" : aim < 0 ? `${-aim} L` : `${aim} R`;
  ctx.fillText(`power ${Math.round(power * 100)}   loft ${Math.round(loft * 100)}   aim ${aimTxt}`, 24, 36);
  ctx.restore();
}

export function drawIdleKickBall(ctx, W, H, distance) {
  const p = projectKick(W, H, distance, 0, 12, 10);
  const s = 16 * p.persp + 5;
  ctx.fillStyle = "rgba(30, 24, 16, 0.16)";
  ctx.beginPath();
  ctx.ellipse(p.sx + 1, p.groundY + 6, s * 0.7, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.sx, p.sy);
  paintKickFootball(ctx, s);
  ctx.restore();
  return { x: p.sx, y: p.sy };
}
