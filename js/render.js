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

function drawChevron(ctx, x, y, dir, size) {
  ctx.beginPath();
  ctx.moveTo(x - dir * size * 0.45, y - size * 0.5);
  ctx.lineTo(x + dir * size * 0.55, y);
  ctx.lineTo(x - dir * size * 0.45, y + size * 0.5);
  ctx.stroke();
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
  ctx.strokeStyle = "#e4c04a";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = -1; i <= 1; i++) {
    drawChevron(ctx, cx + i * 26 * dir, cy, dir, 13);
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

function projectKick(W, H, distance, x, y, z) {
  const nearY = H - 70;
  const farY = 150;
  const t = Math.min(1.15, y / distance);
  const persp = 1 - Math.min(1, t) * 0.46;
  return {
    sx: W / 2 + x * persp,
    sy: nearY - Math.min(1, t) * (nearY - farY) - z * persp * 1.15,
    persp,
    groundY: nearY - Math.min(1, t) * (nearY - farY),
  };
}

function kickTablePath(ctx, W, H) {
  const nearL = 72;
  const nearR = W - 72;
  const nearY = H - 70;
  const farY = 150;
  const farL = W * 0.36;
  const farR = W * 0.64;
  const nr = 26;
  const fr = 10;
  ctx.beginPath();
  ctx.moveTo(nearL + nr, nearY);
  ctx.arcTo(nearR, nearY, farR, farY, nr);
  ctx.arcTo(farR, farY, farL, farY, fr);
  ctx.arcTo(farL, farY, nearL, nearY, fr);
  ctx.arcTo(nearL, nearY, nearR, nearY, nr);
  ctx.closePath();
  return { nearL, nearR, nearY, farY, farL, farR };
}

function drawKickTable(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  const t = kickTablePath(ctx, W, H);
  ctx.fillStyle = "#ead9b6";
  ctx.fill();
  ctx.restore();

  kickTablePath(ctx, W, H);
  ctx.save();
  ctx.clip();
  paintFormica(ctx, 0, t.farY, W, t.nearY - t.farY + 8);
  ctx.strokeStyle = "rgba(90, 74, 48, 0.16)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const u = i / 10;
    const x1 = t.nearL + (t.nearR - t.nearL) * u;
    const x2 = t.farL + (t.farR - t.farL) * u;
    ctx.beginPath();
    ctx.moveTo(x1, t.nearY);
    ctx.lineTo(x2, t.farY);
    ctx.stroke();
  }
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

export function drawIdleKickBall(ctx, W, H) {
  const x = W / 2;
  const y = H - 124;
  ctx.fillStyle = "rgba(30, 24, 16, 0.16)";
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 18, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  paintKickFootball(ctx, 18);
  ctx.restore();
  return { x, y };
}
