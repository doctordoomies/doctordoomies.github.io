# Neon Sector-7

Neon Sector-7 is Adam's interactive developer portfolio and a static GitHub Pages site. It presents projects, experiments, and the development journey through a cinematic deep-space interface built without a framework or build step.

## Architecture

- `index.html` contains the semantic content and interface structure.
- `styles.css` contains the visual system, four sector themes, responsive layouts, and reduced-motion behavior.
- `script.js` contains independent systems for the handshake, navigation, themes, background world, command deck, terminal, Pulse guide, and anomaly scanner.
- `404.html` is the branded fallback for missing routes.
- `assets/` contains the site imagery and favicon.

Everything runs in the browser with HTML, CSS, and vanilla JavaScript. No API key, backend, package manager, or generated build output is required.

## Local preview

Serve the repository root with any static file server. For example:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Useful controls:

- `Ctrl/Cmd + K` opens the command deck.
- The terminal supports `help`, command history with Up/Down, and Tab completion.
- Pulse provides local scripted guidance; it does not call an external AI service.
- Sector themes persist in `localStorage`.
- The intro plays once per browser session using `sessionStorage`.
- Scanner high scores persist in `localStorage`.

## Accessibility and performance

The site uses semantic landmarks, native modal dialogs, keyboard-operable interactions, visible focus states, responsive touch targets, and a complete `prefers-reduced-motion` mode. Ambient DOM counts are deliberately limited, animation work pauses when the page is hidden, and effects use transforms and opacity wherever practical.

## Deployment

The workflow in `.github/workflows/pages.yml` uploads the repository as a static GitHub Pages artifact whenever `main` is updated. The `.nojekyll` file keeps Pages from applying Jekyll processing.
