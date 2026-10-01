import { App } from "obsidian";
import { DayCounts, parseDay } from "React/Utils/activity";
import { isTemplatePath } from "React/Utils/vaultFilters";
import { useVaultValue } from "React/Utils/useVaultFiles";

const REFRESH_DELAY = 1000;

// Same rule as the writing graph of Home.md: one note = one contribution on
// the day given by its `Date`, `created` or `création` property.
const DATE_KEYS = ["date", "created", "création"];

const noteDay = (frontmatter: Record<string, unknown>): string | null => {
	for (const wanted of DATE_KEYS) {
		for (const key of Object.keys(frontmatter)) {
			if (key.toLowerCase() === wanted) {
				const day = parseDay(frontmatter[key]);
				if (day) return day;
			}
		}
	}
	return null;
};

export const countNotesPerDay = (app: App): DayCounts => {
	const counts: DayCounts = {};
	for (const file of app.vault.getMarkdownFiles()) {
		if (isTemplatePath(file.path) || file.basename === "Home") continue;
		const meta = app.metadataCache.getFileCache(file)?.frontmatter;
		if (!meta) continue;
		const day = noteDay(meta);
		if (day) counts[day] = (counts[day] || 0) + 1;
	}
	return counts;
};

/** Notes created per day, read from the metadata cache only (no file reads). */
const useWritingActivity = (app: App | undefined): DayCounts =>
	useVaultValue<DayCounts>(app, countNotesPerDay, {}, REFRESH_DELAY);

export default useWritingActivity;
