"use strict";

const select = (selector, scope = document) => scope.querySelector(selector);
const selectAll = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
const compactLayoutQuery = window.matchMedia("(max-width: 720px)");

function readStorage(storage, key, fallback = null) {
  try {
    return storage.getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (error) {
    // The interface remains fully usable when browser storage is unavailable.
  }
}

const interfaceToast = select("#interface-toast");
let toastTimer = null;

function showToast(message) {
  if (!interfaceToast) {
    return;
  }

  window.clearTimeout(toastTimer);
  interfaceToast.textContent = message;
  interfaceToast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    interfaceToast.classList.remove("is-visible");
  }, 2400);
}

/* ---------------------------------------------------------
   Short, skippable, once-per-session intro
   --------------------------------------------------------- */

const bootScreen = select("#boot-screen");
const bootLog = select("#boot-log");
const bootProgress = select("#boot-progress");
const bootProgressBar = select("#boot-progress-bar");
const bootSkip = select("#boot-skip");
const bootAnnouncement = select("#boot-announcement");

const bootLines = [
  "[ OK ] Identity signal found: ADAM",
  "[ OK ] Linking creative systems",
  "[ OK ] Mapping active build sectors",
  "[ OK ] Calibrating interface atmosphere",
  "[READY] Neon Sector-7 online"
];

let bootFinished = false;
let bootTimer = null;

function setPageInert(isInert) {
  [select("#site-header"), select("#main-content"), select(".site-footer")]
    .filter(Boolean)
    .forEach((element) => {
      element.inert = isInert;
    });
}

function finishBoot({ remember = true } = {}) {
  if (bootFinished || !bootScreen) {
    return;
  }

  bootFinished = true;
  window.clearTimeout(bootTimer);

  if (bootProgress && bootProgressBar) {
    bootProgress.setAttribute("aria-valuenow", "100");
    bootProgressBar.style.width = "100%";
  }

  if (bootAnnouncement) {
    bootAnnouncement.textContent = "Neon Sector-7 interface ready.";
  }

  if (remember) {
    writeStorage(sessionStorage, "ns7-intro-seen", "true");
  }

  document.body.classList.remove("booting");
  document.body.classList.add("interface-ready");
  setPageInert(false);
  bootScreen.classList.add("is-complete");

  window.setTimeout(() => {
    bootScreen.hidden = true;
  }, reduceMotionQuery.matches ? 0 : 620);
}

function runBootSequence() {
  if (!bootScreen || !bootLog || !bootProgress || !bootProgressBar) {
    return;
  }

  const introSeen = readStorage(sessionStorage, "ns7-intro-seen") === "true";

  if (reduceMotionQuery.matches || introSeen) {
    bootScreen.hidden = true;
    bootFinished = true;
    document.body.classList.add("interface-ready");
    return;
  }

  document.body.classList.add("booting");
  setPageInert(true);

  let currentLine = 0;

  function revealLine() {
    const line = bootLines[currentLine];
    bootLog.textContent += `${currentLine ? "\n" : ""}${line}`;
    currentLine += 1;

    const percentage = Math.round((currentLine / bootLines.length) * 100);
    bootProgress.setAttribute("aria-valuenow", String(percentage));
    bootProgressBar.style.width = `${percentage}%`;

    if (currentLine >= bootLines.length) {
      bootTimer = window.setTimeout(finishBoot, 300);
      return;
    }

    bootTimer = window.setTimeout(revealLine, 210);
  }

  bootTimer = window.setTimeout(revealLine, 180);
}

bootSkip?.addEventListener("click", () => finishBoot());

/* ---------------------------------------------------------
   Theme control
   --------------------------------------------------------- */

const themeSwitcher = select("#theme-switcher");
const themeMenu = select("#theme-menu");
const currentThemeLabel = select("#current-theme-label");
const themeOptions = selectAll("[data-theme-option]");
const themeColorMeta = select("#theme-color-meta");
const themes = ["sector", "solar", "ghost", "stellar"];
const themeLabels = {
  sector: "Sector Cyan",
  solar: "Solar Gold",
  ghost: "Ghost Mint",
  stellar: "Starry Night"
};
const themeColors = {
  sector: "#040711",
  solar: "#0b0809",
  ghost: "#040a0d",
  stellar: "#02040d"
};

function applyTheme(theme, announce = false, transitionOrigin = null) {
  const safeTheme = themes.includes(theme) ? theme : "sector";
  const themeChanged = document.documentElement.dataset.theme !== safeTheme;

  function updateTheme() {
    document.documentElement.dataset.theme = safeTheme;
    themeColorMeta?.setAttribute("content", themeColors[safeTheme]);
    themeSwitcher?.setAttribute(
      "aria-label",
      `Choose interface theme. ${themeLabels[safeTheme]} active.`
    );
    if (currentThemeLabel) {
      currentThemeLabel.textContent = themeLabels[safeTheme];
    }

    themeOptions.forEach((option) => {
      option.setAttribute("aria-checked", String(option.dataset.themeOption === safeTheme));
    });

    writeStorage(localStorage, "ns7-theme", safeTheme);

    if (announce && themeChanged) {
      showToast(`INTERFACE THEME // ${themeLabels[safeTheme].toUpperCase()}`);
    }
  }

  const canAnimateThemeChange = (
    announce &&
    themeChanged &&
    !reduceMotionQuery.matches &&
    typeof document.startViewTransition === "function"
  );

  if (canAnimateThemeChange) {
    const switcherBounds = themeSwitcher?.getBoundingClientRect();
    const switcherCenterX = switcherBounds
      ? switcherBounds.left + (switcherBounds.width / 2)
      : window.innerWidth / 2;
    const switcherCenterY = switcherBounds
      ? switcherBounds.top + (switcherBounds.height / 2)
      : 42;
    const originX = transitionOrigin?.x ?? switcherCenterX;
    const originY = transitionOrigin?.y ?? switcherCenterY;

    document.documentElement.style.setProperty("--theme-origin-x", `${originX}px`);
    document.documentElement.style.setProperty("--theme-origin-y", `${originY}px`);

    try {
      const transition = document.startViewTransition(updateTheme);
      transition.finished.catch(() => {
        // A canceled transition should never prevent the theme itself from changing.
      });
    } catch {
      updateTheme();
    }
  } else {
    updateTheme();
  }

  return safeTheme;
}

function cycleTheme() {
  const currentTheme = document.documentElement.dataset.theme || "sector";
  const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  applyTheme(nextTheme, true);
  return nextTheme;
}

function openThemeMenu({ focusActive = false } = {}) {
  if (!themeMenu || !themeSwitcher) {
    return;
  }

  themeMenu.hidden = false;
  themeSwitcher.setAttribute("aria-expanded", "true");

  if (focusActive) {
    const activeTheme = document.documentElement.dataset.theme || "sector";
    select(`[data-theme-option="${activeTheme}"]`, themeMenu)?.focus();
  }
}

function closeThemeMenu({ restoreFocus = false } = {}) {
  if (!themeMenu || !themeSwitcher) {
    return;
  }

  themeMenu.hidden = true;
  themeSwitcher.setAttribute("aria-expanded", "false");

  if (restoreFocus) {
    themeSwitcher.focus();
  }
}

themeSwitcher?.addEventListener("click", () => {
  const willOpen = themeSwitcher.getAttribute("aria-expanded") !== "true";

  if (willOpen) {
    openThemeMenu();
  } else {
    closeThemeMenu();
  }
});

themeSwitcher?.addEventListener("keydown", (event) => {
  if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
    event.preventDefault();
    openThemeMenu({ focusActive: true });
  }
});

themeOptions.forEach((option, index) => {
  option.addEventListener("click", () => {
    const optionBounds = option.getBoundingClientRect();
    const transitionOrigin = {
      x: optionBounds.left + (optionBounds.width / 2),
      y: optionBounds.top + (optionBounds.height / 2)
    };
    const mobileNavigationOpen = select("#nav-toggle")?.getAttribute("aria-expanded") === "true";
    closeThemeMenu({ restoreFocus: !mobileNavigationOpen });
    if (mobileNavigationOpen) {
      closeNavigation({ restoreFocus: true });
    }
    applyTheme(option.dataset.themeOption, true, transitionOrigin);
  });

  option.addEventListener("keydown", (event) => {
    let nextIndex = null;

    if (event.key === "ArrowDown") {
      nextIndex = (index + 1) % themeOptions.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = (index - 1 + themeOptions.length) % themeOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = themeOptions.length - 1;
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeThemeMenu({ restoreFocus: true });
      return;
    } else if (event.key === "Tab") {
      closeThemeMenu();
      return;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      themeOptions[nextIndex]?.focus();
    }
  });
});

document.addEventListener("click", (event) => {
  if (!themeMenu?.hidden && !event.target.closest(".theme-control")) {
    closeThemeMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && themeMenu && !themeMenu.hidden) {
    closeThemeMenu({ restoreFocus: true });
  }
});

applyTheme(document.documentElement.dataset.theme || "sector");

/* ---------------------------------------------------------
   Ambient particles and pointer lighting
   --------------------------------------------------------- */

const particlesContainer = select("#particles");
const stellarStarfield = select("#stellar-starfield");
const pointerAura = select("#pointer-aura");
const hero = select(".hero");

function createStarfield() {
  if (!stellarStarfield) {
    return;
  }

  const count = compactLayoutQuery.matches ? 38 : 76;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const star = document.createElement("span");
    const size = Math.random() * 2.2 + 0.65;

    star.className = "stellar-star";
    if (index % 13 === 0) {
      star.classList.add("is-gold");
    } else if (index % 9 === 0) {
      star.classList.add("is-blue");
    }

    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.opacity = String(Math.random() * 0.62 + 0.24);
    star.style.animationDelay = `${Math.random() * -8}s`;
    star.style.animationDuration = `${Math.random() * 5 + 3.5}s`;
    fragment.appendChild(star);
  }

  stellarStarfield.replaceChildren(fragment);
}

compactLayoutQuery.addEventListener?.("change", createStarfield);

function createParticles() {
  if (!particlesContainer || reduceMotionQuery.matches) {
    return;
  }

  particlesContainer.replaceChildren();
  const count = window.innerWidth < 720 ? 8 : 18;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    const size = Math.random() * 2 + 0.8;

    particle.className = "particle";
    particle.style.setProperty("--size", `${size}px`);
    particle.style.setProperty("--x", `${Math.random() * 100}%`);
    particle.style.setProperty("--y", `${Math.random() * 100}%`);
    particle.style.setProperty("--opacity", String(Math.random() * 0.45 + 0.12));
    particle.style.setProperty("--duration", `${Math.random() * 9 + 8}s`);
    particle.style.setProperty("--drift-x", `${Math.random() * 50 - 25}px`);
    particle.style.setProperty("--drift-y", `${Math.random() * 70 - 35}px`);
    fragment.appendChild(particle);
  }

  particlesContainer.appendChild(fragment);
}

function enablePointerLighting() {
  if (!pointerAura || !finePointerQuery.matches || reduceMotionQuery.matches) {
    return;
  }

  let frameRequested = false;
  let pointerX = -500;
  let pointerY = -500;

  function resetPointerWorld() {
    pointerAura.classList.remove("is-active");
    hero?.style.setProperty("--parallax-x", "0");
    hero?.style.setProperty("--parallax-y", "0");
    document.documentElement.style.setProperty("--stellar-x", "0px");
    document.documentElement.style.setProperty("--stellar-y", "0px");
    document.documentElement.style.setProperty("--stellar-far-x", "0px");
    document.documentElement.style.setProperty("--stellar-far-y", "0px");
  }

  function renderPointer() {
    pointerAura.style.setProperty("--pointer-x", `${pointerX}px`);
    pointerAura.style.setProperty("--pointer-y", `${pointerY}px`);

    const skyHorizontal = ((pointerX / window.innerWidth) - 0.5) * 10;
    const skyVertical = ((pointerY / window.innerHeight) - 0.5) * 7;
    document.documentElement.style.setProperty("--stellar-x", `${skyHorizontal.toFixed(2)}px`);
    document.documentElement.style.setProperty("--stellar-y", `${skyVertical.toFixed(2)}px`);
    document.documentElement.style.setProperty("--stellar-far-x", `${(-skyHorizontal * 0.4).toFixed(2)}px`);
    document.documentElement.style.setProperty("--stellar-far-y", `${(-skyVertical * 0.4).toFixed(2)}px`);

    if (hero) {
      const horizontal = ((pointerX / window.innerWidth) - 0.5) * 7;
      const vertical = ((pointerY / window.innerHeight) - 0.5) * 5;
      hero.style.setProperty("--parallax-x", horizontal.toFixed(2));
      hero.style.setProperty("--parallax-y", vertical.toFixed(2));
    }

    frameRequested = false;
  }

  window.addEventListener("pointermove", (event) => {
    if (reduceMotionQuery.matches || (event.pointerType && event.pointerType !== "mouse")) {
      return;
    }

    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerAura.classList.add("is-active");

    if (!frameRequested) {
      frameRequested = true;
      window.requestAnimationFrame(renderPointer);
    }
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", resetPointerWorld);
  window.addEventListener("blur", resetPointerWorld);
}

/* ---------------------------------------------------------
   Scroll progress, navigation, and reveal storytelling
   --------------------------------------------------------- */

const siteHeader = select("#site-header");
const progressBar = select("#page-progress-bar");
const navToggle = select("#nav-toggle");
const navPanel = select("#nav-panel");
const navLinks = selectAll("[data-nav-link]");
let scrollFrameRequested = false;

function updateScrollInterface() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));

  progressBar?.style.setProperty("--scroll-progress", String(progress));
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 18);
  scrollFrameRequested = false;
}

window.addEventListener("scroll", () => {
  if (!scrollFrameRequested) {
    scrollFrameRequested = true;
    window.requestAnimationFrame(updateScrollInterface);
  }
}, { passive: true });

function closeNavigation({ restoreFocus = false } = {}) {
  if (!navToggle || !navPanel) {
    return;
  }

  closeThemeMenu();
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open navigation");
  navPanel.classList.remove("is-open");
  siteHeader?.classList.remove("nav-is-open");

  if (restoreFocus) {
    navToggle.focus();
  }
}

navToggle?.addEventListener("click", () => {
  const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
  navToggle.setAttribute("aria-expanded", String(willOpen));
  navToggle.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
  navPanel?.classList.toggle("is-open", willOpen);
  siteHeader?.classList.toggle("nav-is-open", willOpen);
});

navLinks.forEach((link) => link.addEventListener("click", () => closeNavigation()));

document.addEventListener("click", (event) => {
  if (
    navPanel?.classList.contains("is-open") &&
    !siteHeader?.contains(event.target)
  ) {
    closeNavigation();
  }
});

const revealElements = selectAll(".reveal");

function initializeReveals() {
  document.documentElement.classList.add("reveal-ready");

  if (reduceMotionQuery.matches || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: "0px 0px -9%",
    threshold: 0.08
  });

  revealElements.forEach((element) => observer.observe(element));
}

function initializeActiveNavigation() {
  if (!("IntersectionObserver" in window)) {
    return;
  }

  const sections = ["work", "about", "lab", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

    if (!visible) {
      return;
    }

    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${visible.target.id}`;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }, {
    rootMargin: "-28% 0px -58%",
    threshold: [0.01, 0.15]
  });

  sections.forEach((section) => sectionObserver.observe(section));
}

/* ---------------------------------------------------------
   Live creator console
   --------------------------------------------------------- */

const localTime = select("#local-time");
const focusSignal = select("#focus-signal");
const focusSignals = [
  "Interactive worlds",
  "Game systems",
  "Local AI workflows",
  "Visual interfaces"
];

function updateLocalTime() {
  if (!localTime) {
    return;
  }

  localTime.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

function rotateFocusSignal() {
  if (!focusSignal || reduceMotionQuery.matches) {
    return;
  }

  let index = 0;
  window.setInterval(() => {
    index = (index + 1) % focusSignals.length;
    focusSignal.textContent = focusSignals[index];
  }, 3200);
}

/* ---------------------------------------------------------
   Restrained project-card depth
   --------------------------------------------------------- */

function initializeCardTilt() {
  if (!finePointerQuery.matches || reduceMotionQuery.matches) {
    return;
  }

  selectAll("[data-tilt]").forEach((card) => {
    let frameRequested = false;
    let latestEvent = null;

    function renderTilt() {
      const bounds = card.getBoundingClientRect();
      const x = (latestEvent.clientX - bounds.left) / bounds.width;
      const y = (latestEvent.clientY - bounds.top) / bounds.height;

      card.style.setProperty("--rx", `${((0.5 - y) * 3).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((x - 0.5) * 3).toFixed(2)}deg`);
      card.style.setProperty("--card-x", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--card-y", `${(y * 100).toFixed(1)}%`);
      frameRequested = false;
    }

    card.addEventListener("pointermove", (event) => {
      latestEvent = event;
      if (!frameRequested) {
        frameRequested = true;
        window.requestAnimationFrame(renderTilt);
      }
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--card-x", "50%");
      card.style.setProperty("--card-y", "50%");
    });
  });
}

/* ---------------------------------------------------------
   Command deck
   --------------------------------------------------------- */

const commandDialog = select("#command-dialog");
const commandTrigger = select("#command-trigger");
const commandClose = select("#close-command");
const commandSearch = select("#command-search-input");
const commandItems = selectAll("[data-command-keywords]");
const commandEmpty = select("#command-empty");
let commandReturnFocus = null;
let selectedCommandIndex = 0;

function syncDialogBodyState() {
  const anyDialogOpen = selectAll("dialog").some((dialog) => dialog.open);
  document.body.classList.toggle("dialog-open", anyDialogOpen);
}

function visibleCommandItems() {
  return commandItems.filter((item) => !item.hidden);
}

function selectCommand(index) {
  const visibleItems = visibleCommandItems();

  commandItems.forEach((item) => item.classList.remove("is-selected"));

  if (!visibleItems.length) {
    selectedCommandIndex = 0;
    return;
  }

  selectedCommandIndex = (index + visibleItems.length) % visibleItems.length;
  visibleItems[selectedCommandIndex].classList.add("is-selected");
  visibleItems[selectedCommandIndex].scrollIntoView({ block: "nearest" });
}

function filterCommands() {
  const query = commandSearch?.value.trim().toLowerCase() || "";

  commandItems.forEach((item) => {
    const searchable = `${item.dataset.commandKeywords} ${item.textContent}`.toLowerCase();
    item.hidden = Boolean(query) && !searchable.includes(query);
  });

  const visibleItems = visibleCommandItems();
  if (commandEmpty) {
    commandEmpty.hidden = visibleItems.length > 0;
  }
  selectCommand(0);
}

function openCommandDeck(trigger = document.activeElement) {
  if (!commandDialog || commandDialog.open || scanDialog?.open) {
    return;
  }

  closeNavigation();
  commandReturnFocus = trigger instanceof HTMLElement ? trigger : commandTrigger;
  commandDialog.showModal();
  syncDialogBodyState();

  if (commandSearch) {
    commandSearch.value = "";
    filterCommands();
    window.setTimeout(() => commandSearch.focus(), 0);
  }
}

function closeCommandDeck() {
  if (commandDialog?.open) {
    commandDialog.close();
  }
}

commandTrigger?.addEventListener("click", () => openCommandDeck(commandTrigger));
commandClose?.addEventListener("click", closeCommandDeck);
commandSearch?.addEventListener("input", filterCommands);

commandSearch?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectCommand(selectedCommandIndex + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectCommand(selectedCommandIndex - 1);
  } else if (event.key === "Enter") {
    const selected = visibleCommandItems()[selectedCommandIndex];
    if (selected) {
      event.preventDefault();
      selected.click();
    }
  }
});

commandDialog?.addEventListener("click", (event) => {
  if (event.target === commandDialog) {
    closeCommandDeck();
  }
});

commandDialog?.addEventListener("close", () => {
  syncDialogBodyState();
  commandReturnFocus?.focus();
});

commandItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    const targetSelector = item.dataset.commandTarget;

    if (targetSelector) {
      event.preventDefault();
      closeCommandDeck();
      window.setTimeout(() => {
        select(targetSelector)?.scrollIntoView({ behavior: reduceMotionQuery.matches ? "auto" : "smooth" });
      }, 20);
    } else if (item instanceof HTMLAnchorElement) {
      closeCommandDeck();
    }
  });
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (commandDialog?.open) {
      closeCommandDeck();
    } else {
      openCommandDeck();
    }
  }

  if (event.key === "Escape" && navPanel?.classList.contains("is-open")) {
    closeNavigation({ restoreFocus: true });
  }
});

/* ---------------------------------------------------------
   Interactive profile terminal
   --------------------------------------------------------- */

const terminalForm = select("#terminal-form");
const terminalInput = select("#terminal-input");
const terminalOutput = select("#terminal-output");

function appendTerminalLine(content, className = "") {
  if (!terminalOutput) {
    return null;
  }

  const line = document.createElement("div");
  line.className = `terminal-line ${className}`.trim();
  line.textContent = content;
  terminalOutput.appendChild(line);

  while (terminalOutput.children.length > 42) {
    terminalOutput.firstElementChild?.remove();
  }

  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  return line;
}

function executeTerminalCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();

  if (!command) {
    return;
  }

  appendTerminalLine(command, "command-line");

  const responses = {
    help: "Available commands: whoami · projects · stack · mission · status · theme · scan · github · clear",
    whoami: "Adam // creative developer exploring games, cinematic web experiences, Minecraft systems, and local AI.",
    projects: "Active files: Neon Sector-7 · 2D Game Challenge · Minecraft Engineering · Local AI Lab.",
    stack: "Creative web: HTML, CSS, JavaScript, Three.js // Systems: Java, Paper, databases // Lab: local models, Ollama, image workflows.",
    mission: "Turn ambitious ideas into complete experiences—systems that work and worlds people want to explore.",
    status: `All public systems online. Scanner high signal: ${readStorage(localStorage, "ns7-high-score", "000")}.`
  };

  if (responses[command]) {
    appendTerminalLine(responses[command]);
  } else if (command === "clear") {
    terminalOutput?.replaceChildren();
  } else if (command === "theme") {
    const nextTheme = cycleTheme();
    appendTerminalLine(`Interface shifted to ${themeLabels[nextTheme]}.`);
  } else if (command === "scan") {
    appendTerminalLine("Anomaly scanner initialized. Opening secure channel...");
    window.setTimeout(() => openScanner(terminalInput), 260);
  } else if (command === "github") {
    const line = appendTerminalLine("Source channel: ");
    const link = document.createElement("a");
    link.href = "https://github.com/doctordoomies";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "github.com/doctordoomies ↗";
    line?.appendChild(link);
  } else {
    appendTerminalLine(`Unknown command: ${command}. Type "help" for a signal list.`, "error-line");
  }
}

terminalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  executeTerminalCommand(terminalInput?.value || "");
  if (terminalInput) {
    terminalInput.value = "";
  }
});

selectAll("[data-terminal-command]").forEach((button) => {
  button.addEventListener("click", () => {
    executeTerminalCommand(button.dataset.terminalCommand || "");
    terminalInput?.focus();
  });
});

/* ---------------------------------------------------------
   Contact utilities
   --------------------------------------------------------- */

const copyUsernameButton = select("#copy-username");

async function copyGitHubHandle() {
  const handle = "@doctordoomies";

  try {
    await navigator.clipboard.writeText(handle);
    showToast(`COPIED TO CLIPBOARD // ${handle}`);
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = handle;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    textArea.remove();
    showToast(copied ? `COPIED TO CLIPBOARD // ${handle}` : `GITHUB HANDLE // ${handle}`);
  }
}

copyUsernameButton?.addEventListener("click", copyGitHubHandle);

const currentYear = select("#current-year");
if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

/* ---------------------------------------------------------
   Accessible, elapsed-time-based anomaly scanner
   --------------------------------------------------------- */

const scanDialog = select("#sector-scan-dialog");
const closeScanButton = select("#close-sector-scan");
const scanField = select("#scan-field");
const scanMessage = select("#scan-message");
const scoreDisplay = select("#scan-score");
const timeDisplay = select("#scan-time");
const highScoreDisplay = select("#scan-high-score");
const statusDisplay = select("#scan-status");
const scanAnnouncement = select("#scan-announcement");

let score = 0;
let streak = 0;
let highScore = Number.parseInt(readStorage(localStorage, "ns7-high-score", "0"), 10) || 0;
let gameRunning = false;
let gamePaused = false;
let endTime = 0;
let pausedAt = 0;
let timerFrame = null;
let spawnTimer = null;
let scanReturnFocus = null;
const anomalyTimers = new Map();
const effectTimers = new Set();

function paddedScore(value) {
  return String(value).padStart(3, "0");
}

function updateHighScoreDisplay() {
  if (highScoreDisplay) {
    highScoreDisplay.textContent = paddedScore(highScore);
  }
}

function setScanStartMessage() {
  if (!scanMessage) {
    return;
  }

  scanMessage.classList.remove("is-hidden");
  scanMessage.innerHTML = `
    <p class="scan-message-code">SYSTEM_READY</p>
    <h3>Scanner ready</h3>
    <p>Locate and neutralize unstable energy signals before time expires.</p>
    <button type="button" data-scan-start>Initialize scan</button>
  `;

  scoreDisplay.textContent = "000";
  timeDisplay.textContent = "20";
  statusDisplay.textContent = "Standby";
  updateHighScoreDisplay();
  scanField?.setAttribute("tabindex", "-1");
}

function openScanner(trigger = document.activeElement) {
  if (!scanDialog || scanDialog.open) {
    return;
  }

  if (commandDialog?.open) {
    closeCommandDeck();
  }

  scanReturnFocus = trigger instanceof HTMLElement ? trigger : select("[data-open-scan]");
  updateHighScoreDisplay();
  scanDialog.showModal();
  syncDialogBodyState();
  window.setTimeout(() => select("[data-scan-start]", scanMessage)?.focus(), 0);
}

function closeScanner() {
  if (scanDialog?.open) {
    scanDialog.close();
  }
}

function clearAnomalyTimer(anomaly) {
  const timer = anomalyTimers.get(anomaly);
  if (timer) {
    window.clearTimeout(timer);
    anomalyTimers.delete(anomaly);
  }
}

function removeAnomalies() {
  anomalyTimers.forEach((timer) => window.clearTimeout(timer));
  anomalyTimers.clear();
  selectAll(".scan-anomaly, .scan-hit", scanField).forEach((element) => element.remove());
}

function clearGameTimers() {
  window.cancelAnimationFrame(timerFrame);
  window.clearTimeout(spawnTimer);
  timerFrame = null;
  spawnTimer = null;

  effectTimers.forEach((timer) => window.clearTimeout(timer));
  effectTimers.clear();
}

function stopGame({ resetMessage = false } = {}) {
  gameRunning = false;
  gamePaused = false;
  clearGameTimers();
  removeAnomalies();

  if (resetMessage) {
    setScanStartMessage();
  }
}

function createHitText(x, y, points) {
  if (!scanField) {
    return;
  }

  const hitText = document.createElement("span");
  hitText.className = "scan-hit";
  hitText.textContent = `+${points}`;
  hitText.style.left = `${x}px`;
  hitText.style.top = `${y}px`;
  scanField.appendChild(hitText);

  const timer = window.setTimeout(() => {
    hitText.remove();
    effectTimers.delete(timer);
  }, 700);

  effectTimers.add(timer);
}

function neutralizeAnomaly(anomaly) {
  if (!gameRunning || gamePaused || !anomaly?.isConnected) {
    return;
  }

  clearAnomalyTimer(anomaly);
  streak += 1;
  const bonus = Math.floor(streak / 5) * 25;
  const points = 100 + bonus;
  score += points;

  scoreDisplay.textContent = paddedScore(score);
  statusDisplay.textContent = streak >= 5 ? `Combo x${streak}` : "Scanning";

  const x = Number.parseFloat(anomaly.style.left) || 0;
  const y = Number.parseFloat(anomaly.style.top) || 0;
  createHitText(x, y, points);
  anomaly.remove();
}

function createAnomaly() {
  if (!gameRunning || gamePaused || !scanField) {
    return;
  }

  const existing = selectAll(".scan-anomaly", scanField);
  if (existing.length >= 4) {
    const oldest = existing[0];
    clearAnomalyTimer(oldest);
    oldest.remove();
    streak = 0;
  }

  const anomaly = document.createElement("button");
  anomaly.type = "button";
  anomaly.className = "scan-anomaly";
  anomaly.tabIndex = -1;
  anomaly.setAttribute("aria-label", "Unstable energy signal");

  const fieldWidth = scanField.clientWidth;
  const fieldHeight = scanField.clientHeight;
  const targetSize = 46;
  const padding = fieldWidth < 430 ? 25 : 44;
  const maximumX = Math.max(padding, fieldWidth - targetSize - padding);
  const maximumY = Math.max(padding, fieldHeight - targetSize - padding);
  const x = padding + Math.random() * Math.max(0, maximumX - padding);
  const y = padding + Math.random() * Math.max(0, maximumY - padding);

  anomaly.style.left = `${x}px`;
  anomaly.style.top = `${y}px`;
  anomaly.addEventListener("click", () => neutralizeAnomaly(anomaly));
  scanField.appendChild(anomaly);

  const elapsed = Math.max(0, 20000 - (endTime - performance.now()));
  const lifetime = Math.max(720, 1450 - elapsed * 0.022) + Math.random() * 300;
  const timer = window.setTimeout(() => {
    anomalyTimers.delete(anomaly);
    if (anomaly.isConnected) {
      anomaly.remove();
      streak = 0;
      if (gameRunning) {
        statusDisplay.textContent = "Signal missed";
      }
    }
  }, lifetime);

  anomalyTimers.set(anomaly, timer);
}

function scheduleAnomaly() {
  if (!gameRunning || gamePaused) {
    return;
  }

  const elapsed = Math.max(0, 20000 - (endTime - performance.now()));
  const delay = Math.max(380, 760 - elapsed * 0.018);

  spawnTimer = window.setTimeout(() => {
    createAnomaly();
    scheduleAnomaly();
  }, delay);
}

function finishGame() {
  if (!gameRunning) {
    return;
  }

  gameRunning = false;
  clearGameTimers();
  removeAnomalies();

  const previousHighScore = highScore;
  highScore = Math.max(highScore, score);
  writeStorage(localStorage, "ns7-high-score", String(highScore));
  updateHighScoreDisplay();
  statusDisplay.textContent = "Complete";
  scanField?.setAttribute("tabindex", "-1");

  let rank = "SIGNAL TRAINEE";
  let result = "Scanner calibration will improve with another run.";

  if (score >= 2200) {
    rank = "SECTOR COMMANDER";
    result = "Exceptional response speed detected.";
  } else if (score >= 1500) {
    rank = "ELITE OPERATOR";
    result = "Strong anomaly suppression performance.";
  } else if (score >= 800) {
    rank = "FIELD AGENT";
    result = "Sector stability successfully improved.";
  }

  scanMessage.innerHTML = `
    <p class="scan-message-code">SCAN_COMPLETE</p>
    <h3>${rank}</h3>
    <p>Final score: <strong>${score}</strong><br>${result}</p>
    <button type="button" data-scan-start>Scan again</button>
  `;
  scanMessage.classList.remove("is-hidden");

  if (scanAnnouncement) {
    scanAnnouncement.textContent = `Scan complete. ${rank}. Final score ${score}.`;
  }

  if (score > previousHighScore) {
    showToast(`NEW HIGH SIGNAL // ${paddedScore(score)}`);
  }

  window.setTimeout(() => select("[data-scan-start]", scanMessage)?.focus(), 0);
}

function updateGameClock(now) {
  if (!gameRunning) {
    return;
  }

  if (gamePaused) {
    timerFrame = window.requestAnimationFrame(updateGameClock);
    return;
  }

  const millisecondsRemaining = Math.max(0, endTime - now);
  const secondsRemaining = Math.ceil(millisecondsRemaining / 1000);
  timeDisplay.textContent = String(secondsRemaining).padStart(2, "0");

  if (millisecondsRemaining <= 0) {
    finishGame();
    return;
  }

  timerFrame = window.requestAnimationFrame(updateGameClock);
}

function startGame() {
  stopGame();
  score = 0;
  streak = 0;
  gameRunning = true;
  gamePaused = false;
  endTime = performance.now() + 20000;

  scoreDisplay.textContent = "000";
  timeDisplay.textContent = "20";
  statusDisplay.textContent = "Scanning";
  scanAnnouncement.textContent = "Scan started. Twenty seconds remaining.";
  scanMessage.classList.add("is-hidden");
  scanField.setAttribute("tabindex", "0");
  scanField.focus();

  createAnomaly();
  scheduleAnomaly();
  timerFrame = window.requestAnimationFrame(updateGameClock);
}

selectAll("[data-open-scan]").forEach((button) => {
  button.addEventListener("click", () => openScanner(button));
});

select("[data-command-scan]")?.addEventListener("click", (event) => {
  event.preventDefault();
  closeCommandDeck();
  window.setTimeout(() => openScanner(commandTrigger), 40);
});

scanMessage?.addEventListener("click", (event) => {
  if (event.target.closest("[data-scan-start]")) {
    startGame();
  }
});

closeScanButton?.addEventListener("click", closeScanner);

scanDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeScanner();
});

scanDialog?.addEventListener("click", (event) => {
  if (event.target === scanDialog) {
    closeScanner();
  }
});

scanDialog?.addEventListener("close", () => {
  stopGame({ resetMessage: true });
  syncDialogBodyState();
  scanReturnFocus?.focus();
});

scanField?.addEventListener("keydown", (event) => {
  if (gameRunning && (event.key === " " || event.code === "Space")) {
    event.preventDefault();
    const currentAnomaly = select(".scan-anomaly", scanField);

    if (currentAnomaly) {
      neutralizeAnomaly(currentAnomaly);
    } else {
      statusDisplay.textContent = "Searching";
    }
  }
});

document.addEventListener("visibilitychange", () => {
  document.documentElement.classList.toggle("page-hidden", document.hidden);

  if (!gameRunning) {
    return;
  }

  if (document.hidden && !gamePaused) {
    gamePaused = true;
    pausedAt = performance.now();
    window.clearTimeout(spawnTimer);
    spawnTimer = null;
    removeAnomalies();
    statusDisplay.textContent = "Paused";
  } else if (!document.hidden && gamePaused) {
    endTime += performance.now() - pausedAt;
    gamePaused = false;
    statusDisplay.textContent = "Scanning";
    createAnomaly();
    scheduleAnomaly();
  }
});

/* ---------------------------------------------------------
   Initialize the interface
   --------------------------------------------------------- */

runBootSequence();
createStarfield();
createParticles();
enablePointerLighting();
initializeReveals();
initializeActiveNavigation();
initializeCardTilt();
updateScrollInterface();
updateLocalTime();
rotateFocusSignal();
updateHighScoreDisplay();
window.setInterval(updateLocalTime, 1000);

reduceMotionQuery.addEventListener?.("change", (event) => {
  if (event.matches) {
    particlesContainer?.replaceChildren();
    pointerAura?.classList.remove("is-active");
    hero?.style.setProperty("--parallax-x", "0");
    hero?.style.setProperty("--parallax-y", "0");
    document.documentElement.style.setProperty("--stellar-x", "0px");
    document.documentElement.style.setProperty("--stellar-y", "0px");
    document.documentElement.style.setProperty("--stellar-far-x", "0px");
    document.documentElement.style.setProperty("--stellar-far-y", "0px");
    revealElements.forEach((element) => element.classList.add("is-visible"));
    finishBoot();
  } else {
    createParticles();
  }
});
