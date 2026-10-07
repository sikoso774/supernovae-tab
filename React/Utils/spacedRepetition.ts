/**
 * Reads the number of cards to review straight from the Spaced Repetition
 * plugin, so the badge shows exactly the figure of its status bar. Spaced
 * Repetition parses every note with its own parser and keeps the result in
 * `osrCore.remainingDeckTree` (due + new cards, minus those already answered);
 * the status bar reads the same tree. No Obsidian import here (structural types
 * only) so this can be checked outside the app.
 */

const SR_PLUGIN_ID = "obsidian-spaced-repetition";

/** Spaced Repetition's `RepItemType.AnyItem`: due and new cards together. */
const ANY_ITEM = 2;

interface SrDeck {
	getRepItemCount(itemType: number, includeSubdecks: boolean): number;
}

interface SrPlugin {
	dataManager?: {
		osrCore?: { remainingDeckTree?: SrDeck | null } | null;
	};
}

interface AppWithPlugins {
	plugins?: { plugins?: Record<string, unknown> };
}

/**
 * Cards to review according to Spaced Repetition (due today + never reviewed),
 * or `null` when its figure is not available: plugin missing or disabled, not
 * synchronised yet (just after Obsidian starts), or an internal change in a
 * later version of the plugin. The caller then falls back to its own estimate.
 */
export const readSrCardCount = (app: unknown): number | null => {
	try {
		const plugin = (app as AppWithPlugins).plugins?.plugins?.[SR_PLUGIN_ID] as
			| SrPlugin
			| undefined;
		const tree = plugin?.dataManager?.osrCore?.remainingDeckTree;
		if (!tree || typeof tree.getRepItemCount !== "function") return null;
		const count = tree.getRepItemCount(ANY_ITEM, true);
		return typeof count === "number" && Number.isFinite(count) && count >= 0
			? count
			: null;
	} catch {
		return null;
	}
};
