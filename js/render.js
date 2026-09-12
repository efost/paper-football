import { TABLE, KICK, LOCAL_VERTS, worldVerts, readKickDrag } from "./physics.js";

function laminate(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#d7bc86");
  g.addColorStop(0.45, "#c9a86c");
  g.addColorStop(1, "#b48d52");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.fillStyle = "rgba(90, 68, 36, 0.16)";
  for (let i = 0; i < 220; i++) {
    const px = x + ((i * 47 + 13) % w);
    const py = y + ((i * 31 + 9) % h);
    ctx.fillRect(px, py, 2 + (i % 3), 1 + (i % 2));
  }
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#6a4e28";
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(x + ((i * 97) % w), y + ((i * 53) % h), 22 + (i % 7), 1);
  }
  ctx.globalAlpha = 0.07;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.72, y + h * 0.3, 36, 24, 0.4, 0, Math.PI * 2);
  ctx.strokeStyle = "#7a5a32";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
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

export function drawTable(ctx, W, H) {
  ctx.fillStyle = "#07140c";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#3a2a1c";
  ctx.fillRect(TABLE.x - 20, TABLE.y - 16, TABLE.w + 40, TABLE.h + 32);
  ctx.fillStyle = "#241810";
  ctx.fillRect(TABLE.x - 20, TABLE.y + TABLE.h + 8, TABLE.w + 40, 8);

  laminate(ctx, TABLE.x, TABLE.y, TABLE.w, TABLE.h);

  yardMarks(ctx);

  ctx.strokeStyle = "rgba(20, 16, 12, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(TABLE.x + 1, TABLE.y + 1, TABLE.w - 2, TABLE.h - 2);

  const light = ctx.createRadialGradient(W * 0.5, 40, 40, W * 0.5, H * 0.4, 520);
  light.addColorStop(0, "rgba(255, 244, 214, 0.16)");
  light.addColorStop(1, "rgba(0, 0, 0, 0.22)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);
}

function localTrianglePath(ctx) {
  ctx.moveTo(LOCAL_VERTS[0].x, LOCAL_VERTS[0].y);
  ctx.lineTo(LOCAL_VERTS[1].x, LOCAL_VERTS[1].y);
  ctx.lineTo(LOCAL_VERTS[2].x, LOCAL_VERTS[2].y);
  ctx.closePath();
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
  ctx.beginPath();
  ctx.moveTo(nearL, nearY);
  ctx.lineTo(nearR, nearY);
  ctx.lineTo(farR, farY);
  ctx.lineTo(farL, farY);
  ctx.closePath();
  return { nearL, nearR, nearY, farY, farL, farR };
}

function drawKickTable(ctx, W, H) {
  ctx.fillStyle = "#07140c";
  ctx.fillRect(0, 0, W, H);

  const t = kickTablePath(ctx, W, H);
  ctx.fillStyle = "#2b2118";
  ctx.save();
  ctx.translate(0, 7);
  ctx.fill();
  ctx.restore();

  kickTablePath(ctx, W, H);
  const g = ctx.createLinearGradient(0, t.farY, 0, t.nearY);
  g.addColorStop(0, "#b08950");
  g.addColorStop(0.55, "#c4a36a");
  g.addColorStop(1, "#d2b27a");
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(42, 36, 28, 0.22)";
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

  kickTablePath(ctx, W, H);
  ctx.strokeStyle = "#2b2118";
  ctx.lineWidth = 3;
  ctx.stroke();

  const light = ctx.createRadialGradient(W * 0.5, 30, 20, W * 0.5, H * 0.45, 520);
  light.addColorStop(0, "rgba(255, 244, 214, 0.14)");
  light.addColorStop(1, "rgba(0, 0, 0, 0.28)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);
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
  ctx.strokeStyle = "rgba(243, 234, 215, 0.55)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
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
