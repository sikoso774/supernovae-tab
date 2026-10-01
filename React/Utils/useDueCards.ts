import { useEffect, useRef, useState } from "react";
import { App, EventRef, TFile, getAllTags } from "obsidian";
import { extractReviewDates, isFlashcardTag } from "React/Utils/reviewMarkers";
import { isTemplatePath } from "React/Utils/vaultFilters";

// Spaced Repetition rewrites a note after every answer: wait for a calm moment
const REFRESH_DELAY = 1500;

interface CachedNote {
	mtime: number;
	dates: string[];
}

const flashcardNotes = (app: App): TFile[] =>
	app.vault.getMarkdownFiles().filter((file) => {
		if (isTemplatePath(file.path)) return false;
		const cache = app.metadataCache.getFileCache(file);
		return !!cache && (getAllTags(cache) ?? []).some(isFlashcardTag);
	});

/**
 * Scheduled review dates of every flashcard note. A note is read again only
 * when its modification time changes; the caller derives "due today" from the
 * dates, so the count stays right after midnight without any re-read.
 */
const useDueCards = (app: App | undefined): string[] => {
	const [dates, setDates] = useState<string[]>([]);
	const cache = useRef(new Map<string, CachedNote>());

	useEffect(() => {
		if (!app) return;
		let timer: number | null = null;
		let disposed = false;

		const refresh = async () => {
			const notes = flashcardNotes(app);
			const known = new Set(notes.map((n) => n.path));
			cache.current.forEach((_, path) => {
				if (!known.has(path)) cache.current.delete(path);
			});

			const all: string[] = [];
			for (const note of notes) {
				const cached = cache.current.get(note.path);
				if (cached && cached.mtime === note.stat.mtime) {
					all.push(...cached.dates);
					continue;
				}
				const found = extractReviewDates(
					await app.vault.cachedRead(note)
				);
				cache.current.set(note.path, {
					mtime: note.stat.mtime,
					dates: found,
				});
				all.push(...found);
			}
			if (!disposed) setDates(all);
		};

		const schedule = (delay: number) => {
			if (timer !== null) window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				timer = null;
				refresh().catch((e) =>
					console.error("Supernovae Tab: failed to count due cards", e)
				);
			}, delay);
		};
		const onChange = () => schedule(REFRESH_DELAY);

		schedule(0);

		const refs: EventRef[] = [
			app.vault.on("modify", onChange),
			app.vault.on("create", onChange),
			app.vault.on("delete", onChange),
			app.vault.on("rename", onChange),
		];
		const metaRef = app.metadataCache.on("changed", onChange);

		return () => {
			disposed = true;
			if (timer !== null) window.clearTimeout(timer);
			refs.forEach((ref) => app.vault.offref(ref));
			app.metadataCache.offref(metaRef);
		};
	}, [app]);

	return dates;
};

export default useDueCards;
