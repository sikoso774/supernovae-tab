import { useCallback, useEffect, useState } from "react";
import { App, Notice, TFile } from "obsidian";

/**
 * Link with the "SR Review Log" plugin (sr-review-log), which journals every
 * answer given in Spaced Repetition. That plugin computes the figures
 * (`getStats()`); this side only draws them, so nothing is parsed twice. No
 * Obsidian state is needed beyond the app handle: when the plugin is missing or
 * too old, everything here answers `null` and the home band stays hidden.
 */

const LOG_PLUGIN_ID = "sr-review-log";
const UPDATED_EVENT = "sr-review-log:updated";
const OPEN_STATS_COMMAND = "sr-review-log:open-stats";
const SR_REVIEW_COMMAND = "obsidian-spaced-repetition:srs-review-flashcards";

export interface ReviewDay {
	d: string;
	total: number;
	easy: number;
	good: number;
	hard: number;
	again: number;
}

export interface ReviewDeck {
	name: string;
	/** Tag path to open in Spaced Repetition, e.g. "flashcards/uml". */
	path: string;
	n: number;
	/** Percentage of Good + Easy answers. */
	rate: number;
	easy: number;
	good: number;
	hard: number;
	again: number;
}

export interface TrickyCard {
	q: string;
	file: string;
	line: number | null;
	n: number;
	again: number;
	hard: number;
}

export interface ReviewStats {
	version: number;
	today: string;
	goal: number;
	total: number;
	todayStats: {
		total: number;
		fresh: number;
		easy: number;
		good: number;
		hard: number;
		again: number;
	};
	days: ReviewDay[];
	streak: number;
	rate7: number | null;
	rate30: number | null;
	decks: ReviewDeck[];
	tricky: TrickyCard[];
}

interface LogPlugin {
	getStats?: (opts?: { days?: number }) => Promise<ReviewStats>;
}

interface AppLike {
	plugins?: { plugins?: Record<string, unknown> };
	workspace: {
		on: (name: string, cb: () => void) => unknown;
		offref: (ref: unknown) => void;
	};
}

const logPlugin = (app: unknown): LogPlugin | null => {
	const plugin = (app as AppLike).plugins?.plugins?.[LOG_PLUGIN_ID] as
		| LogPlugin
		| undefined;
	return plugin && typeof plugin.getStats === "function" ? plugin : null;
};

const REFRESH_WHEN_MISSING = 3000;
// The journal can also change without an answer here (a Git pull of the phone's journal)
const REFRESH_SLOW = 60000;

/**
 * Review figures for the home band, or `null` while the plugin is not there.
 * Follows the plugin's own "updated" event (an answer given, a setting
 * changed), and looks for the plugin again while it is missing, since it may
 * load after the home page.
 */
const useReviewStats = (app: App | undefined, today: string): ReviewStats | null => {
	const [stats, setStats] = useState<ReviewStats | null>(null);

	useEffect(() => {
		if (!app) return;
		let alive = true;
		let timer = 0;
		let eventRef: unknown = null;

		const load = async () => {
			const plugin = logPlugin(app);
			if (!plugin) {
				if (alive) setStats(null);
				timer = window.setTimeout(load, REFRESH_WHEN_MISSING);
				return;
			}
			if (!eventRef) {
				eventRef = (app as unknown as AppLike).workspace.on(
					UPDATED_EVENT,
					() => void load()
				);
			}
			try {
				const next = await plugin.getStats?.({ days: 14 });
				if (alive && next) setStats(next);
			} catch (e) {
				console.warn("[supernovae-tab] review stats", e);
			}
			window.clearTimeout(timer);
			timer = window.setTimeout(load, REFRESH_SLOW);
		};

		void load();
		return () => {
			alive = false;
			window.clearTimeout(timer);
			if (eventRef) (app as unknown as AppLike).workspace.offref(eventRef);
		};
		// `today`: the day changes at midnight, the figures with it
	}, [app, today]);

	return stats;
};

export default useReviewStats;

/** Opens the plugin's "Review Stats" view (a new tab, or the one that exists). */
export const useOpenReviewStats = (app: App | undefined) =>
	useCallback(() => {
		void (app as unknown as {
			commands: { executeCommandById: (id: string) => boolean };
		})?.commands.executeCommandById(OPEN_STATS_COMMAND);
	}, [app]);

/** Opens `file` in a tab of its own, scrolled to `line` when it is known. */
export const openCardAt = (
	app: App | undefined,
	path: string,
	line: number | null
): void => {
	const file = app?.vault.getAbstractFileByPath(path);
	if (!app || !(file instanceof TFile)) {
		new Notice(`Note introuvable : ${path}`);
		return;
	}
	const state = typeof line === "number" ? { eState: { line } } : undefined;
	void app.workspace.getLeaf("tab").openFile(file, state);
};

const rowName = (row: Element): string =>
	row.querySelector(":scope > .tree-item-self .tag-pane-tag-self")?.textContent ?? "";

const subRows = (row: Element): Element[] =>
	Array.from(
		row.querySelector(":scope > .tree-item-children")?.children ?? []
	).filter((el) => el.classList.contains("sr-tree-row"));

const WAIT_STEP = 100;
// Spaced Repetition parses every note before it shows its list: a few seconds on a big vault
const WAIT_MAX = 25000;

/**
 * Starts the Spaced Repetition review of one deck. Spaced Repetition has no
 * call for it (the choice of the deck happens inside its own window), so this
 * opens its window like the "Révision" button does, waits for the list of
 * decks and presses the row of the deck, which is what a click does.
 * Resolves `false` when the row was not found, e.g. when Spaced Repetition went
 * straight to the cards because only one deck had some.
 */
export const reviewDeck = (app: App | undefined, deckPath: string): Promise<boolean> => {
	const parts = deckPath.split("/").filter(Boolean);
	if (!app || parts.length === 0) return Promise.resolve(false);
	const commands = (app as unknown as {
		commands: { executeCommandById: (id: string) => boolean };
	}).commands;

	// Rows of a deck list that is on screen (a window of Spaced Repetition is already open)
	const shownTopRows = () =>
		Array.from(document.querySelectorAll(".sr-tree-row")).filter(
			(row) =>
				!row.parentElement?.classList.contains("tree-item-children") &&
				(row as HTMLElement).offsetParent !== null
		);
	if (shownTopRows().length === 0) commands.executeCommandById(SR_REVIEW_COMMAND);

	return new Promise((resolve) => {
		let waited = 0;
		const look = () => {
			const top = shownTopRows();
			if (top.length > 0) {
				let level = top;
				let row: Element | undefined;
				for (const part of parts) {
					row = level.find((r) => rowName(r) === part);
					if (!row) return resolve(false);
					level = subRows(row);
				}
				const self = row?.querySelector(":scope > .tree-item-self") as HTMLElement | null;
				if (!self) return resolve(false);
				if (self.classList.contains("is-disabled")) {
					new Notice(`Aucune carte à réviser dans « ${parts[parts.length - 1]} »`);
					return resolve(false);
				}
				self.click();
				return resolve(true);
			}
			waited += WAIT_STEP;
			if (waited >= WAIT_MAX) return resolve(false);
			window.setTimeout(look, WAIT_STEP);
		};
		window.setTimeout(look, WAIT_STEP);
	});
};
