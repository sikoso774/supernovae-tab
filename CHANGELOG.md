# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-10-01

### Added
- **Writing streak and calendar** on the Home dashboard: a large "days in a row" counter
  (the flame changes at 7, 30 and 100 days), longest streak, notes created this year, and a
  one-square-per-day calendar (last 12 months, or any year). Hover a day for its count, click it
  to open that day's journal note. One note = one contribution on the day of its `Date`,
  `created` or `création` property; templates and `Home` are ignored. Plain CSS grid, no extra
  dependency. Can be hidden with **Show writing activity**.
- **Navigation link groups**: links sharing a *Group* are shown on their own labelled row
  (e.g. a "Cursus MIAGE" row under the main buttons).
- **Due flashcards badge**: tick *Due* on a navigation link to show how many Spaced Repetition
  cards are due today or new, like the Spaced Repetition status bar (read from the `<!--SR:…-->` markers
  and the card syntax of notes tagged `#flashcards`; the badge is
  hidden when nothing is due).
- **Take over Home.md** setting (on by default). Turn it off to open the real `Home.md` note
  (Dataview blocks, charts); the "Open home dashboard" command and the ribbon icon still open
  the dashboard.

### Changed
- **Active projects** now matches `Type`/`type` and `Status`/`status` regardless of case,
  accepts `Project` or `Projet`, and `active`, `actif` or `En cours` (emoji ignored, so
  `🟠 En cours` works).
- **Recent files** no longer lists `Home`, `Theme Studio`, dashboards or anything under
  `06 - Templates/`.
- Default navigation links updated (the dead `Projets` link is replaced by `Révision`).
- The Home dashboard scrolls when the window is too short for all sections.

## [1.2.0] - 2026-09-19

### ⚠️ Mobile: unstable

Supernovae Tab is **not stable on phones and tablets** (iOS and Android). The animated
view can still exhaust the memory of the mobile app, especially on iOS.

### Added
- **Disable on mobile** setting (Settings → Supernovae Tab → Mobile settings), **enabled by default**.
  On mobile, the plugin then only registers its settings tab: no galaxy view, no Home
  dashboard interception, new tabs stay Obsidian's default. Desktop is unaffected.
  Turn it off at your own risk to use the plugin on mobile; restart the app to apply.

## [1.1.0] - 2026-09-19

### Fixed

#### Mobile stability (iOS / Android)
- Crash from memory saturation on iOS: the starfield no longer rebuilds every gradient each frame. Nebulae and the planet are pre-rendered once per resize, and star glows use a cached sprite
- The animation loop pauses when the tab is hidden, off-screen or the app is in the background
- On mobile: frame rate capped at 30 fps and fewer stars
- Resize events are debounced (iOS keyboard and rotation bursts), and zero-sized canvases are ignored
- Recent files and active projects are recomputed only on vault or metadata changes, not every second
- The clock is isolated in its own component, so the 1-second tick no longer re-renders the whole view
- `backdrop-filter` blur is disabled on mobile and replaced with a semi-opaque fill
- The esbuild live-reload connection is never opened on mobile
- The production build is minified

#### Community review fixes
- Removed the Google Fonts `<link>` injection; the Orbitron font is embedded in `styles.css`
- Nav links modal: CSS classes instead of inline styles
- Typed internal Obsidian APIs (commands, plugins, bookmarks); no more `any` or `@ts-ignore`
- Promises handled everywhere (`void` / `.catch`), `window.*` timers for popout windows
- Sentence case for UI text; removed unused imports and console logging
- `minAppVersion` raised to 1.7.2 (APIs actually used); `versions.json` cleaned of inherited entries
- Dependencies: removed unused `electron`, upgraded `esbuild` and `obsidian` typings (0 audit advisories)
- Release workflow publishes build provenance attestations

#### Robustness
- No crash when the core Bookmarks plugin is disabled
- No crash on unknown icon names
- Settings observable: unsubscribing no longer removes every other subscriber
- `{{today}}` nav link uses the local date instead of UTC
- Errors in workspace event handlers are caught and logged

## [1.0.0] - 2026-06-01

### Added

#### New Tab — Galaxy View
- Animated starfield with twinkling stars and randomized brightness
- Shooting star animation crossing the canvas periodically
- Color nebulae (violet and blue) rendered on the canvas background
- Constellation lines connecting stars to their two nearest neighbors, with pulsing opacity
- Ringed gas planet (bottom-right corner) with perspective ring in Nebulux blue palette
- Live clock in Orbitron font, updating every second
- Date display below the clock
- Greeting with time-of-day salutation (`{{greeting}}`) and personalized name (`{{name}}`)
- Inline search bar opening a configurable search provider
- Top-left search button with configurable provider
- Recent files section showing the 5 most recently edited notes
- Bookmarks section (all bookmarks or a specific group)
- Random quote at the bottom (built-in quotes, custom quotes, or both)

#### Home Dashboard
- Automatic interception of `Home.md`: opening it displays the galaxy dashboard instead of the markdown editor
- Navigation buttons (configurable via settings) linking to key notes and folders
- `{{today}}` placeholder resolving to today's daily note (`YYYY-MM-DD`)
- Recent files section mirroring the new tab view
- Active projects section: automatically lists notes with `Type: Project` and `status: active` in frontmatter
- Tab protection: files opened from the Home Dashboard open in a new tab, preserving the Home view
- Pencil button (✏️) in the view header to edit `Home.md` directly

#### Settings
- `userName` field used via `{{name}}` placeholder in the greeting
- Toggle and customization for every UI element (clock, greeting, search, recent files, bookmarks, quote)
- Time format: 12-hour or 24-hour
- Configurable greeting text with placeholder support
- Search provider selection (Core Quick Switcher, Omnisearch, Another Quick Switcher, Quick Switcher++)
- Bookmarks source: all bookmarks or a specific group
- Quote source: built-in, custom, or both
- Navigation links editor for the Home Dashboard (modal with add/remove/reorder)

#### Visual identity
- Orbitron font injected at plugin load via Google Fonts, cleaned up on unload
- Full Nebulux color palette (`#0a0c12` background, `#78b4ff` accents)
- Glassmorphism cards for recent files and navigation buttons
- All Beautitab references removed — fully independent identity

#### Infrastructure
- GitHub Actions workflow: automatic release on git tag push (`main.js`, `styles.css`, `manifest.json` + zip)
- GitHub Actions workflow: pre-release on beta tags
- GitHub Actions workflow: build check on pull requests

### Fixed
- View header buttons (✏️ and ⋯ menu) were unclickable due to `z-index` conflict between the galaxy wrapper and the absolutely-positioned view header
- Edit button for `Home.md` was silently failing because `onLayoutChange` was hijacking the new empty leaf before `openFile` could run
