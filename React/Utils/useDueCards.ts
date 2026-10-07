import { useEffect, useRef, useState } from "react";
import { App, EventRef, TFile, getAllTags } from "obsidian";
import {
	countNewCards,
	extractReviewDates,
	isFlashcardTag,
} from "React/Utils/reviewMarkers";
import { isTemplatePath } from "React/Utils/vaultFilters";

// Spaced Repetition rewrites a note after every answer: wait for a calm moment
const REFRESH_DELAY = 1500;

interface CachedNote {
	mtime: number;
	dates: string[];
	fresh: number;
}

export interface DueCards {
	/** Scheduled review date of every card already reviewed once. */
	dates: string[];
	/** Cards never reviewed. */
	fresh: number;
}

const flashcardNotes = (app: App): TFile[] =>
	app.vault.getMarkdownFiles().filter((file) => {
		if (isTemplatePath(file.path)) return false;
		const cache = app.metadataCache.getFileCache(file);
		return !!cache && (getAllTags(cache) ?? []).some(isFlashcardTag);
	});

/**
 * Scheduled review dates and new cards of every flashcard note. A note is read
 * again only when its modification time changes; the caller derives "due
 * today" from the dates, so the count stays right after midnight without any
 * re-read. This is only an estimate (Spaced Repetition's own count is read by
 * `useSrCardCount`): with `enabled` false nothing is read or listened to.
 */
const useDueCards = (app: App | undefined, enabled = true): DueCards => {
	const [cards, setCards] = useState<DueCards>({ dates: [], fresh: 0 });
	const cache = useRef(new Map<string, CachedNote>());

	useEffect(() => {
		if (!app || !enabled) return;
		let timer: number | null = null;
		let disposed = false;

		const refresh = async () => {
			const notes = flashcardNotes(app);
			const known = new Set(notes.map((n) => n.path));
			cache.current.forEach((_, path) => {
				if (!known.has(path)) cache.current.delete(path);
			});

			const dates: string[] = [];
			let fresh = 0;
			for (const note of notes) {
				let entry = cache.current.get(note.path);
				if (!entry || entry.mtime !== note.stat.mtime) {
					const text = await app.vault.cachedRead(note);
					const found = extractReviewDates(text);
					entry = {
						mtime: note.stat.mtime,
						dates: found,
						fresh: countNewCards(text, found.length),
					};
					cache.current.set(note.path, entry);
				}
				dates.push(...entry.dates);
				fresh += entry.fresh;
			}
			if (!disposed) setCards({ dates, fresh });
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
		// "resolved" fires once the whole vault is indexed (app start, large sync)
		const metaRefs: EventRef[] = [
			app.metadataCache.on("changed", onChange),
			app.metadataCache.on("resolved", onChange),
		];

		return () => {
			disposed = true;
			if (timer !== null) window.clearTimeout(timer);
			refs.forEach((ref) => app.vault.offref(ref));
			metaRefs.forEach((ref) => app.metadataCache.offref(ref));
		};
	}, [app, enabled]);

	return cards;
};

export default useDueCards;
