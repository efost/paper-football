/** Table length in world units. A cafeteria table is ~5–6 ft; the triangle is ~1.75 in. */
export const TABLE = { x: 70, y: 90, w: 960, h: 400 };

/** Leg length of the folded 45-45-90 football, in world units. */
const LEG = 34;

/**
 * Right isosceles triangle (the folded-paper shape): 90° at the first
 * vertex, 45° tips on the other two. Centroid at the origin; an acute
 * tip points +x so a left-edge snap aims downfield.
 */
export const LOCAL_VERTS = [
  { x: -LEG / 3, y: -LEG / 3 },
  { x: (2 * LEG) / 3, y: -LEG / 3 },
  { x: -LEG / 3, y: (2 * LEG) / 3 },
];

export const SLIDE = {
  friction: 780,
  spinDrag: 3.4,
  maxSpeed: 1480,
  maxSpin: 16,
  stopSpeed: 12,
};

export const KICK = {
  gravity: 980,
  drag: 0.18,
  postHalf: 68,
  crossbar: 86,
  postTop: 200,
  postThick: 8,
};

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function worldVerts(ball) {
  const c = Math.cos(ball.rot);
  const s = Math.sin(ball.rot);
  return LOCAL_VERTS.map((v) => ({
    x: ball.x + v.x * c - v.y * s,
    y: ball.y + v.x * s + v.y * c,
  }));
}

export function pointInTable(x, y, inset = 0) {
  return (
    x >= TABLE.x + inset &&
    x <= TABLE.x + TABLE.w - inset &&
    y >= TABLE.y + inset &&
    y <= TABLE.y + TABLE.h - inset
  );
}

export function overhangsEnd(verts, side) {
  const edge = side === "right" ? TABLE.x + TABLE.w : TABLE.x;
  return verts.some((v) => (side === "right" ? v.x > edge : v.x < edge));
}

function jitter(scale) {
  return (Math.random() + Math.random() + Math.random() - 1.5) * scale;
}

export function createBall(x, y, rot = 0) {
  return {
    x,
    y,
    rot,
    vx: 0,
    vy: 0,
    omega: 0,
    z: 0,
    vz: 0,
    falling: false,
    fallSide: null,
    friction: SLIDE.friction,
  };
}

export function placeAtEdge(ball, side) {
  const inset = 28;
  ball.x = side === "left" ? TABLE.x + inset : TABLE.x + TABLE.w - inset;
  ball.y = TABLE.y + TABLE.h / 2 + jitter(16);
  ball.rot = (side === "left" ? 0 : Math.PI) + jitter(0.28);
  ball.vx = 0;
  ball.vy = 0;
  ball.omega = 0;
  ball.z = 0;
  ball.vz = 0;
  ball.falling = false;
  ball.fallSide = null;
  ball.friction = SLIDE.friction;
}

/**
 * Flick impulse. Contact is never perfectly repeatable: the thumb
 * glances, the laminate grit changes, and the triangle's lie matters.
 */
export function applyFlick(ball, dirX, dirY, power, offset = 0) {
  const len = Math.hypot(dirX, dirY) || 1;
  const angle = Math.atan2(dirY, dirX) + jitter(0.055);
  const speed = clamp(power * (1 + jitter(0.07)), 0, 1) * SLIDE.maxSpeed;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.omega = clamp(offset, -1, 1) * SLIDE.maxSpin + jitter(2.4);
  ball.friction = SLIDE.friction * (1 + jitter(0.1));
  ball.falling = false;
  ball.z = 0;
}

function localFriction(ball) {
  const grit = Math.sin(ball.x * 0.041) * Math.cos(ball.y * 0.057);
  return (ball.friction || SLIDE.friction) * (1 + grit * 0.06);
}

export function stepSlide(ball, dt) {
  if (ball.falling) {
    stepFall(ball, dt);
    return "falling";
  }

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 0) {
    const next = Math.max(0, speed - localFriction(ball) * dt);
    const k = next / speed;
    ball.vx *= k;
    ball.vy *= k;
    const drift = ball.omega * 18 * dt;
    const px = -ball.vy / speed;
    const py = ball.vx / speed;
    ball.vx += px * drift;
    ball.vy += py * drift;
  }
  ball.omega *= Math.exp(-SLIDE.spinDrag * dt);

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.rot += ball.omega * dt;

  if (!pointInTable(ball.x, ball.y)) {
    beginFall(ball);
    return "falling";
  }

  if (Math.hypot(ball.vx, ball.vy) <= SLIDE.stopSpeed && Math.abs(ball.omega) < 0.35) {
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    return "rest";
  }
  return "sliding";
}

function beginFall(ball) {
  ball.falling = true;
  const left = TABLE.x;
  const right = TABLE.x + TABLE.w;
  const top = TABLE.y;
  const bot = TABLE.y + TABLE.h;
  if (ball.x > right) ball.fallSide = "right";
  else if (ball.x < left) ball.fallSide = "left";
  else if (ball.y < top) ball.fallSide = "top";
  else ball.fallSide = "bottom";
}

function stepFall(ball, dt) {
  ball.vz += 2200 * dt;
  ball.z += ball.vz * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.rot += ball.omega * dt;
  ball.omega += (ball.fallSide === "top" || ball.fallSide === "bottom" ? 8 : 5) * dt;
}

export function restResult(ball, attackSide) {
  const verts = worldVerts(ball);
  const goal = attackSide === "right" ? "right" : "left";
  if (overhangsEnd(verts, goal) && pointInTable(ball.x, ball.y)) {
    return "touchdown";
  }
  return "dead";
}

export function fallenOffTable(ball) {
  return ball.falling && ball.z > 160;
}

/** Drag length = power. Drag direction = loft (up) and aim (left/right). */
export function readKickDrag(dx, dy) {
  const dist = Math.hypot(dx, dy);
  const power = clamp(dist / 210, 0.12, 1);
  const loft = dist < 8 ? 0.35 : clamp(-dy / dist, 0, 1);
  const aimX = dist < 8 ? 0 : clamp(dx / dist, -1, 1);
  return { power, loft, aimX };
}

export function launchKick(state, aimX, loft, power) {
  const speed = lerp(420, 1180, clamp(power, 0, 1));
  const pitch = lerp(0.28, 1.12, clamp(loft, 0, 1));
  state.kx = 0;
  state.ky = 0;
  state.kz = 8;
  state.kvx = clamp(aimX, -1, 1) * 260;
  state.kvy = Math.cos(pitch) * speed;
  state.kvz = Math.sin(pitch) * speed;
  state.krot = 0;
  state.kspin = 7 + power * 6;
  state.passed = false;
  state.hitPost = false;
  state.result = null;
}

export function stepKick(state, dt, distance) {
  if (state.result) return state.result;

  state.kvx *= 1 - KICK.drag * dt;
  state.kvy *= 1 - KICK.drag * dt;
  state.kvz -= KICK.gravity * dt;
  state.kx += state.kvx * dt;
  state.ky += state.kvy * dt;
  state.kz += state.kvz * dt;
  state.krot += state.kspin * dt;

  if (state.kz <= 0 && state.ky < distance - 4) {
    state.kz = 0;
    state.result = "wide";
    return state.result;
  }

  if (!state.passed && state.ky >= distance) {
    state.passed = true;
    const x = state.kx;
    const z = state.kz;
    const half = KICK.postHalf;
    const t = KICK.postThick;

    const hitLeft = Math.abs(x + half) < t && z >= 0 && z <= KICK.postTop;
    const hitRight = Math.abs(x - half) < t && z >= 0 && z <= KICK.postTop;
    const hitBar = Math.abs(z - KICK.crossbar) < t && Math.abs(x) <= half + t;

    if (hitLeft || hitRight) {
      state.hitPost = true;
      state.kvx *= -0.55;
      state.kx += hitLeft ? t : -t;
    } else if (hitBar && state.kvz < 0) {
      state.kvz *= -0.45;
      state.kz = KICK.crossbar + t;
    }

    const between = Math.abs(state.kx) < half;
    const overBar = state.kz > KICK.crossbar;
    if (overBar && between) {
      state.result = "good";
      return state.result;
    }
    state.result = "wide";
  }

  if (state.kz < -40) state.result = state.result || "wide";
  return state.result;
}

export function kickDistanceFromBall(ball, attackSide) {
  const goalX = attackSide === "right" ? TABLE.x + TABLE.w : TABLE.x;
  const world = Math.abs(goalX - ball.x);
  return clamp(world * 0.72, 220, 720);
}
