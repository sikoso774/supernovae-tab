/**
 * Text helpers for the New Tab search: accent-free folding, tokenizing and the
 * conversion of a note's Markdown into the plain pieces that get indexed. No
 * Obsidian import here so they can be checked outside the app.
 */

const DIACRITICS = /[̀-ͯ]/g;
const foldCache = new Map<string, string>();

const foldChar = (ch: string): string => {
	let folded = foldCache.get(ch);
	if (folded === undefined) {
		folded = ch.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
		if (folded.length !== 1) {
			// Keep the length: a character that would grow or vanish stays as it is
			const lower = ch.toLowerCase();
			folded = lower.length === 1 ? lower : ch;
		}
		foldCache.set(ch, folded);
	}
	return folded;
};

/**
 * Lowercase and accent-free text of exactly the same length, so a position in
 * the folded text is also the position in the original ("Modélisation" and
 * "modelisation" fold to the same word).
 */
export const foldText = (text: string): string => {
	let out = "";
	let runStart = 0;
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) < 128) continue;
		out += text.slice(runStart, i).toLowerCase() + foldChar(text.charAt(i));
		runStart = i + 1;
	}
	return out + text.slice(runStart).toLowerCase();
};

const isWordCode = (code: number): boolean => {
	if ((code >= 48 && code <= 57) || (code >= 97 && code <= 122)) return true;
	if (code < 0xc0) return false;
	// Latin-1 operators, general punctuation, arrows / symbols, CJK punctuation,
	// surrogates (emoji) and variation selectors separate words
	if (code === 0xd7 || code === 0xf7) return false;
	if (code >= 0x2000 && code <= 0x2bff) return false;
	if (code >= 0x3000 && code <= 0x303f) return false;
	if (code >= 0xd800 && code <= 0xdfff) return false;
	if (code >= 0xfe00 && code <= 0xfe0f) return false;
	return true;
};

export interface Token {
	term: string;
	start: number;
	end: number;
}

const MIN_TERM = 1;
const MAX_TERM = 40;

/** Words of an already folded text, with their position in it. */
export const tokenize = (folded: string): Token[] => {
	const tokens: Token[] = [];
	let start = -1;
	for (let i = 0; i <= folded.length; i++) {
		const inWord = i < folded.length && isWordCode(folded.charCodeAt(i));
		if (inWord) {
			if (start === -1) start = i;
		} else if (start !== -1) {
			const length = i - start;
			if (length >= MIN_TERM && length <= MAX_TERM) {
				tokens.push({ term: folded.slice(start, i), start, end: i });
			}
			start = -1;
		}
	}
	return tokens;
};

/** Distinct words of a typed query. */
export const queryTerms = (query: string): string[] => {
	const terms: string[] = [];
	for (const token of tokenize(foldText(query))) {
		if (terms.indexOf(token.term) === -1) terms.push(token.term);
	}
	return terms;
};

/** Blocks that are code for another plugin: noise in a search, heavy in a preview. */
const HEAVY_LANGS = [
	"tikz",
	"chart",
	"advanced-chart",
	"dataview",
	"dataviewjs",
	"excalidraw",
	"compressed-json",
];

export const isHeavyFenceLang = (lang: string): boolean =>
	HEAVY_LANGS.indexOf(lang.toLowerCase()) !== -1;

/** An opening or closing code fence, also inside a callout: [1] the fence characters, [2] the language. */
export const FENCE = /^\s*(?:>\s*)*(`{3,}|~{3,})\s*([^\s`]*)/;
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export interface SplitNote {
	/** YAML text between the `---` lines ("" if none). */
	frontmatter: string;
	/** The note without its frontmatter. */
	content: string;
}

export const splitFrontmatter = (raw: string): SplitNote => {
	const match = FRONTMATTER.exec(raw);
	if (!match) return { frontmatter: "", content: raw };
	return { frontmatter: match[1], content: raw.slice(match[0].length) };
};

/** `tags:` (list, `[a, b]` or `a, b`) and `MOC:` of a frontmatter block. */
export const frontmatterTags = (frontmatter: string): string[] => {
	const tags: string[] = [];
	const lines = frontmatter.split(/\r?\n/);
	let inTags = false;
	for (const line of lines) {
		const key = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
		if (key) {
			const name = key[1].toLowerCase();
			inTags = name === "tags" || name === "tag";
			const value = key[2].trim();
			if (inTags && value) {
				value
					.replace(/^\[|\]$/g, "")
					.split(",")
					.forEach((tag) => tags.push(tag));
			} else if (name === "moc" && value) {
				tags.push(value);
			}
		} else if (inTags) {
			const item = /^\s*-\s+(.*)$/.exec(line);
			if (item) tags.push(item[1]);
		}
	}
	return tags
		.map((tag) => tag.replace(/\[\[|\]\]|["'#]/g, "").trim())
		.filter((tag) => tag.length > 0);
};

/** `Drawing.excalidraw.md`: the drawing data is JSON, only its texts are readable. */
export const isExcalidrawPath = (path: string): boolean =>
	/\.excalidraw(\.md)?$/i.test(path);

const TEXT_ELEMENTS = "## Text Elements";

/** The texts of a drawing (its `## Text Elements` section), one per block. */
export const excalidrawBlocks = (raw: string): string[] => {
	const marker = raw.indexOf(TEXT_ELEMENTS);
	if (marker === -1) return [];
	const rest = raw.slice(marker + TEXT_ELEMENTS.length);
	// The section ends at the next heading or at the closing %% of the data block
	const end = rest.search(/\r?\n(?:## |%%)/);
	const section = end === -1 ? rest : rest.slice(0, end);
	return section
		.split(/\r?\n\r?\n/)
		.map((block) => block.replace(/\s*\^[\w-]+\s*$/, "").trim())
		.filter((block) => block.length > 0);
};

export interface ParsedNote {
	/** Section titles, one per line. */
	headings: string;
	/** Frontmatter tags, MOC and inline `#tags`, space separated. */
	tags: string;
	/** Readable text: Markdown syntax and noisy blocks removed, one line. */
	body: string;
}

// `#tag`: no space after the #, and not only digits ("#1", "#2024")
const INLINE_TAG = /(^|[\s(])#([^\s#.,;:!?()[\]{}"'<>`]*[^\s#.,;:!?()[\]{}"'<>`\d][^\s#.,;:!?()[\]{}"'<>`]*)/g;

/** Plain text of a Markdown line: links, emphasis and structure marks removed. */
export const plainText = (line: string): string =>
	line
		.replace(/!\[\[[^\]]*\]\]/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
		.replace(/\[\[([^\]]*)\]\]/g, (_all, target: string) =>
			target.replace(/[#^]/g, " ")
		)
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/https?:\/\/\S+/g, " ")
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/<[^>\n]+>/g, " ")
		.replace(/^\s{0,3}#{1,6}\s+/, "")
		.replace(/^(\s*>\s?)+/, "")
		.replace(/\[![\w/-]+\][+-]?/g, " ")
		.replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, "")
		.replace(/^\s*\|?[\s:|-]+\|?\s*$/, " ")
		.replace(/[|*`~]|__/g, " ");

/**
 * Splits a note into what the search indexes: its section titles, its tags and
 * a readable body. Frontmatter, SR markers, comments, images, links' targets and
 * the blocks of other plugins (TikZ, charts, Dataview...) never reach the index.
 */
export const parseNote = (raw: string): ParsedNote => {
	const { frontmatter, content } = splitFrontmatter(raw);
	const tags = frontmatterTags(frontmatter);
	const headings: string[] = [];
	const body: string[] = [];

	let fence = "";
	let skipping = false;
	// Multi-line comments (SR markers are single-line, but others may not be)
	const text = content.replace(/<!--[\s\S]*?-->/g, " ");
	for (const line of text.split(/\r?\n/)) {
		const opening = FENCE.exec(line);
		if (opening) {
			const mark = opening[1];
			if (!fence) {
				fence = mark.charAt(0);
				skipping = isHeavyFenceLang(opening[2]);
			} else if (mark.charAt(0) === fence) {
				fence = "";
				skipping = false;
			}
			continue;
		}
		if (skipping) continue;

		if (!fence) {
			const heading = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
			if (heading) headings.push(plainText(heading[1]));
			let tag: RegExpExecArray | null;
			INLINE_TAG.lastIndex = 0;
			while ((tag = INLINE_TAG.exec(line)) !== null) tags.push(tag[2]);
		}
		body.push(fence ? line : plainText(line));
	}

	return {
		headings: headings.join("\n"),
		tags: tags.join(" "),
		body: body.join(" ").replace(/\s+/g, " ").trim(),
	};
};
