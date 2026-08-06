"use strict";

const bootScreen = document.querySelector("#boot-screen");
const bootLog = document.querySelector("#boot-log");
const bootProgress = document.querySelector("#boot-progress-bar");
const particlesContainer = document.querySelector("#particles");

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const bootSequence = [
  "[ OK ] Connecting to Neon Sector-7 network...",
  "[ OK ] Loading developer identity...",
  "[ OK ] Initializing project directory...",
  "[ OK ] Synchronizing AI modules...",
  "[ OK ] Activating game-development systems...",
  "[ OK ] Establishing Three.js rendering pipeline...",
  "[READY] Portfolio interface online."
];

function finishBootSequence() {
  document.body.classList.add("interface-ready");
  bootScreen.classList.add("boot-complete");

  window.setTimeout(() => {
    bootScreen.setAttribute("aria-hidden", "true");
  }, 850);
}

function runBootSequence() {
  if (reduceMotion) {
    bootLog.textContent = bootSequence.join("\n");
    bootProgress.style.width = "100%";
    finishBootSequence();
    return;
  }

  let currentLine = 0;

  function addNextLine() {
    if (currentLine >= bootSequence.length) {
      window.setTimeout(finishBootSequence, 450);
      return;
    }

    const nextLine = bootSequence[currentLine];

    bootLog.textContent +=
      `${currentLine === 0 ? "" : "\n"}${nextLine}`;

    currentLine += 1;

    const percentage =
      (currentLine / bootSequence.length) * 100;

    bootProgress.style.width = `${percentage}%`;

    window.setTimeout(
      addNextLine,
      currentLine === bootSequence.length ? 520 : 310
    );
  }

  addNextLine();
}

function createParticles() {
  if (!particlesContainer) {
    return;
  }

  const particleCount = reduceMotion ? 12 : 42;

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");

    const size = Math.random() * 2.5 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const opacity = Math.random() * 0.55 + 0.15;
    const duration = Math.random() * 7 + 5;
    const driftX = Math.random() * 50 - 25;
    const driftY = Math.random() * 70 - 35;

    particle.className = "particle";

    particle.style.setProperty("--size", `${size}px`);
    particle.style.setProperty("--x", `${x}%`);
    particle.style.setProperty("--y", `${y}%`);
    particle.style.setProperty("--opacity", opacity.toString());
    particle.style.setProperty("--duration", `${duration}s`);
    particle.style.setProperty("--drift-x", `${driftX}px`);
    particle.style.setProperty("--drift-y", `${driftY}px`);

    particlesContainer.appendChild(particle);
  }
}

function addPointerGlow() {
  if (reduceMotion) {
    return;
  }

  const background = document.querySelector(".site-background");

  if (!background) {
    return;
  }

  window.addEventListener("pointermove", (event) => {
    const x = event.clientX / window.innerWidth;
    const y = event.clientY / window.innerHeight;

    background.style.transform =
      `translate(${(x - 0.5) * -5}px, ${(y - 0.5) * -5}px)`;
  });
}

/* =========================================================
   NEON SECTOR SCAN MINI-GAME
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const openButton = document.getElementById("open-sector-scan");
  const closeButton = document.getElementById("close-sector-scan");
  const startButton = document.getElementById("start-sector-scan");

  const overlay = document.getElementById("sector-scan-overlay");
  const scanField = document.getElementById("scan-field");
  const scanMessage = document.getElementById("scan-message");

  const scoreDisplay = document.getElementById("scan-score");
  const timeDisplay = document.getElementById("scan-time");
  const statusDisplay = document.getElementById("scan-status");

  if (
    !openButton ||
    !closeButton ||
    !startButton ||
    !overlay ||
    !scanField ||
    !scanMessage
  ) {
    console.warn("Sector Scan elements were not found.");
    return;
  }

  let score = 0;
  let timeRemaining = 20;
  let gameRunning = false;

  let countdownInterval = null;
  let anomalyInterval = null;

  function openScanner() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("scan-game-open");
  }

  function closeScanner() {
    stopGame();

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("scan-game-open");

    showStartMessage();
  }

  function showStartMessage() {
    scanMessage.classList.remove("is-hidden");

    scanMessage.innerHTML = `
      <h3>SCANNER READY</h3>
      <p>Locate and neutralize unstable energy signals.</p>
      <button id="start-sector-scan" type="button">
        INITIALIZE SCAN
      </button>
    `;

    const newStartButton = document.getElementById("start-sector-scan");

    newStartButton.addEventListener("click", startGame);

    scoreDisplay.textContent = "000";
    timeDisplay.textContent = "20";
    statusDisplay.textContent = "STANDBY";
  }

  function startGame() {
    stopGame();

    score = 0;
    timeRemaining = 20;
    gameRunning = true;

    scoreDisplay.textContent = "000";
    timeDisplay.textContent = String(timeRemaining);
    statusDisplay.textContent = "SCANNING";

    scanMessage.classList.add("is-hidden");

    createAnomaly();

    anomalyInterval = window.setInterval(() => {
      createAnomaly();
    }, 760);

    countdownInterval = window.setInterval(() => {
      timeRemaining -= 1;
      timeDisplay.textContent = String(timeRemaining).padStart(2, "0");

      if (timeRemaining <= 0) {
        finishGame();
      }
    }, 1000);
  }

  function createAnomaly() {
    if (!gameRunning) {
      return;
    }

    const anomaly = document.createElement("button");

    anomaly.type = "button";
    anomaly.className = "scan-anomaly";
    anomaly.setAttribute("aria-label", "Energy anomaly");

    const fieldWidth = scanField.clientWidth;
    const fieldHeight = scanField.clientHeight;

    const safePadding = 55;

    const maximumX = Math.max(
      safePadding,
      fieldWidth - safePadding - 34
    );

    const maximumY = Math.max(
      safePadding,
      fieldHeight - safePadding - 34
    );

    const x =
      safePadding +
      Math.random() * (maximumX - safePadding);

    const y =
      safePadding +
      Math.random() * (maximumY - safePadding);

    anomaly.style.left = `${x}px`;
    anomaly.style.top = `${y}px`;

    anomaly.addEventListener("click", () => {
      if (!gameRunning) {
        return;
      }

      score += 100;
      scoreDisplay.textContent = String(score).padStart(3, "0");

      createHitText(x, y);
      anomaly.remove();
    });

    scanField.appendChild(anomaly);

    const lifetime = 900 + Math.random() * 700;

    window.setTimeout(() => {
      anomaly.remove();
    }, lifetime);
  }

  function createHitText(x, y) {
    const hitText = document.createElement("span");

    hitText.className = "scan-hit";
    hitText.textContent = "+100";

    hitText.style.left = `${x}px`;
    hitText.style.top = `${y}px`;

    scanField.appendChild(hitText);

    window.setTimeout(() => {
      hitText.remove();
    }, 700);
  }

  function finishGame() {
    gameRunning = false;

    clearTimers();
    removeAnomalies();

    statusDisplay.textContent = "COMPLETE";

    let rank = "SIGNAL TRAINEE";
    let message = "Scanner calibration requires improvement.";

    if (score >= 1800) {
      rank = "SECTOR COMMANDER";
      message = "Exceptional response speed detected.";
    } else if (score >= 1200) {
      rank = "ELITE OPERATOR";
      message = "Strong anomaly suppression performance.";
    } else if (score >= 700) {
      rank = "FIELD AGENT";
      message = "Sector stability successfully improved.";
    }

    scanMessage.innerHTML = `
      <h3>${rank}</h3>
      <p>
        Final score: <strong>${score}</strong><br>
        ${message}
      </p>
      <button id="restart-sector-scan" type="button">
        SCAN AGAIN
      </button>
    `;

    scanMessage.classList.remove("is-hidden");

    const restartButton = document.getElementById(
      "restart-sector-scan"
    );

    restartButton.addEventListener("click", startGame);
  }

  function clearTimers() {
    window.clearInterval(countdownInterval);
    window.clearInterval(anomalyInterval);

    countdownInterval = null;
    anomalyInterval = null;
  }

  function removeAnomalies() {
    scanField
      .querySelectorAll(".scan-anomaly, .scan-hit")
      .forEach((element) => element.remove());
  }

  function stopGame() {
    gameRunning = false;
    clearTimers();
    removeAnomalies();
  }

  openButton.addEventListener("click", openScanner);
  closeButton.addEventListener("click", closeScanner);
  startButton.addEventListener("click", startGame);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeScanner();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) {
      closeScanner();
    }
  });
});

createParticles();
addPointerGlow();
runBootSequence();
