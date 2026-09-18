import { useEffect, useState } from "react";
import { App, EventRef, TFile } from "obsidian";

const REFRESH_DELAY = 500;

/**
 * Recomputes a list derived from the vault only when the vault or the
 * metadata cache changes (debounced), never on plain re-renders.
 */
const useVaultFiles = (
	app: App | undefined,
	compute: (app: App) => TFile[],
	deps: unknown[] = []
): TFile[] => {
	const [files, setFiles] = useState<TFile[]>(() =>
		app ? compute(app) : []
	);

	useEffect(() => {
		if (!app) return;
		let timer: number | null = null;

		const refresh = () => {
			if (timer !== null) window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				timer = null;
				try {
					setFiles(compute(app));
				} catch (e) {
					console.error("Supernovae Tab: failed to list files", e);
				}
			}, REFRESH_DELAY);
		};

		setFiles(compute(app));

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
	}, [app, ...deps]);

	return files;
};

export const getRecentMarkdownFiles = (app: App, limit = 5): TFile[] =>
	app.vault
		.getMarkdownFiles()
		.sort((a, b) => b.stat.mtime - a.stat.mtime)
		.slice(0, limit);

export const getActiveProjects = (app: App): TFile[] =>
	app.vault.getMarkdownFiles().filter((f) => {
		const meta = app.metadataCache.getFileCache(f)?.frontmatter;
		return meta?.Type === "Project" && meta?.status === "active";
	});

export default useVaultFiles;
