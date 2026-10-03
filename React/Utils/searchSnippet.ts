/**
 * Excerpts for the result list and the Markdown window shown in the preview.
 * No Obsidian import here so they can be checked outside the app.
 */
import {
	FENCE,
	foldText,
	isHeavyFenceLang,
	splitFrontmatter,
	tokenize,
} from "React/Utils/searchText";

/** [start, end) positions in a text. */
export type Range = [number, number];

/** "03 - CONTENTS/04-DATA" -> "03 - CONTENTS › 04-DATA". */
export const breadcrumb = (folder: string): string =>
	folder ? folder.split("/").join(" › ") : "Racine du coffre";

export interface Snippet {
	text: string;
	ranges: Range[];
}

interface Match {
	start: number;
	end: number;
	term: string;
}

const findMatches = (text: string, terms: string[]): Match[] => {
	if (terms.length === 0) return [];
	const wanted = new Set<string>(terms);
	const matches: Match[] = [];
	for (const token of tokenize(foldText(text))) {
		if (wanted.has(token.term)) {
			matches.push({ start: token.start, end: token.end, term: token.term });
		}
	}
	return matches;
};

/** Positions of the matching words in `text` (accents and case ignored). */
export const findRanges = (text: string, terms: string[]): Range[] =>
	findMatches(text, terms).map((m): Range => [m.start, m.end]);

export interface Segment {
	text: string;
	hit: boolean;
}

/** Cuts `text` into plain and highlighted parts. */
export const splitByRanges = (text: string, ranges: Range[]): Segment[] => {
	const segments: Segment[] = [];
	let at = 0;
	for (const [start, end] of ranges) {
		if (start < at) continue;
		if (start > at) segments.push({ text: text.slice(at, start), hit: false });
		segments.push({ text: text.slice(start, end), hit: true });
		at = end;
	}
	if (at < text.length) segments.push({ text: text.slice(at), hit: false });
	return segments;
};

const ELLIPSIS = "…";
const LEAD = 30;
const MAX_MATCHES = 400;

/**
 * About `maxLength` characters of `text` around the densest group of matching
 * words, cut between words. Without any match (the note was found by its title
 * or its tags) it is the beginning of the text.
 */
export const buildSnippet = (
	text: string,
	terms: string[],
	maxLength = 180
): Snippet => {
	const matches = findMatches(text, terms).slice(0, MAX_MATCHES);

	if (matches.length === 0) {
		if (text.length <= maxLength) return { text, ranges: [] };
		const space = text.lastIndexOf(" ", maxLength);
		const end = space > maxLength * 0.6 ? space : maxLength;
		return { text: text.slice(0, end) + ELLIPSIS, ranges: [] };
	}

	// The window that covers the most different words, then the most matches
	let bestFrom = 0;
	let bestFirst = 0;
	let bestLastEnd = 0;
	let bestScore = -1;
	for (let i = 0; i < matches.length; i++) {
		const from = Math.max(0, matches[i].start - LEAD);
		const to = from + maxLength;
		const distinct = new Set<string>();
		let count = 0;
		let lastEnd = matches[i].end;
		for (let j = i; j < matches.length && matches[j].end <= to; j++) {
			distinct.add(matches[j].term);
			count++;
			lastEnd = matches[j].end;
		}
		const score = distinct.size * 1000 + count;
		if (score > bestScore) {
			bestScore = score;
			bestFrom = from;
			bestFirst = matches[i].start;
			bestLastEnd = lastEnd;
		}
	}

	let start = bestFrom;
	if (start > 0) {
		const space = text.indexOf(" ", start);
		if (space !== -1 && space + 1 <= bestFirst) start = space + 1;
	}
	let end = Math.min(text.length, bestFrom + maxLength);
	if (end < text.length) {
		const space = text.lastIndexOf(" ", end);
		if (space > bestLastEnd) end = space;
	}

	const lead = start > 0 ? ELLIPSIS : "";
	const tail = end < text.length ? ELLIPSIS : "";
	const ranges: Range[] = [];
	for (const m of matches) {
		if (m.start >= start && m.end <= end) {
			ranges.push([m.start - start + lead.length, m.end - start + lead.length]);
		}
	}
	return { text: lead + text.slice(start, end) + tail, ranges };
};

export interface Preview {
	markdown: string;
	/** The note goes on after the window. */
	truncated: boolean;
}

export const PREVIEW_MAX = 4000;

const IMAGE = /\.(png|jpe?g|gif|svg|webp|bmp)$/i;
const HEADING = /^\s{0,3}#{1,6}\s+\S/;

// Line kinds: normal text, code (fences included), block of another plugin
const TEXT = 0;
const CODE = 1;
const HEAVY = 2;

/**
 * Markdown window for the preview: it starts at the section title just above
 * the first matching word (or at the top), holds about `PREVIEW_MAX` characters
 * and ends at a blank line. Frontmatter is dropped, blocks of other plugins
 * (TikZ, charts, Dataview...) and note embeds are replaced by a one-line label,
 * so rendering stays light.
 */
export const previewSource = (raw: string, terms: string[]): Preview => {
	const lines = splitFrontmatter(raw).content.split(/\r?\n/);

	const kinds: number[] = [];
	const labels = new Map<number, string>();
	let fence = "";
	let heavy = false;
	lines.forEach((line, i) => {
		const opening = FENCE.exec(line);
		if (opening) {
			if (!fence) {
				fence = opening[1].charAt(0);
				heavy = isHeavyFenceLang(opening[2]);
				if (heavy) labels.set(i, opening[2].toLowerCase());
			} else if (opening[1].charAt(0) === fence) {
				kinds.push(heavy ? HEAVY : CODE);
				fence = "";
				heavy = false;
				return;
			}
			kinds.push(heavy ? HEAVY : CODE);
			return;
		}
		kinds.push(fence ? (heavy ? HEAVY : CODE) : TEXT);
	});

	const wanted = new Set<string>(terms);
	let hitLine = -1;
	if (wanted.size > 0) {
		for (let i = 0; i < lines.length && hitLine === -1; i++) {
			if (kinds[i] === HEAVY) continue;
			for (const token of tokenize(foldText(lines[i]))) {
				if (wanted.has(token.term)) {
					hitLine = i;
					break;
				}
			}
		}
	}

	let first = 0;
	for (let i = Math.max(0, hitLine); i >= 0 && hitLine > 0; i--) {
		if (kinds[i] === TEXT && HEADING.test(lines[i])) {
			first = i;
			break;
		}
	}

	const out: string[] = [];
	let size = 0;
	let lastBlank = -1;
	let truncated = false;
	for (let i = first; i < lines.length; i++) {
		if (kinds[i] === HEAVY) {
			const label = labels.get(i);
			if (label) out.push("", `*(bloc ${label})*`, "");
			continue;
		}
		let line = lines[i];
		if (kinds[i] === TEXT) {
			line = line.replace(
				/!\[\[([^\]|#]+?)(?:[#|][^\]]*)?\]\]/g,
				(all: string, name: string) =>
					IMAGE.test(name) ? all : `*(${name.trim()})*`
			);
		}
		size += line.length + 1;
		if (size > PREVIEW_MAX && out.length > 0) {
			truncated = true;
			if (lastBlank > 0) out.length = lastBlank;
			break;
		}
		if (line.trim() === "") lastBlank = out.length;
		out.push(line);
	}

	// A cut inside a code block would swallow the rest of the preview
	let open = "";
	for (const line of out) {
		const opening = FENCE.exec(line);
		if (!opening) continue;
		if (!open) open = opening[1].charAt(0);
		else if (opening[1].charAt(0) === open) open = "";
	}
	if (open) out.push(open.repeat(3));

	return {
		markdown: out.join("\n") + (truncated ? "\n\n*…*" : ""),
		truncated,
	};
};
