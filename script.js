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

createParticles();
addPointerGlow();
runBootSequence();
