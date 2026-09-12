import { TABLE, SLIDE, applyFlick, kickDistanceFromBall, clamp } from "./physics.js";

function gauss(scale) {
  return (Math.random() + Math.random() + Math.random() - 1.5) * scale;
}

export function chooseFieldAction(ball, attackSide, down) {
  const goalX = attackSide === "right" ? TABLE.x + TABLE.w : TABLE.x;
  const dist = Math.abs(goalX - ball.x);
  const far = dist > TABLE.w * 0.42;
  if (down === 4 && far) return "fieldgoal";
  return "flick";
}

/**
 * Do not solve for a one-flick hang from midfield or the own edge.
 * Advance a portion of the remaining table, then try to finish when close.
 */
export function planFlick(ball, attackSide, down = 1) {
  const goalX = attackSide === "right" ? TABLE.x + TABLE.w : TABLE.x;
  const dist = Math.abs(goalX - ball.x);
  const dir = attackSide === "right" ? 1 : -1;
  const close = dist < TABLE.w * 0.26;
  const goForHang = close || down === 4 || (down === 3 && dist < TABLE.w * 0.38);

  let travel;
  if (goForHang) {
    const leftover = 20 + Math.random() * 22;
    travel = Math.max(36, dist - leftover);
  } else {
    const chunk = 0.32 + Math.random() * 0.28;
    travel = dist * chunk;
  }

  const speed = Math.sqrt(Math.max(80, 2 * SLIDE.friction * travel));
  const power = clamp(speed / SLIDE.maxSpeed + gauss(0.11), 0.18, 0.96);
  const dx = dir * 120 + gauss(26);
  const dy = TABLE.y + TABLE.h / 2 - ball.y + gauss(32);
  return { dx, dy, power, offset: gauss(0.35) };
}

export function performFlick(ball, attackSide, down = 1) {
  const plan = planFlick(ball, attackSide, down);
  applyFlick(ball, plan.dx, plan.dy, plan.power, plan.offset);
  return plan;
}

export function planKick(ball, attackSide) {
  const distance = kickDistanceFromBall(ball, attackSide);
  const err = distance / 900;
  return {
    aimX: gauss(0.22 + err * 0.35),
    loft: 0.42 + gauss(0.1),
    power: 0.52 + (distance - 280) / 1400 + gauss(0.06),
  };
}
