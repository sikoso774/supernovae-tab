import { useEffect, useState } from "react";
import { App, EventRef, TFile } from "obsidian";
import { isScaffoldingNote } from "React/Utils/vaultFilters";

const REFRESH_DELAY = 500;

/**
 * Recomputes a value derived from the vault only when the vault or the
 * metadata cache changes (debounced), never on plain re-renders.
 */
export const useVaultValue = <T>(
	app: App | undefined,
	compute: (app: App) => T,
	initial: T,
	delay = REFRESH_DELAY,
	deps: unknown[] = []
): T => {
	const [value, setValue] = useState<T>(() =>
		app ? compute(app) : initial
	);

	useEffect(() => {
		if (!app) return;
		let timer: number | null = null;

		const refresh = () => {
			if (timer !== null) window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				timer = null;
				try {
					setValue(compute(app));
				} catch (e) {
					console.error("Supernovae Tab: failed to read the vault", e);
				}
			}, delay);
		};

		setValue(compute(app));

		const vaultRefs: EventRef[] = [
			app.vault.on("create", refresh),
			app.vault.on("delete", refresh),
			app.vault.on("rename", refresh),
			app.vault.on("modify", refresh),
		];
		const metaRef = app.metadataCache.on("changed", refresh);

		return () => {
			if (timer !== null) window.clearTimeout(timer);
			vaultRefs.forEach((ref) => app.vault.offref(ref));
			app.metadataCache.offref(metaRef);
		};
	}, [app, delay, ...deps]);

	return value;
};

const useVaultFiles = (
	app: App | undefined,
	compute: (app: App) => TFile[],
	deps: unknown[] = []
): TFile[] => useVaultValue(app, compute, [], REFRESH_DELAY, deps);

export const getRecentMarkdownFiles = (app: App, limit = 5): TFile[] =>
	app.vault
		.getMarkdownFiles()
		.filter((f) => !isScaffoldingNote(f))
		.sort((a, b) => b.stat.mtime - a.stat.mtime)
		.slice(0, limit);

// Frontmatter keys are matched case-insensitively (`Status` and `status` both occur)
const frontmatterValue = (
	meta: Record<string, unknown>,
	key: string
): unknown => {
	for (const k of Object.keys(meta)) {
		if (k.toLowerCase() === key) return meta[k];
	}
	return undefined;
};

// "🟠 En cours" -> "en cours": drop emoji and punctuation, keep letters
const normalize = (value: unknown): string =>
	String(value ?? "")
		.toLowerCase()
		.replace(/[^a-zà-ÿ ]/g, "")
		.trim();

const PROJECT_TYPES = ["project", "projet"];
const ACTIVE_STATUSES = ["active", "actif", "en cours"];

// Deliberately tied to a project `Type`: plenty of course notes carry
// `status: En cours` and must not flood the list.
export const getActiveProjects = (app: App): TFile[] =>
	app.vault.getMarkdownFiles().filter((f) => {
		const meta = app.metadataCache.getFileCache(f)?.frontmatter;
		if (!meta) return false;
		return (
			PROJECT_TYPES.indexOf(normalize(frontmatterValue(meta, "type"))) !==
				-1 &&
			ACTIVE_STATUSES.indexOf(
				normalize(frontmatterValue(meta, "status"))
			) !== -1
		);
	});

export default useVaultFiles;
