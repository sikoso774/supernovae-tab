# Supernovae Tab — Obsidian Plugin

A galaxy-themed new tab experience for Obsidian. Every new tab opens an animated starfield with your time, greeting, search, recent files, and more — all floating in deep space.

![Supernovae Tab new tab screenshot](screenshots/screenshot1.png)

---

## Features

### New Tab — Galaxy View

Every new empty tab is replaced by the galaxy view:

- **Animated starfield** — twinkling stars, a shooting star, and color nebulae (violet + blue)
- **Constellation lines** — stars connected to their nearest neighbors, softly pulsing
- **Ringed planet** — a blue gas giant with a perspective ring in the corner
- **Live clock** — large Orbitron display, 12h or 24h format
- **Date** — displayed below the clock
- **Greeting** — personalized message with time-of-day and your name
- **Full-text search** — type in the bar and the results show up in the tab itself, with a preview of the selected note and the matching words highlighted (see [Full-text search](#new-tab--full-text-search))
- **Recent files** — your 5 most recently edited notes (right click for the file menu, middle click for a new tab)
- **Bookmarks** — from all bookmarks or a specific group, with the same right-click and middle-click actions
- **Quote** — a random quote from the built-in list or your own custom quotes

![Supernovae Tab settings screenshot](screenshots/screenshot-settings.png)

### Home Dashboard

Create a note named `Home.md` in your vault. Whenever you open it, Supernovae Tab intercepts the navigation and displays a dedicated Home Dashboard instead:

- Same galaxy background as the new tab
- **Three-column layout** that scales itself to the window (side panels open or not): main tabs, clock, date card, link groups, recent notes, streak and calendar, data card
- **Navigation buttons** — configurable links to your key notes and folders, or to any Obsidian command (path `command:<id>`)
- **Recent files** — your 5 most recently edited notes, in a scrolling list
- **Writing streak and calendar** — a big "days in a row" counter and a one-square-per-day calendar of the notes you created (hover for details, click to open the day's journal note)
- **Link groups** — navigation links sharing a group are listed together in a scrolling card (e.g. *Cursus MIAGE*)
- **Data card (DATA NERDS)** — notes created per month (line) and notes per domain (donut), from the sub-folders of a folder you choose
- **Flashcards badge** — optional counter of Spaced Repetition cards to review (due or new) on a navigation button
- **Tab protection** — the Home tab is pinned, and every note chosen in the dashboard (click or middle click) opens in a tab of its own, preserving the Home view; only a `command:` link, such as *Révision*, does not open a tab

> **Tip:** Use `{{today}}` as a navigation link path to automatically open today's daily note (format `YYYY-MM-DD`).

A pencil button (✏️) in the view header lets you edit `Home.md` directly without leaving the dashboard workflow.

---

## Mobile support

> ⚠️ **Supernovae Tab is not stable on phones and tablets yet** (iOS and Android): the animated view can exhaust the mobile app's memory.
>
> Since 1.2.0 the plugin is **disabled on mobile by default**: it only keeps its settings tab there, and new tabs stay Obsidian's default. You can turn **Settings → Supernovae Tab → Disable on mobile** off at your own risk (restart the app to apply). Desktop is unaffected.

---

## Installation

### Via Community Plugins (recommended)

1. Open Obsidian Settings → Community Plugins
2. Search for **Supernovae Tab**
3. Click Install, then Enable

### Manual

1. Download the latest release from [GitHub Releases](https://github.com/Sikoso774/supernovae-tab/releases)
2. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at `.obsidian/plugins/supernovae-tab/`
3. Enable the plugin in Settings → Community Plugins

---

## Settings

All settings are available under **Settings → Supernovae Tab**.

| Section | Options |
| --- | --- |
| **Mobile** | Disable the plugin on phones and tablets (on by default) |
| **Search** | Show/hide top-left search button and inline search bar; built-in full-text search (on by default) and the folders it leaves out; choose the search provider plugin (top-left button, or the bar when the built-in search is off) |
| **Time** | Show/hide the clock; 12-hour or 24-hour format; date language (French or English) |
| **Greeting** | Your name (used via `{{name}}`); show/hide greeting; custom greeting text |
| **Recent files** | Show/hide the recent files section |
| **Bookmarks** | Show/hide bookmarks; display all bookmarks or a specific group |
| **Home Dashboard** | Take over `Home.md` (on/off); pin the Home tab (on by default); show/hide the writing activity and the data panel; folder whose sub-folders are the domains; edit the navigation links (label, path or `command:<id>`, group, due-cards badge) |
| **Quotes** | Show/hide quotes; choose between built-in quotes, your own, or both |

### Greeting placeholders

| Placeholder | Value |
| --- | --- |
| `{{greeting}}` | Time-of-day greeting (e.g. *Good morning*) |
| `{{name}}` | Your name from settings (fallback: *explorer*) |

### Supported search providers

- Obsidian Core Quick Switcher
- [Omnisearch](https://github.com/scambier/obsidian-omnisearch)
- [Another Quick Switcher](https://github.com/tadashi-aikawa/obsidian-another-quick-switcher)
- [Quick Switcher++](https://github.com/darlal/obsidian-switcher-plus)

---

## New Tab — Right-click menu

A right click on a recent note or a bookmark opens a menu that starts with **Open in new tab**, **Open to the right** and **Open in new window**, followed by what Obsidian and your plugins add to every file menu: *Bookmark…*, *Copy Obsidian URL*, *Reveal file in navigation*, *Open in default app*, and the entries your plugins add to file menus. *Rename* and *Delete* are not part of it: Obsidian adds them in the file explorer and the tab menu only.

---

## New Tab — Full-text search

The search bar of the new tab searches the content of your notes, right in the tab, with no window on top of it. Start typing (anywhere in the tab) and the clock shrinks to make room for the results.

- **What is searched** — the title, the section titles, the tags (and `MOC`), the folder and the text of each note. A word in the title counts more than one in a section title or a tag, which counts more than one in the body. Drawings (`.excalidraw.md`) are searched through their texts; frontmatter, images, links' targets, SR markers and the TikZ / chart / Dataview blocks are left out.
- **How it matches** — accents and case are ignored (`modelisation` finds *modélisation*), a typo is tolerated from four letters on (`mongdb` finds *MongoDB*), and the beginning of a word is enough while you type (`replic` finds *replica* and *réplication*). Every word you type must be in the note; if no note has them all, the best partial matches are shown and labelled. There are no search operators (quotes, `-word`, `tag:`) yet.
- **Results** — a list with the title, the folder path and an excerpt with the matching words highlighted; the selected note is rendered on the right, from the section that holds the first match. Under 760 px of width the preview is hidden.
- **Keyboard and mouse** — ↑ / ↓ and Page Up / Page Down to move, **Enter** to open the note, **Ctrl+Enter** (or Ctrl+click, or a **middle click**) to open it in a new tab, **Esc** to clear the search. A middle click also works on the recent notes and on the links of the preview.
- **Index** — kept in memory (about 15 MB for 600 notes), built in the background when Obsidian is ready (an "Indexation" counter shows while it runs) and updated after each edit, rename or deletion. Folders can be left out in the settings (default `06 - Templates`).
- To get the previous behavior (the bar opens your search provider), turn off **Built-in full-text search**. The top-left button always opens the provider.

---

## Home Dashboard — Writing activity

The dashboard shows how regularly you write. Each note counts once, on the day given by its `Date`, `created` or `création` property (`YYYY-MM-DD`). Notes in `06 - Templates/` and `Home` are ignored.

- **Streak** — consecutive days with at least one note. It stays alive until the end of today: if you have not written yet this morning, yesterday's streak is still shown.
- **Calendar** — the last six months, or one calendar year at a time. Hover a square for the count, click it to open the note named after that day (`YYYY-MM-DD`).
- Turn it off with **Settings → Supernovae Tab → Show writing activity**.

---

## Home Dashboard — Data card

The **DATA NERDS** card shows two charts, drawn as plain SVG (no chart library, no file is read):

- **Notes created per month** over the last twelve months, from the same `Date` / `created` / `création` property as the writing calendar.
- **Notes per domain**: a donut with one slice per sub-folder of the **Domains folder** setting (default `03 - CONTENTS`; the leading number of a folder name is dropped, so `02-Code` reads *Code*). The six biggest domains are listed, the rest is grouped as *Autres*.

Hover a point or a slice for its figures. Turn the card off with **Settings → Supernovae Tab → Show data panel**.

---

## Home Dashboard — Command links

A navigation link whose **path** starts with `command:` runs an Obsidian command instead of opening a note. A command id has the form `plugin-id:command-id` (list them in the developer console with `Object.keys(app.commands.commands)`), for example `command:obsidian-spaced-repetition:srs-review-flashcards` to open the Spaced Repetition deck dialog. If the plugin that owns the command is disabled, a notice says so.

---

## Home Dashboard — Flashcards badge

Tick **Due** on a navigation link (Settings → Navigation links → Edit) to show the number of flashcards to review on that button, the same figure as the [Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) status bar: cards due today plus new, never-reviewed cards. The badge reads that count straight from the plugin, so the two always agree (like the status bar, it is refreshed when Spaced Repetition synchronises, not on every edit of a note). While the plugin cannot give its count (just after Obsidian starts, or if it is disabled) the badge falls back to an estimate over the notes tagged `#flashcards` or `#flashcards/…`: due cards are read from the `<!--SR:!YYYY-MM-DD,…-->` markers the plugin writes next to each card; new cards are the cards of a note that have no marker yet, counted with the plugin's default syntax (`::`, `:::`, `?`, `??`, `==cloze==`), so it is only an estimate. The badge disappears when there is nothing to review.

---

## Credits

- Inspired by [Beautitab](https://github.com/andrewmcgivery/obsidian-beautitab) by Andrew McGivery (MIT License) — architecture and plugin structure
- Font: [Orbitron](https://fonts.google.com/specimen/Orbitron) via Google Fonts
- Part of the [Nebulux](https://github.com/Sikoso774/nebulux) visual ecosystem

---

## Reporting Issues

Open an issue on [GitHub](https://github.com/Sikoso774/supernovae-tab/issues) with as much detail as possible — Obsidian version, plugin version, and a screenshot if relevant.

---

## License

MIT
