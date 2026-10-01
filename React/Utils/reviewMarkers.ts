/**
 * Pure helpers for the "cards to review" counter. They read the scheduling
 * markers the Spaced Repetition plugin appends after each card, e.g.
 * `<!--SR:!2026-10-03,3,250-->` (a cloze can carry several `!date,…` entries).
 * No Obsidian import here so they can be checked outside the app.
 */

/** Default tag of the Spaced Repetition plugin. */
export const FLASHCARD_TAG = "#flashcards";

export const isFlashcardTag = (tag: string): boolean =>
	tag === FLASHCARD_TAG || tag.indexOf(`${FLASHCARD_TAG}/`) === 0;

const MARKER_BLOCK = /<!--SR:([^>]*)-->/g;
const MARKER_ENTRY = /!(\d{4}-\d{2}-\d{2}),\d+,\d+/g;

/** Every scheduled review date (YYYY-MM-DD) found in a note, one per card. */
export const extractReviewDates = (text: string): string[] => {
	const dates: string[] = [];
	const block = new RegExp(MARKER_BLOCK.source, "g");
	let blockMatch: RegExpExecArray | null;
	while ((blockMatch = block.exec(text)) !== null) {
		const entry = new RegExp(MARKER_ENTRY.source, "g");
		let entryMatch: RegExpExecArray | null;
		while ((entryMatch = entry.exec(blockMatch[1])) !== null) {
			dates.push(entryMatch[1]);
		}
	}
	return dates;
};

const FENCE = "`".repeat(3);
const CLOZE = /==[^=]+==/g;

/**
 * Number of cards in a note, following the default Spaced Repetition syntax:
 * `Q::A` (1 card), `Q:::A` (2), `?` and `??` on their own line (1 and 2), and
 * one card per `==highlight==` cloze. Code blocks and quotes are skipped.
 * An estimate: it follows the plugin's defaults, not a custom separator.
 */
export const countCards = (text: string): number => {
	let cards = 0;
	let inCode = false;
	for (const line of text.split("\n")) {
		if (line.indexOf(FENCE) === 0) {
			inCode = !inCode;
			continue;
		}
		if (inCode || line.charAt(0) === ">") continue;
		const trimmed = line.trim();
		if (trimmed === "?") cards += 1;
		else if (trimmed === "??") cards += 2;
		else if (line.indexOf(":::") !== -1) cards += 2;
		else if (line.indexOf("::") !== -1) cards += 1;
		else if (trimmed.charAt(0) !== "#" && trimmed.charAt(0) !== "|") {
			const clozes = line.match(CLOZE);
			if (clozes) cards += clozes.length;
		}
	}
	return cards;
};

/** Cards never reviewed: those of the note that carry no scheduling marker yet. */
export const countNewCards = (text: string, scheduled: number): number =>
	Math.max(0, countCards(text) - scheduled);

/** Cards whose review date is today or earlier. `today` is a YYYY-MM-DD key. */
export const countDue = (dates: string[], today: string): number => {
	let due = 0;
	for (const date of dates) {
		if (date <= today) due++;
	}
	return due;
};
