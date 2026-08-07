"use strict";

const select = (selector, scope = document) => scope.querySelector(selector);
const selectAll = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
const compactLayoutQuery = window.matchMedia("(max-width: 720px)");

const sessionStore = (() => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
})();

const localStore = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();

function readStorage(storage, key, fallback = null) {
  try {
    return storage?.getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage?.setItem(key, value);
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
const bootStatus = select("#boot-status");
const bootLinkState = select("#boot-link-state");
const bootLinkCopy = select("#boot-link-copy");
const skipLink = select(".skip-link");

const bootSteps = [
  { line: "> locating orbital relay...", state: "SEARCHING DEEP-SPACE RELAY" },
  { line: "> orbital signal acquired", state: "SYNCHRONIZING ORBITAL SIGNAL" },
  { line: "> encryption tunnel established", state: "NEGOTIATING SECURE CHANNEL" },
  { line: "> operator identity confirmed: ADAM", state: "VERIFYING OPERATOR IDENTITY" },
  { line: "> atmospheric interface online", state: "INITIALIZING WORLD INTERFACE" },
  { line: "> SECTOR-7 CONNECTION STABLE", state: "CONNECTION ESTABLISHED" }
];

let bootFinished = false;
let bootTimer = null;

function setPageInert(isInert) {
  [skipLink, select("#site-header"), select("#main-content"), select(".site-footer"), select(".pulse-system")]
    .filter(Boolean)
    .forEach((element) => {
      element.inert = isInert;
    });
}

function finishBoot({ remember = true, restoreFocus = false } = {}) {
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
    bootAnnouncement.textContent = "Connection established. Neon Sector-7 interface ready.";
  }

  if (bootStatus) {
    bootStatus.textContent = "CONNECTION ESTABLISHED";
  }

  if (bootLinkCopy) {
    bootLinkCopy.textContent = "LINK STABLE";
  }

  if (remember) {
    writeStorage(sessionStore, "ns7-intro-seen", "true");
  }

  document.body.classList.remove("booting");
  document.body.classList.add("interface-ready");
  setPageInert(false);
  bootScreen.classList.add("is-complete");

  window.setTimeout(() => {
    bootScreen.hidden = true;
    if (restoreFocus || document.activeElement === bootSkip) {
      select("#main-content")?.focus({ preventScroll: true });
    }
  }, reduceMotionQuery.matches ? 0 : 620);
}

function runBootSequence() {
  if (!bootScreen || !bootLog || !bootProgress || !bootProgressBar) {
    finishBoot({ remember: false });
    return;
  }

  const introSeen = readStorage(sessionStore, "ns7-intro-seen") === "true";

  if (reduceMotionQuery.matches || introSeen) {
    bootScreen.hidden = true;
    bootFinished = true;
    document.body.classList.add("interface-ready");
    return;
  }

  document.body.classList.add("booting");
  setPageInert(true);
  window.setTimeout(() => bootSkip?.focus({ preventScroll: true }), 0);

  let currentLine = 0;

  function revealLine() {
    const step = bootSteps[currentLine];
    bootLog.textContent += `${currentLine ? "\n" : ""}${step.line}`;
    if (bootStatus) {
      bootStatus.textContent = step.state;
    }
    currentLine += 1;

    const percentage = Math.round((currentLine / bootSteps.length) * 100);
    bootProgress.setAttribute("aria-valuenow", String(percentage));
    bootProgressBar.style.width = `${percentage}%`;

    if (currentLine >= bootSteps.length) {
      bootTimer = window.setTimeout(finishBoot, 360);
      return;
    }

    bootTimer = window.setTimeout(revealLine, 195);
  }

  bootTimer = window.setTimeout(revealLine, 180);
}

bootSkip?.addEventListener("click", () => finishBoot({ restoreFocus: true }));

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

    writeStorage(localStore, "ns7-theme", safeTheme);

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
const coreStage = select("#core-stage");
let pointerLightingInitialized = false;
let pointerFrame = null;
let pointerActive = false;

function resetPointerWorld() {
  pointerActive = false;
  if (pointerFrame) {
    window.cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
  }
  pointerAura?.classList.remove("is-active");
  hero?.style.setProperty("--parallax-x", "0");
  hero?.style.setProperty("--parallax-y", "0");
  coreStage?.style.setProperty("--core-rx", "0deg");
  coreStage?.style.setProperty("--core-ry", "0deg");
  document.documentElement.style.setProperty("--stellar-x", "0px");
  document.documentElement.style.setProperty("--stellar-y", "0px");
  document.documentElement.style.setProperty("--stellar-far-x", "0px");
  document.documentElement.style.setProperty("--stellar-far-y", "0px");
}

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
  if (
    pointerLightingInitialized ||
    !pointerAura ||
    !finePointerQuery.matches ||
    reduceMotionQuery.matches
  ) {
    return;
  }

  pointerLightingInitialized = true;
  let pointerX = -500;
  let pointerY = -500;

  function renderPointer() {
    pointerFrame = null;
    if (!pointerActive || reduceMotionQuery.matches || !finePointerQuery.matches) {
      return;
    }

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
      coreStage?.style.setProperty("--core-rx", `${(-vertical * 0.3).toFixed(2)}deg`);
      coreStage?.style.setProperty("--core-ry", `${(horizontal * 0.32).toFixed(2)}deg`);
    }

  }

  window.addEventListener("pointermove", (event) => {
    if (reduceMotionQuery.matches || (event.pointerType && event.pointerType !== "mouse")) {
      return;
    }

    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerActive = true;
    pointerAura.classList.add("is-active");

    if (!pointerFrame) {
      pointerFrame = window.requestAnimationFrame(renderPointer);
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
const signalStrip = select("#signal-strip");
const signalToggle = select("#signal-toggle");
let scrollFrameRequested = false;

selectAll("i", signalStrip).forEach((marker) => marker.setAttribute("aria-hidden", "true"));
signalToggle?.addEventListener("click", () => {
  const paused = signalStrip?.classList.toggle("is-paused") || false;
  signalToggle.setAttribute("aria-pressed", String(paused));
  signalToggle.textContent = paused ? "Resume transmissions" : "Pause transmissions";
});

function updateScrollInterface() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
  const heroExit = reduceMotionQuery.matches
    ? 0
    : Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.78)));

  progressBar?.style.setProperty("--scroll-progress", String(progress));
  hero?.style.setProperty("--hero-shift", `${(heroExit * -34).toFixed(2)}px`);
  hero?.style.setProperty("--hero-fade", String(1 - (heroExit * 0.34)));
  hero?.style.setProperty("--hero-core-scale", String(1 - (heroExit * 0.055)));
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 18);
  syncPulseVisibility();
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

let navigationFocusTimer = null;
let cancelNavigationFocus = null;

function clearScheduledNavigationFocus() {
  window.clearTimeout(navigationFocusTimer);
  navigationFocusTimer = null;
  if (cancelNavigationFocus) {
    window.removeEventListener("pointerdown", cancelNavigationFocus, true);
    window.removeEventListener("keydown", cancelNavigationFocus, true);
    cancelNavigationFocus = null;
  }
}

function navigateTo(targetSelector, { updateHistory = true, focusTarget = true } = {}) {
  const target = typeof targetSelector === "string" ? select(targetSelector) : targetSelector;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  closeNavigation();
  closeThemeMenu();

  if (updateHistory && target.id) {
    const nextHash = `#${target.id}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
  }

  target.scrollIntoView({ behavior: reduceMotionQuery.matches ? "auto" : "smooth", block: "start" });

  if (focusTarget) {
    clearScheduledNavigationFocus();
    const focusOrigin = document.activeElement;
    const heading = select("h1, h2", target) || target;
    if (!heading.hasAttribute("tabindex")) {
      heading.setAttribute("tabindex", "-1");
    }
    cancelNavigationFocus = clearScheduledNavigationFocus;
    window.addEventListener("pointerdown", cancelNavigationFocus, { once: true, capture: true });
    window.addEventListener("keydown", cancelNavigationFocus, { once: true, capture: true });
    navigationFocusTimer = window.setTimeout(() => {
      const focusUnchanged = document.activeElement === focusOrigin || document.activeElement === document.body;
      clearScheduledNavigationFocus();
      if (focusUnchanged) {
        heading.focus({ preventScroll: true });
      }
    }, reduceMotionQuery.matches ? 0 : 520);
  }

  return true;
}

navToggle?.addEventListener("click", () => {
  const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
  navToggle.setAttribute("aria-expanded", String(willOpen));
  navToggle.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
  navPanel?.classList.toggle("is-open", willOpen);
  siteHeader?.classList.toggle("nav-is-open", willOpen);
});

navLinks.forEach((link) => link.addEventListener("click", () => closeNavigation()));

const mobileNavigationQuery = window.matchMedia("(max-width: 980px)");
mobileNavigationQuery.addEventListener?.("change", (event) => {
  if (!event.matches) {
    closeNavigation();
  }
});

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

  const sections = ["home", "work", "about", "mission", "lab", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const visibleSections = new Map();
  const navigationAliases = { mission: "about" };

  function updateActiveNavigation() {
    const visible = [...visibleSections.entries()]
      .filter(([, state]) => state.isIntersecting)
      .sort(([, first], [, second]) => second.intersectionRatio - first.intersectionRatio)[0];
    const visibleId = visible?.[0] || "home";
    const activeId = navigationAliases[visibleId] || visibleId;

    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${activeId}`;
      link.classList.toggle("is-active", active);
      if (active && visibleId === activeId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visibleSections.set(entry.target.id, {
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio
      });
    });
    updateActiveNavigation();
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
let focusSignalTimer = null;

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
  window.clearInterval(focusSignalTimer);
  focusSignalTimer = null;

  if (!focusSignal || reduceMotionQuery.matches) {
    return;
  }

  let index = 0;
  focusSignalTimer = window.setInterval(() => {
    if (document.hidden) {
      return;
    }
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
    if (card.dataset.tiltReady === "true") {
      return;
    }

    card.dataset.tiltReady = "true";
    let tiltFrame = null;
    let latestEvent = null;
    let cardActive = false;

    function renderTilt() {
      tiltFrame = null;
      if (!cardActive || !latestEvent || reduceMotionQuery.matches || !finePointerQuery.matches) {
        return;
      }
      const bounds = card.getBoundingClientRect();
      const x = (latestEvent.clientX - bounds.left) / bounds.width;
      const y = (latestEvent.clientY - bounds.top) / bounds.height;

      card.style.setProperty("--rx", `${((0.5 - y) * 3).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((x - 0.5) * 3).toFixed(2)}deg`);
      card.style.setProperty("--card-x", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--card-y", `${(y * 100).toFixed(1)}%`);
    }

    card.addEventListener("pointermove", (event) => {
      latestEvent = event;
      cardActive = true;
      if (!tiltFrame) {
        tiltFrame = window.requestAnimationFrame(renderTilt);
      }
    });

    card.addEventListener("pointerleave", () => {
      cardActive = false;
      if (tiltFrame) {
        window.cancelAnimationFrame(tiltFrame);
        tiltFrame = null;
      }
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--card-x", "50%");
      card.style.setProperty("--card-y", "50%");
    });
  });
}

function resetCardTilts() {
  selectAll("[data-tilt]").forEach((card) => {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--card-x", "50%");
    card.style.setProperty("--card-y", "50%");
  });
}

function initializeMagneticControls() {
  if (!finePointerQuery.matches || reduceMotionQuery.matches) {
    return;
  }

  selectAll(".hero-actions .button, .contact-actions .button").forEach((control) => {
    if (control.dataset.magneticReady === "true") {
      return;
    }

    control.dataset.magneticReady = "true";
    control.addEventListener("pointermove", (event) => {
      if (reduceMotionQuery.matches || !finePointerQuery.matches) {
        return;
      }
      const bounds = control.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 6;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 5;
      control.style.setProperty("--magnetic-x", `${x.toFixed(2)}px`);
      control.style.setProperty("--magnetic-y", `${y.toFixed(2)}px`);
    });
    control.addEventListener("pointerleave", () => {
      control.style.setProperty("--magnetic-x", "0px");
      control.style.setProperty("--magnetic-y", "0px");
    });
  });
}

function resetMagneticControls() {
  selectAll(".button").forEach((control) => {
    control.style.setProperty("--magnetic-x", "0px");
    control.style.setProperty("--magnetic-y", "0px");
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
let restoreCommandFocus = true;

commandSearch?.setAttribute("role", "combobox");
commandSearch?.setAttribute("aria-autocomplete", "list");
commandSearch?.setAttribute("aria-controls", "command-list");
commandSearch?.setAttribute("aria-expanded", "true");
commandItems.forEach((item, index) => {
  item.id ||= `command-option-${index + 1}`;
  item.setAttribute("role", "option");
  item.setAttribute("aria-selected", "false");
  item.tabIndex = -1;
  item.firstElementChild?.setAttribute("aria-hidden", "true");
  select("i", item)?.setAttribute("aria-hidden", "true");
});

function syncDialogBodyState() {
  const anyDialogOpen = selectAll("dialog").some((dialog) => dialog.open);
  document.body.classList.toggle("dialog-open", anyDialogOpen);
}

function visibleCommandItems() {
  return commandItems.filter((item) => !item.hidden);
}

function selectCommand(index) {
  const visibleItems = visibleCommandItems();

  commandItems.forEach((item) => {
    item.classList.remove("is-selected");
    item.setAttribute("aria-selected", "false");
  });

  if (!visibleItems.length) {
    selectedCommandIndex = 0;
    commandSearch?.removeAttribute("aria-activedescendant");
    return;
  }

  selectedCommandIndex = (index + visibleItems.length) % visibleItems.length;
  const selectedItem = visibleItems[selectedCommandIndex];
  selectedItem.classList.add("is-selected");
  selectedItem.setAttribute("aria-selected", "true");
  commandSearch?.setAttribute("aria-activedescendant", selectedItem.id);
  selectedItem.scrollIntoView({ block: "nearest" });
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

function resolveCommandReturnFocus(trigger) {
  if (!(trigger instanceof HTMLElement)) {
    return commandTrigger;
  }
  if (pulsePanel?.contains(trigger)) {
    return pulseTrigger;
  }
  if (themeMenu?.contains(trigger)) {
    return themeSwitcher;
  }
  if (mobileNavigationQuery.matches && navPanel?.contains(trigger)) {
    return navToggle;
  }
  return trigger;
}

function restoreFocusTo(preferred, ...fallbacks) {
  const target = [preferred, ...fallbacks].find((element) => (
    element instanceof HTMLElement &&
    element.isConnected &&
    !element.inert &&
    element.getClientRects().length > 0
  ));
  target?.focus({ preventScroll: true });
}

function openCommandDeck(trigger = document.activeElement) {
  if (!bootFinished || !commandDialog || commandDialog.open || scanDialog?.open) {
    return;
  }

  const returnTarget = resolveCommandReturnFocus(trigger);
  closeNavigation();
  closePulse({ restoreFocus: false });
  commandReturnFocus = returnTarget;
  restoreCommandFocus = true;
  commandDialog.showModal();
  syncDialogBodyState();

  if (commandSearch) {
    commandSearch.value = "";
    filterCommands();
    window.setTimeout(() => commandSearch.focus(), 0);
  }
}

function closeCommandDeck({ restoreFocus = true } = {}) {
  restoreCommandFocus = restoreFocus;
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
  if (restoreCommandFocus) {
    const returnTarget = commandReturnFocus;
    window.setTimeout(() => {
      restoreFocusTo(returnTarget, navToggle, commandTrigger, pulseTrigger);
    }, 0);
  }
});

commandItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    const targetSelector = item.dataset.commandTarget;
    const returnTarget = commandReturnFocus;

    if (targetSelector) {
      event.preventDefault();
      closeCommandDeck({ restoreFocus: false });
      window.setTimeout(() => {
        navigateTo(targetSelector);
      }, 20);
    } else if (item.hasAttribute("data-command-scan")) {
      event.preventDefault();
      closeCommandDeck({ restoreFocus: false });
      window.setTimeout(() => openScanner(returnTarget), 40);
    } else if (item.hasAttribute("data-command-pulse")) {
      event.preventDefault();
      closeCommandDeck({ restoreFocus: false });
      window.setTimeout(() => openPulse(returnTarget), 40);
    } else if (item.hasAttribute("data-command-theme")) {
      event.preventDefault();
      cycleTheme();
      closeCommandDeck();
    } else if (item instanceof HTMLAnchorElement) {
      closeCommandDeck();
    }
  });
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!bootFinished) {
      return;
    }
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
const terminalCommandHistory = [];
let terminalHistoryIndex = 0;
let terminalHistoryDraft = "";
let lastTerminalCompletion = "";

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

function appendTerminalLink(label, href) {
  const line = appendTerminalLine("Source channel: ");
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = `${label} ↗ (opens in a new tab)`;
  line?.appendChild(link);
}

function appendTerminalResponse(response) {
  if (Array.isArray(response)) {
    response.forEach((line) => appendTerminalLine(line));
  } else if (typeof response === "string" && response) {
    appendTerminalLine(response);
  }
}

const terminalCommands = {
  help: {
    description: "list available commands",
    run: () => Object.entries(terminalCommands)
      .map(([name, entry]) => `${name.padEnd(9, " ")} ${entry.description}`)
      .join("\n")
  },
  whoami: {
    description: "identify the operator",
    run: () => "Adam // creative developer exploring game development, cinematic web experiences, Minecraft systems, and local AI."
  },
  projects: {
    description: "list current case files",
    run: () => [
      "[001] NEON SECTOR-7 ........ IN DEVELOPMENT",
      "[002] 2D GAME CHALLENGE .... DEBUGGING",
      "[003] MINECRAFT ENGINEERING  FIELD NOTES",
      "[004] LOCAL AI LAB ......... EXPERIMENTAL"
    ]
  },
  stack: {
    description: "inspect the working stack",
    run: () => "WEB // HTML · CSS · JavaScript · Three.js exploration\nSYSTEMS // Java · Paper · databases\nLAB // Ollama · local models · image workflows\nGAMES + 3D // Godot · Unity · Unreal · Blender"
  },
  sector: {
    description: "read Sector-7 telemetry",
    run: () => [
      "SECTOR-7 STATUS",
      "Core......... ONLINE",
      "Network...... STABLE",
      "Operator..... ADAM",
      "Interface.... READY"
    ]
  },
  mission: {
    description: "inspect the current mission",
    run: (args) => {
      if (args[0] === "open") {
        window.setTimeout(() => navigateTo("#mission"), 80);
        return "Opening operator history archive...";
      }
      return "BUILD → EXPERIMENT → LEARN → REPEAT. Type “mission open” to enter the operator history archive.";
    }
  },
  matrix: {
    description: "show the capability matrix",
    run: () => "ACTIVE // Creative Web · Minecraft Engineering\nBUILDING // Interactive Worlds · 3D\nEXPLORING // Game Development\nEXPERIMENTING // Local AI"
  },
  status: {
    description: "read interface health",
    run: () => `Portfolio interface online. Scanner high score: ${readStorage(localStore, "ns7-high-score", "000")}.`
  },
  history: {
    description: "show recent terminal commands",
    run: () => terminalCommandHistory.length
      ? terminalCommandHistory.slice(-10).map((entry, index) => `${String(index + 1).padStart(2, "0")}  ${entry}`).join("\n")
      : "No command history in this connection."
  },
  theme: {
    description: "cycle or choose a sector mode",
    run: (args) => {
      const requestedTheme = args[0];
      const nextTheme = requestedTheme && themes.includes(requestedTheme)
        ? applyTheme(requestedTheme, true)
        : cycleTheme();
      return `Interface shifted to ${themeLabels[nextTheme]}.`;
    }
  },
  pulse: {
    description: "open the local system guide",
    run: () => {
      window.setTimeout(() => openPulse(terminalInput), 80);
      return "PULSE channel requested. Opening local guide...";
    }
  },
  scan: {
    description: "launch the anomaly scanner",
    run: () => {
      window.setTimeout(() => openScanner(terminalInput), 260);
      return "Anomaly scanner initialized. Opening secure channel...";
    }
  },
  github: {
    description: "open the public source channel",
    run: () => {
      appendTerminalLink("github.com/doctordoomies", "https://github.com/doctordoomies");
      return null;
    }
  },
  clear: {
    description: "clear terminal output",
    run: () => {
      terminalOutput?.replaceChildren();
      return null;
    }
  }
};

const terminalAliases = { "?": "help", ls: "projects", guide: "pulse" };

function executeTerminalCommand(rawCommand) {
  const normalized = rawCommand.trim();
  if (!normalized) {
    return;
  }

  const [rawName, ...args] = normalized.toLowerCase().split(/\s+/);
  const commandName = terminalAliases[rawName] || rawName;
  const command = terminalCommands[commandName];

  terminalCommandHistory.push(normalized);
  if (terminalCommandHistory.length > 30) {
    terminalCommandHistory.shift();
  }
  terminalHistoryIndex = terminalCommandHistory.length;
  terminalHistoryDraft = "";
  appendTerminalLine(normalized, "command-line");

  if (!command) {
    appendTerminalLine(`Unknown command: ${commandName}. Type "help" for a signal list.`, "error-line");
    return;
  }

  appendTerminalResponse(command.run(args));
}

function completeTerminalInput() {
  if (!terminalInput) {
    return false;
  }

  const value = terminalInput.value.toLowerCase();
  if (!value.trim()) {
    return false;
  }
  const themeMatch = value.match(/^theme\s+([^\s]*)$/);
  const candidates = themeMatch
    ? themes.filter((theme) => theme.startsWith(themeMatch[1]))
    : Object.keys(terminalCommands).filter((name) => name.startsWith(value.trim()));

  if (!candidates.length) {
    return false;
  }

  if (candidates.length === 1) {
    const completion = themeMatch ? `theme ${candidates[0]}` : candidates[0];
    if (terminalInput.value.toLowerCase() === completion) {
      return false;
    }
    terminalInput.value = completion;
    lastTerminalCompletion = completion;
    terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
  } else {
    if (lastTerminalCompletion === value) {
      return false;
    }
    appendTerminalLine(`Matches: ${candidates.join(" · ")}`, "system-line");
    lastTerminalCompletion = value;
  }
  return true;
}

terminalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  executeTerminalCommand(terminalInput?.value || "");
  if (terminalInput) {
    terminalInput.value = "";
  }
});

terminalInput?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" && terminalCommandHistory.length) {
    event.preventDefault();
    if (terminalHistoryIndex === terminalCommandHistory.length) {
      terminalHistoryDraft = terminalInput.value;
    }
    terminalHistoryIndex = Math.max(0, terminalHistoryIndex - 1);
    terminalInput.value = terminalCommandHistory[terminalHistoryIndex];
    terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
  } else if (event.key === "ArrowDown" && terminalCommandHistory.length) {
    event.preventDefault();
    terminalHistoryIndex = Math.min(terminalCommandHistory.length, terminalHistoryIndex + 1);
    terminalInput.value = terminalHistoryIndex === terminalCommandHistory.length
      ? terminalHistoryDraft
      : terminalCommandHistory[terminalHistoryIndex];
    terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
  } else if (event.key === "Tab" && !event.shiftKey && completeTerminalInput()) {
    event.preventDefault();
  }
});

terminalInput?.addEventListener("input", () => {
  if (terminalInput.value.toLowerCase() !== lastTerminalCompletion) {
    lastTerminalCompletion = "";
  }
});

selectAll("[data-terminal-command]").forEach((button) => {
  button.addEventListener("click", () => {
    executeTerminalCommand(button.dataset.terminalCommand || "");
    terminalInput?.focus();
  });
});

/* ---------------------------------------------------------
   Pulse // local scripted system guide
   --------------------------------------------------------- */

const pulseSystem = select(".pulse-system");
const pulseTrigger = select("#pulse-trigger");
const pulsePanel = select("#pulse-panel");
const pulseClose = select("#pulse-close");
const pulseResponse = select("#pulse-response");
let pulseReturnFocus = null;
let pulseResponseTimer = null;
let pulseActionTimer = null;
let pulseRevealY = Number.POSITIVE_INFINITY;

const pulseResponses = {
  adam: "Adam is a creative developer exploring games, interactive web experiences, Java and Paper systems, 3D, and local AI workflows.",
  sector: "Neon Sector-7 is the fictional operating system and deep-space station built around Adam’s portfolio. Every case file is a real project or field of experimentation.",
  builds: "Adam builds playable ideas, cinematic interfaces, Minecraft systems, game prototypes, and offline AI experiments—then keeps iterating as each system comes online.",
  projects: "Opening the Project Archive. Four current signals are indexed."
};

function setPulseResponse(message) {
  if (!pulseResponse) {
    return;
  }

  window.clearTimeout(pulseResponseTimer);
  window.clearTimeout(pulseActionTimer);
  pulseResponse.classList.add("is-receiving");
  const revealResponse = () => {
    pulseResponse.textContent = message;
    pulseResponse.classList.remove("is-receiving");
  };

  if (reduceMotionQuery.matches) {
    revealResponse();
  } else {
    pulseResponseTimer = window.setTimeout(revealResponse, 120);
  }
}

function syncPulseVisibility() {
  const shouldMute =
    window.innerWidth <= 430 &&
    pulsePanel?.hidden &&
    window.scrollY < pulseRevealY;

  pulseSystem?.classList.toggle("is-hero-muted", Boolean(shouldMute));
}

function updatePulseRevealPoint() {
  pulseRevealY = hero
    ? hero.offsetTop + hero.offsetHeight - 120
    : window.innerHeight;
  syncPulseVisibility();
}

function openPulse(trigger = document.activeElement) {
  if (!bootFinished || !pulsePanel || !pulseTrigger) {
    return;
  }

  closeNavigation();
  closeThemeMenu();
  if (commandDialog?.open) {
    closeCommandDeck({ restoreFocus: false });
  }
  pulseReturnFocus = trigger instanceof HTMLElement ? trigger : pulseTrigger;
  pulseSystem?.classList.remove("is-hero-muted");
  pulseSystem?.classList.add("is-open");
  pulsePanel.hidden = false;
  pulseTrigger.setAttribute("aria-expanded", "true");
  pulseTrigger.setAttribute("aria-label", "Close Pulse system guide");
  window.setTimeout(() => pulseClose?.focus({ preventScroll: true }), 0);
}

function closePulse({ restoreFocus = true } = {}) {
  if (!pulsePanel || pulsePanel.hidden) {
    return;
  }

  window.clearTimeout(pulseResponseTimer);
  window.clearTimeout(pulseActionTimer);
  pulseResponse?.classList.remove("is-receiving");
  pulseSystem?.classList.remove("is-open");
  pulsePanel.hidden = true;
  syncPulseVisibility();
  pulseTrigger?.setAttribute("aria-expanded", "false");
  pulseTrigger?.setAttribute("aria-label", "Open Pulse system guide");
  if (restoreFocus) {
    restoreFocusTo(pulseReturnFocus, pulseTrigger);
  }
}

pulseTrigger?.addEventListener("click", () => {
  if (pulsePanel?.hidden) {
    openPulse(pulseTrigger);
  } else {
    closePulse();
  }
});

pulseClose?.addEventListener("click", () => closePulse());

selectAll("[data-pulse-question]").forEach((button) => {
  button.addEventListener("click", () => {
    const question = button.dataset.pulseQuestion;
    setPulseResponse(pulseResponses[question] || "That signal is not in my local response matrix.");
    if (question === "projects") {
      window.clearTimeout(pulseActionTimer);
      pulseActionTimer = window.setTimeout(() => {
        closePulse({ restoreFocus: false });
        navigateTo("#work");
      }, reduceMotionQuery.matches ? 0 : 460);
    }
  });
});

document.addEventListener("pointerdown", (event) => {
  if (!pulsePanel?.hidden && !pulseSystem?.contains(event.target)) {
    const focusableTarget = event.target.closest(
      "a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    closePulse({ restoreFocus: !focusableTarget });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && pulsePanel && !pulsePanel.hidden) {
    event.preventDefault();
    closePulse();
  }
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
const scanWindow = select(".sector-scan-window", scanDialog);

let score = 0;
let streak = 0;
let highScore = Number.parseInt(readStorage(localStore, "ns7-high-score", "0"), 10) || 0;
let gameRunning = false;
let gamePaused = false;
let endTime = 0;
let pausedAt = 0;
let timerFrame = null;
let spawnTimer = null;
let scanReturnFocus = null;
const anomalyTimers = new Map();
const effectTimers = new Set();
const anomalyTypes = {
  standard: { className: "", label: "Energy signal", points: 100, lifetime: 1 },
  unstable: { className: "is-unstable", label: "Moving unstable signal", points: 150, lifetime: 1.3 },
  rare: { className: "is-rare", label: "Rare purple signal", points: 300, lifetime: 1.4 }
};

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
  scanWindow?.classList.remove("is-new-high");
  updateHighScoreDisplay();
  scanField?.setAttribute("tabindex", "-1");
}

function openScanner(trigger = document.activeElement) {
  if (!scanDialog || scanDialog.open) {
    return;
  }

  if (commandDialog?.open) {
    closeCommandDeck({ restoreFocus: false });
  }

  closePulse({ restoreFocus: false });

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
  selectAll(".scan-anomaly, .scan-hit, .scan-burst", scanField).forEach((element) => element.remove());
  scanField?.classList.remove("is-impact");
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

function createScanBurst(x, y, isStrong = false) {
  if (!scanField) {
    return;
  }

  const burst = document.createElement("span");
  burst.className = `scan-burst${isStrong ? " is-strong" : ""}`;
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;
  burst.setAttribute("aria-hidden", "true");
  scanField.appendChild(burst);

  if (isStrong) {
    scanField.classList.remove("is-impact");
    scanField.classList.add("is-impact");
  }

  const timer = window.setTimeout(() => {
    burst.remove();
    scanField.classList.remove("is-impact");
    effectTimers.delete(timer);
  }, 480);
  effectTimers.add(timer);
}

function neutralizeAnomaly(anomaly) {
  if (!gameRunning || gamePaused || !anomaly?.isConnected) {
    return;
  }

  clearAnomalyTimer(anomaly);
  streak += 1;
  const bonus = Math.floor(streak / 5) * 25;
  const points = (Number.parseInt(anomaly.dataset.points || "100", 10) || 100) + bonus;
  score += points;

  scoreDisplay.textContent = paddedScore(score);
  statusDisplay.textContent = streak >= 5 ? `Combo x${streak}` : "Scanning";

  const fieldBounds = scanField.getBoundingClientRect();
  const anomalyBounds = anomaly.getBoundingClientRect();
  const x = anomalyBounds.left - fieldBounds.left + (anomalyBounds.width / 2);
  const y = anomalyBounds.top - fieldBounds.top + (anomalyBounds.height / 2);
  createHitText(x, y, points);
  createScanBurst(x, y, anomaly.dataset.type === "rare");
  anomaly.remove();
  scanField.focus({ preventScroll: true });
}

function positionAnomaly(anomaly) {
  if (!scanField) {
    return;
  }

  const fieldWidth = scanField.clientWidth;
  const fieldHeight = scanField.clientHeight;
  const targetSize = 46;
  const padding = fieldWidth < 430 ? 25 : 44;
  const maximumX = Math.max(padding, fieldWidth - targetSize - padding);
  const maximumY = Math.max(padding, fieldHeight - targetSize - padding);
  const xRatio = Number.parseFloat(anomaly.dataset.xRatio || "0.5");
  const yRatio = Number.parseFloat(anomaly.dataset.yRatio || "0.5");
  const x = padding + xRatio * Math.max(0, maximumX - padding);
  const y = padding + yRatio * Math.max(0, maximumY - padding);
  anomaly.style.left = `${x}px`;
  anomaly.style.top = `${y}px`;
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
  const typeRoll = Math.random();
  const typeName = typeRoll > 0.9 ? "rare" : typeRoll > 0.68 ? "unstable" : "standard";
  const type = anomalyTypes[typeName];
  anomaly.type = "button";
  anomaly.className = `scan-anomaly ${type.className}`.trim();
  anomaly.tabIndex = -1;
  anomaly.dataset.type = typeName;
  anomaly.dataset.points = String(type.points);
  anomaly.dataset.xRatio = String(Math.random());
  anomaly.dataset.yRatio = String(Math.random());
  anomaly.setAttribute("aria-label", `${type.label}, worth ${type.points} points`);
  anomaly.style.setProperty("--move-x", `${Math.random() * 34 - 17}px`);
  anomaly.style.setProperty("--move-y", `${Math.random() * 28 - 14}px`);
  positionAnomaly(anomaly);
  anomaly.addEventListener("pointerdown", (event) => event.preventDefault());
  anomaly.addEventListener("click", () => neutralizeAnomaly(anomaly));
  scanField.appendChild(anomaly);

  const elapsed = Math.max(0, 20000 - (endTime - performance.now()));
  const lifetime = (Math.max(720, 1450 - elapsed * 0.022) + Math.random() * 300) * type.lifetime;
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
  writeStorage(localStore, "ns7-high-score", String(highScore));
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
    scanWindow?.classList.add("is-new-high");
    showToast(`NEW HIGH SCORE // ${paddedScore(score)}`);
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
  scanWindow?.classList.remove("is-new-high");
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
  const returnTarget = scanReturnFocus;
  window.setTimeout(() => {
    restoreFocusTo(returnTarget, navToggle, commandTrigger, select("[data-open-scan]"));
  }, 0);
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

window.addEventListener("resize", () => {
  selectAll(".scan-anomaly", scanField).forEach(positionAnomaly);
  window.requestAnimationFrame(updatePulseRevealPoint);
}, { passive: true });

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
initializeMagneticControls();
updatePulseRevealPoint();
updateScrollInterface();
updateLocalTime();
rotateFocusSignal();
updateHighScoreDisplay();
window.setInterval(updateLocalTime, 1000);

function handleMotionPreferenceChange() {
  if (reduceMotionQuery.matches) {
    particlesContainer?.replaceChildren();
    resetPointerWorld();
    resetCardTilts();
    resetMagneticControls();
    revealElements.forEach((element) => element.classList.add("is-visible"));
    finishBoot();
    rotateFocusSignal();
  } else {
    createParticles();
    enablePointerLighting();
    initializeCardTilt();
    initializeMagneticControls();
    rotateFocusSignal();
  }

  updateScrollInterface();
}

reduceMotionQuery.addEventListener?.("change", handleMotionPreferenceChange);
finePointerQuery.addEventListener?.("change", () => {
  if (finePointerQuery.matches && !reduceMotionQuery.matches) {
    enablePointerLighting();
    initializeCardTilt();
    initializeMagneticControls();
  } else {
    resetPointerWorld();
    resetCardTilts();
    resetMagneticControls();
  }
});
