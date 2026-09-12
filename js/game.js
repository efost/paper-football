import {
  TABLE,
  createBall,
  placeAtEdge,
  applyFlick,
  stepSlide,
  restResult,
  fallenOffTable,
  launchKick,
  stepKick,
  kickDistanceFromBall,
  readKickDrag,
  clamp,
} from "./physics.js";
import { chooseFieldAction, performFlick, planKick } from "./ai.js";
import { TableAudio } from "./audio.js";
import {
  drawTable,
  drawPlayDirection,
  drawFlickFx,
  drawFootball,
  drawAim,
  drawKickScene,
  drawKickAim,
  drawIdleKickBall,
} from "./render.js?v=fx19";

const ANNOUNCE_MS = 1100;
const VIEW_W = 1100;
const VIEW_H = 620;

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.audio = new TableAudio();
    this.pointer = null;
    this.chargeStart = null;
    this.charging = false;
    this.kickOrigin = { x: 550, y: 500 };
    this.announceUntil = 0;
    this.aiWait = 0;
    this.slideHum = 0;
    this.fx = { trails: [], burst: null };
    this.resetMenu();
  }

  resetMenu() {
    this.phase = "menu";
    this.mode = "cpu";
    this.length = "21";
    this.scores = [0, 0];
    this.possession = 0;
    this.down = 1;
    this.clock = 300;
    this.clockOn = false;
    this.ball = createBall(TABLE.x + 40, TABLE.y + TABLE.h / 2);
    this.kick = null;
    this.kickKind = null;
    this.kickDistance = 420;
    this.sudden = [null, null];
    this.suddenKicker = 0;
    this.winner = null;
  }

  startMatch(mode, length) {
    this.mode = mode;
    this.length = length;
    this.scores = [0, 0];
    this.down = 1;
    this.clock = 300;
    this.clockOn = false;
    this.winner = null;
    this.phase = "coin";
    this.ui.showCoin();
    this.ui.sync(this);
  }

  resolveCoin(call) {
    const face = Math.random() < 0.5 ? "heads" : "tails";
    const won = call === face;
    this.possession = won ? 0 : 1;
    this.placePossession(this.possession);
    return { face, won };
  }

  beginPlay() {
    this.phase = "aim";
    this.clockOn = this.length === "timed";
    this.announce(this.possession === 0 ? "Your ball" : this.mode === "cpu" ? "CPU ball" : "Player 2 ball");
    this.maybeQueueAi();
    this.ui.sync(this);
  }

  placePossession(player, atBall = false) {
    this.possession = player;
    this.down = 1;
    if (!atBall) {
      placeAtEdge(this.ball, player === 0 ? "left" : "right");
    } else {
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.omega = 0;
      this.ball.falling = false;
      this.ball.z = 0;
    }
    this.fx.trails = [];
    this.fx.burst = null;
  }

  attackSide() {
    return this.possession === 0 ? "right" : "left";
  }

  names() {
    return {
      home: "You",
      away: this.mode === "cpu" ? "CPU" : "P2",
    };
  }

  isHumanTurn() {
    return this.mode === "hotseat" || this.possession === 0;
  }

  announce(text) {
    this.ui.call(text);
    this.announceUntil = performance.now() + ANNOUNCE_MS;
  }

  maybeQueueAi() {
    if (this.isHumanTurn()) {
      this.aiWait = 0;
      return;
    }
    this.aiWait = 700 + Math.random() * 500;
  }

  downLabel() {
    if (this.phase === "kickaim" || this.phase === "kickfly") {
      return this.kickKind === "xp" ? "PAT" : this.kickKind === "sudden" ? "OT FG" : "FG";
    }
    const nth = ["", "1st", "2nd", "3rd", "4th"][this.down] || `${this.down}th`;
    return `${nth} down`;
  }

  syncHiDpi() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const bw = Math.round(VIEW_W * dpr);
    const bh = Math.round(VIEW_H * dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  pointerFromEvent(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (VIEW_W / r.width),
      y: (e.clientY - r.top) * (VIEW_H / r.height),
    };
  }

  onPointerDown(e) {
    this.audio.unlock();
    if (!this.isHumanTurn()) return;
    const p = this.pointerFromEvent(e);
    this.pointer = p;
    this.chargeStart = p;
    if (this.phase === "aim" || this.phase === "kickaim") {
      this.charging = true;
    }
  }

  onPointerMove(e) {
    this.pointer = this.pointerFromEvent(e);
  }

  onPointerUp() {
    if (!this.charging) {
      this.pointer = null;
      this.chargeStart = null;
      return;
    }
    if (this.phase === "aim") this.releaseFlick();
    else if (this.phase === "kickaim") this.releaseKick();
    this.charging = false;
    this.pointer = null;
    this.chargeStart = null;
  }

  draggedCharge() {
    if (!this.pointer || !this.chargeStart) return false;
    return Math.hypot(this.pointer.x - this.chargeStart.x, this.pointer.y - this.chargeStart.y) >= 16;
  }

  releaseFlick() {
    if (!this.pointer || !this.draggedCharge()) return;
    const dx = this.pointer.x - this.ball.x;
    const dy = this.pointer.y - this.ball.y;
    const len = Math.hypot(dx, dy);
    if (len < 8) return;
    const power = clamp(len / 180, 0, 1);
    const offset = clamp(-dy / 140, -1, 1) * (this.attackSide() === "right" ? 1 : -1);
    applyFlick(this.ball, -dx, -dy, power, offset * 0.35);
    this.beginSlide(power);
  }

  beginSlide(power) {
    this.fx.burst = {
      x: this.ball.x,
      y: this.ball.y,
      vx: this.ball.vx,
      vy: this.ball.vy,
      power,
      age: 0,
    };
    this.fx.trails = [];
    this.audio.flick(power);
    this.phase = "slide";
    this.ui.setFg(false);
  }

  startKick(kind) {
    this.kickKind = kind;
    this.kick = { kx: 0, ky: 0, kz: 8, kvx: 0, kvy: 0, kvz: 0, krot: 0, kspin: 0, passed: false, hitPost: false, result: null };
    this.kickDistance = kind === "xp" || kind === "sudden" ? 380 : kickDistanceFromBall(this.ball, this.attackSide());
    this.phase = "kickaim";
    this.charging = false;
    this.pointer = null;
    this.chargeStart = null;
    this.ui.setFg(false);
    this.maybeQueueAi();
    this.ui.sync(this);
  }

  releaseKick() {
    if (!this.pointer || !this.draggedCharge()) return;
    const o = this.kickOrigin;
    const dx = this.pointer.x - o.x;
    const dy = this.pointer.y - o.y;
    const { power, loft, aimX } = readKickDrag(dx, dy);
    launchKick(this.kick, aimX, loft, power);
    this.audio.flick(power);
    this.phase = "kickfly";
  }

  tryFieldGoal() {
    if (this.phase !== "aim" || this.down !== 4 || !this.isHumanTurn()) return;
    this.startKick("fg");
  }

  turnover(reason, atBall = false) {
    const next = 1 - this.possession;
    this.placePossession(next, atBall);
    this.phase = "aim";
    this.announce(reason);
    this.maybeQueueAi();
    this.ui.sync(this);
  }

  afterScore() {
    if (this.checkWinner()) return;
    this.placePossession(1 - this.possession, false);
    this.phase = "aim";
    this.maybeQueueAi();
    this.ui.sync(this);
  }

  checkWinner() {
    if (this.length === "21") {
      if (this.scores[0] >= 21 || this.scores[1] >= 21) {
        this.endGame(this.scores[0] === this.scores[1] ? null : this.scores[0] > this.scores[1] ? 0 : 1);
        return true;
      }
    }
    return false;
  }

  endGame(winner) {
    this.clockOn = false;
    if (winner === null && this.length === "timed") {
      this.phase = "sudden";
      this.sudden = [null, null];
      this.suddenKicker = 0;
      this.possession = 0;
      this.announce("Overtime kicks");
      this.startKick("sudden");
      return;
    }
    this.winner = winner;
    this.phase = "gameover";
    this.audio.whistle();
    this.ui.showEnd(this);
  }

  resolveKickResult(result) {
    if (this.kickKind === "sudden") {
      this.sudden[this.suddenKicker] = result === "good";
      if (result === "good") this.audio.good();
      else this.audio.miss();
      this.announce(result === "good" ? "It's good" : "No good");

      if (this.suddenKicker === 0) {
        this.suddenKicker = 1;
        this.possession = 1;
        setTimeout(() => this.startKick("sudden"), ANNOUNCE_MS);
        return;
      }

      const a = this.sudden[0];
      const b = this.sudden[1];
      if (a && !b) {
        this.winner = 0;
        this.phase = "gameover";
        this.ui.showEnd(this);
        return;
      }
      if (!a && b) {
        this.winner = 1;
        this.phase = "gameover";
        this.ui.showEnd(this);
        return;
      }
      this.sudden = [null, null];
      this.suddenKicker = 0;
      this.possession = 0;
      setTimeout(() => this.startKick("sudden"), ANNOUNCE_MS);
      return;
    }

    if (result === "good") {
      this.audio.good();
      const pts = this.kickKind === "xp" ? 1 : 3;
      this.scores[this.possession] += pts;
      this.announce(this.kickKind === "xp" ? "The extra point is good" : "Field goal is good");
    } else {
      this.audio.miss();
      this.announce(this.kickKind === "xp" ? "No good" : "Field goal no good");
    }

    setTimeout(() => {
      if (this.checkWinner()) return;
      this.afterScore();
    }, ANNOUNCE_MS);
  }

  finishSlide() {
    this.phase = "resolve";
    if (this.ball.falling || fallenOffTable(this.ball)) {
      this.audio.fall();
      this.turnover("Off the table");
      return;
    }
    const result = restResult(this.ball, this.attackSide());
    if (result === "touchdown") {
      this.audio.score();
      this.scores[this.possession] += 6;
      this.announce("Touchdown");
      this.ui.sync(this);
      setTimeout(() => this.startKick("xp"), ANNOUNCE_MS);
      return;
    }
    if (this.down >= 4) {
      this.turnover("Turnover on downs", true);
      return;
    }
    this.down += 1;
    this.phase = "aim";
    this.announce(`${this.downLabel()}`);
    this.maybeQueueAi();
    this.ui.sync(this);
  }

  update(dt, now) {
    if (this.announceUntil && now > this.announceUntil && this.phase !== "gameover") {
      this.ui.call("");
      this.announceUntil = 0;
    }

    if (this.clockOn && (this.phase === "aim" || this.phase === "slide" || this.phase === "kickaim" || this.phase === "kickfly")) {
      this.clock = Math.max(0, this.clock - dt);
      if (this.clock <= 0) {
        this.clockOn = false;
        if (this.scores[0] === this.scores[1]) this.endGame(null);
        else this.endGame(this.scores[0] > this.scores[1] ? 0 : 1);
        return;
      }
    }

    if (this.aiWait > 0) {
      this.aiWait -= dt * 1000;
      if (this.aiWait <= 0) this.runAi();
    }

    this.stepFlickFx(dt);

    if (this.phase === "slide") {
      const st = stepSlide(this.ball, dt);
      this.slideHum += dt;
      if (this.slideHum > 0.08) {
        this.audio.slide(Math.hypot(this.ball.vx, this.ball.vy));
        this.slideHum = 0;
      }
      if (st === "rest" || fallenOffTable(this.ball)) this.finishSlide();
    }

    if (this.phase === "kickfly") {
      const res = stepKick(this.kick, dt, this.kickDistance);
      if (res) {
        this.phase = "kickdone";
        this.resolveKickResult(res);
      }
    }

    this.ui.sync(this);
  }

  runAi() {
    if (this.isHumanTurn()) return;
    if (this.phase === "aim") {
      const action = chooseFieldAction(this.ball, this.attackSide(), this.down);
      if (action === "fieldgoal") {
        this.startKick("fg");
        return;
      }
      const plan = performFlick(this.ball, this.attackSide(), this.down);
      this.beginSlide(plan.power);
      return;
    }
    if (this.phase === "kickaim") {
      const plan = planKick(this.ball, this.attackSide());
      launchKick(this.kick, plan.aimX, plan.loft, clamp(plan.power, 0.2, 1));
      this.audio.flick(plan.power);
      this.phase = "kickfly";
    }
  }

  draw() {
    this.syncHiDpi();
    const { ctx } = this;
    const W = VIEW_W;
    const H = VIEW_H;
    ctx.clearRect(0, 0, W, H);

    if (this.phase === "kickaim" || this.phase === "kickfly" || this.phase === "kickdone") {
      if (this.phase === "kickaim") {
        drawKickScene(ctx, W, H, { kx: 0, ky: 0, kz: 8, krot: 0 }, this.kickDistance, false);
        this.kickOrigin = drawIdleKickBall(ctx, W, H, this.kickDistance);
        if (this.charging) drawKickAim(ctx, W, H, this.pointer, this.kickOrigin);
      } else {
        drawKickScene(ctx, W, H, this.kick, this.kickDistance);
      }
      return;
    }

    drawTable(ctx, W, H);
    drawPlayDirection(ctx, this.attackSide());
    drawFlickFx(ctx, this.fx, this.ball);
    drawFootball(ctx, this.ball);
    if (this.phase === "aim" && this.charging) drawAim(ctx, this.ball, this.pointer, true);
  }

  stepFlickFx(dt) {
    if (this.fx.burst) {
      this.fx.burst.age += dt;
      if (this.fx.burst.age > 0.28) this.fx.burst = null;
    }
    if (this.ball.falling) {
      this.fx.trails = [];
    } else if (this.phase === "slide") {
      const speed = Math.hypot(this.ball.vx, this.ball.vy);
      if (speed > 80) {
        this.fx.trails.push({ x: this.ball.x, y: this.ball.y, rot: this.ball.rot, life: 1 });
        if (this.fx.trails.length > 8) this.fx.trails.shift();
      }
    }
    for (const ghost of this.fx.trails) ghost.life -= dt * 5;
    this.fx.trails = this.fx.trails.filter((ghost) => ghost.life > 0);
  }
}
