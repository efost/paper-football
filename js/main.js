import { Game } from "./game.js?v=fx1";

const canvas = document.getElementById("game");
const hint = document.getElementById("hint");
const playCall = document.getElementById("play-call");
const fgBtn = document.getElementById("fg-btn");
const scoreboard = document.getElementById("scoreboard");
const homeName = document.getElementById("home-name");
const awayName = document.getElementById("away-name");
const homeSide = document.getElementById("home-side");
const awaySide = document.getElementById("away-side");
const homeScore = document.getElementById("home-score");
const awayScore = document.getElementById("away-score");
const clockEl = document.getElementById("clock");
const metaLabel = document.getElementById("meta-label");
const periodEl = document.getElementById("period");
const menuOverlay = document.getElementById("menu-overlay");
const coinOverlay = document.getElementById("coin-overlay");
const rulesOverlay = document.getElementById("rules-overlay");
const endOverlay = document.getElementById("end-overlay");
const coin = document.getElementById("coin");
const coinEdge = document.getElementById("coin-edge");
const coinStage = coin.closest(".coin-stage");
const coinResult = document.getElementById("coin-result");

const coinSlices = 16;
for (let i = 0; i < coinSlices; i++) {
  const slice = document.createElement("span");
  const z = -7 + (i * 14) / (coinSlices - 1);
  slice.style.transform = `translateZ(${z}px)`;
  slice.style.background = i % 2 ? "#c9a43a" : "#8a6d1e";
  coinEdge.appendChild(slice);
}
const soundBtn = document.getElementById("sound-btn");
const rulesBtn = document.getElementById("rules-btn");
const menuBtn = document.getElementById("menu-btn");
const soundRadios = document.querySelectorAll('#setup-form input[name="sound"]');

function setSetupChrome(isSetup) {
  menuBtn.hidden = isSetup;
  rulesBtn.hidden = isSetup;
  soundBtn.hidden = isSetup;
  scoreboard.hidden = isSetup;
}

function setSoundEnabled(on) {
  game.audio.setEnabled(on);
  soundBtn.setAttribute("aria-pressed", String(on));
  soundBtn.textContent = on ? "Sound on" : "Sound off";
  soundRadios.forEach((radio) => {
    radio.checked = radio.value === (on ? "on" : "off");
  });
}

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
    coinStage.classList.remove("is-tossing");
    coin.style.transform = "";
    coin.dataset.busy = "";
    document.querySelectorAll("[data-call]").forEach((b) => {
      b.disabled = false;
    });
    setSetupChrome(false);
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
    if (game.length === "timed") {
      metaLabel.textContent = "Clock";
      clockEl.textContent = formatClock(game.clock);
    } else {
      metaLabel.textContent = "First to";
      clockEl.textContent = game.length === "21" ? "21" : String(game.length);
    }
    periodEl.textContent = game.downLabel();
    homeSide.classList.toggle("has-ball", game.possession === 0);
    awaySide.classList.toggle("has-ball", game.possession === 1);
    setSetupChrome(game.phase === "menu");

    const humanAim = game.phase === "aim" && game.isHumanTurn();
    const humanKick = game.phase === "kickaim" && game.isHumanTurn();
    this.setFg(humanAim && game.down === 4);

    const toward = game.possession === 0 ? "toward the right edge" : "toward the left edge";
    if (game.phase === "menu") hint.textContent = "";
    else if (humanAim) hint.textContent = `Pull back from the ball to flick ${toward}. Hang it over the far end for a touchdown.`;
    else if (humanKick) hint.textContent = "Pull back from the ball for power. A steeper pull for loft. Left or right to aim. Over the bar and between the posts is good.";
    else if (game.phase === "slide") hint.textContent = "";
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
  setSoundEnabled(data.get("sound") === "on");
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
    coinStage.classList.remove("is-tossing");
    void coin.offsetWidth;
    coin.classList.add(face === "tails" ? "is-flipping-tails" : "is-flipping-heads");
    coinStage.classList.add("is-tossing");

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
  setSetupChrome(true);
  game.resetMenu();
});
menuBtn.addEventListener("click", () => {
  menuOverlay.hidden = false;
  coinOverlay.hidden = true;
  endOverlay.hidden = true;
  game.resetMenu();
  setSetupChrome(true);
  ui.call("");
  ui.setFg(false);
});

soundBtn.addEventListener("click", () => {
  setSoundEnabled(soundBtn.getAttribute("aria-pressed") !== "true");
});
soundRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) setSoundEnabled(radio.value === "on");
  });
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
