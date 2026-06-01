# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
