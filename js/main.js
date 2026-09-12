import { Game } from "./game.js";

const canvas = document.getElementById("game");
const hint = document.getElementById("hint");
const playCall = document.getElementById("play-call");
const fgBtn = document.getElementById("fg-btn");
const scoreboard = document.getElementById("scoreboard");
const homeName = document.getElementById("home-name");
const awayName = document.getElementById("away-name");
const homeScore = document.getElementById("home-score");
const awayScore = document.getElementById("away-score");
const clockEl = document.getElementById("clock");
const periodEl = document.getElementById("period");
const menuOverlay = document.getElementById("menu-overlay");
const coinOverlay = document.getElementById("coin-overlay");
const rulesOverlay = document.getElementById("rules-overlay");
const endOverlay = document.getElementById("end-overlay");
const coin = document.getElementById("coin");
const coinResult = document.getElementById("coin-result");
const soundBtn = document.getElementById("sound-btn");
const menuBtn = document.getElementById("menu-btn");

function formatClock(sec) {
  const s = Math.ceil(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const ui = {
  showCoin() {
    menuOverlay.hidden = true;
    endOverlay.hidden = true;
    coinOverlay.hidden = false;
    coinResult.textContent = "";
    coin.classList.remove("is-flipping-heads", "is-flipping-tails");
    coin.style.transform = "";
    coin.dataset.busy = "";
    document.querySelectorAll("[data-call]").forEach((b) => {
      b.disabled = false;
    });
    scoreboard.hidden = false;
    menuBtn.hidden = false;
  },
  call(text) {
    playCall.hidden = !text;
    playCall.textContent = text;
  },
  setFg(on) {
    fgBtn.hidden = !on;
  },
  sync(game) {
    const names = game.names();
    homeName.textContent = names.home;
    awayName.textContent = names.away;
    homeScore.textContent = String(game.scores[0]);
    awayScore.textContent = String(game.scores[1]);
    clockEl.textContent = game.length === "timed" ? formatClock(game.clock) : "21 PTS";
    periodEl.textContent = game.downLabel();

    const humanAim = game.phase === "aim" && game.isHumanTurn();
    const humanKick = game.phase === "kickaim" && game.isHumanTurn();
    this.setFg(humanAim && game.down === 4);

    const toward = game.possession === 0 ? "toward the right edge" : "toward the left edge";
    if (game.phase === "menu") hint.textContent = "";
    else if (humanAim) hint.textContent = `Drag ${toward} to flick. Hang it over the far end for a touchdown.`;
    else if (humanKick) hint.textContent = "Pull farther for power. A steeper angle for loft. Left or right to aim. Over the bar and between the posts is good."
    else if (game.phase === "slide") hint.textContent = "Let it ride.";
    else if (!game.isHumanTurn()) hint.textContent = "CPU is lining it up…";
    else hint.textContent = "";
  },
  showEnd(game) {
    endOverlay.hidden = false;
    const names = game.names();
    const title = document.getElementById("end-title");
    const eye = document.getElementById("end-eyebrow");
    const score = document.getElementById("end-score");
    eye.textContent = game.length === "timed" ? "Clock expired" : "Final";
    if (game.winner === 0) title.textContent = "You win";
    else if (game.winner === 1) title.textContent = names.away === "CPU" ? "CPU wins" : "Player 2 wins";
    else title.textContent = "Tie";
    score.textContent = `${names.home} ${game.scores[0]}  —  ${names.away} ${game.scores[1]}`;
  },
};

const game = new Game(canvas, ui);
globalThis.paperGame = game;

document.getElementById("setup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  game.startMatch(data.get("mode"), data.get("length"));
});

const COIN_FLIP_MS = 2200;
const COIN_HOLD_MS = 1400;

document.querySelectorAll("[data-call]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (coin.dataset.busy) return;
    coin.dataset.busy = "1";
    document.querySelectorAll("[data-call]").forEach((b) => {
      b.disabled = true;
    });
    await game.audio.unlock();

    const { face, won } = game.resolveCoin(btn.dataset.call);
    coin.classList.remove("is-flipping-heads", "is-flipping-tails");
    void coin.offsetWidth;
    coin.classList.add(face === "tails" ? "is-flipping-tails" : "is-flipping-heads");

    window.setTimeout(() => {
      coinResult.textContent = `${face.toUpperCase()}. ${won ? "You receive." : `${game.names().away} receives.`}`;
    }, COIN_FLIP_MS);

    window.setTimeout(() => {
      coinOverlay.hidden = true;
      game.beginPlay();
    }, COIN_FLIP_MS + COIN_HOLD_MS);
  });
});

function openRules() {
  rulesOverlay.hidden = false;
}
document.getElementById("rules-btn").addEventListener("click", openRules);
document.getElementById("menu-rules-btn").addEventListener("click", openRules);
document.getElementById("rules-close").addEventListener("click", () => {
  rulesOverlay.hidden = true;
});
document.getElementById("rematch-btn").addEventListener("click", () => {
  endOverlay.hidden = true;
  menuOverlay.hidden = false;
  scoreboard.hidden = true;
  menuBtn.hidden = true;
  game.resetMenu();
});
menuBtn.addEventListener("click", () => {
  menuOverlay.hidden = false;
  coinOverlay.hidden = true;
  endOverlay.hidden = true;
  game.resetMenu();
  scoreboard.hidden = true;
  menuBtn.hidden = true;
  ui.call("");
  ui.setFg(false);
});

soundBtn.addEventListener("click", () => {
  const on = soundBtn.getAttribute("aria-pressed") === "true";
  soundBtn.setAttribute("aria-pressed", String(!on));
  soundBtn.textContent = on ? "Sound off" : "Sound on";
  game.audio.setEnabled(!on);
});

fgBtn.addEventListener("click", () => game.tryFieldGoal());

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  game.onPointerDown(e);
});
canvas.addEventListener("pointermove", (e) => game.onPointerMove(e));
canvas.addEventListener("pointerup", () => game.onPointerUp());
canvas.addEventListener("pointercancel", () => game.onPointerUp());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (game.phase !== "menu" && game.phase !== "coin") game.update(dt, now);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
