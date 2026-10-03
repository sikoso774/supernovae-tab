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
		// "resolved" fires once the whole vault is indexed (app start, large sync)
		const metaRefs: EventRef[] = [
			app.metadataCache.on("changed", refresh),
			app.metadataCache.on("resolved", refresh),
		];

		return () => {
			if (timer !== null) window.clearTimeout(timer);
			vaultRefs.forEach((ref) => app.vault.offref(ref));
			metaRefs.forEach((ref) => app.metadataCache.offref(ref));
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

export default useVaultFiles;
