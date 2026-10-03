/**
 * In-memory inverted index for the New Tab search: every word points to the
 * notes that contain it, with how many times it shows up in the title, the
 * section titles, the tags, the folder and the body. Ranking is BM25 computed
 * per field and weighted by field, queries tolerate accents, prefixes and typos.
 * No Obsidian import here so it can be checked outside the app.
 */
import { foldText, queryTerms, tokenize } from "React/Utils/searchText";

// Field order, shared by the weights, the lengths and the packed counts
const TITLE = 0;
const HEADINGS = 1;
const TAGS = 2;
const FOLDER = 3;
const BODY = 4;
const FIELDS = 5;

const BOOST = [6, 3, 3, 1.5, 1];
const K1 = 1.2;
const B = 0.75;

const WEIGHT_EXACT = 1;
const WEIGHT_PREFIX = 0.6;
const WEIGHT_TYPO = 0.4;
const MAX_QUERY_TERMS = 6;

// Counts of one word in one note, packed in a single number: the body takes the
// low 16 bits, the other four fields 8 bits each (counts are capped)
const UNIT = [65536, 16777216, 4294967296, 1099511627776, 1];
const CAP = [255, 255, 255, 255, 65535];

const pack = (counts: number[]): number => {
	let packed = 0;
	for (let f = 0; f < FIELDS; f++) {
		packed += Math.min(counts[f], CAP[f]) * UNIT[f];
	}
	return packed;
};

const countAt = (packed: number, field: number): number =>
	field === BODY
		? packed % 65536
		: Math.floor(packed / UNIT[field]) % 256;

const rowA = new Int32Array(64);
const rowB = new Int32Array(64);
const rowC = new Int32Array(64);

/**
 * Edit distance (insert, delete, replace, swap of two neighbours) between two
 * words, or `max + 1` as soon as it is known to exceed `max`.
 */
export const boundedDistance = (a: string, b: string, max: number): number => {
	const la = a.length;
	const lb = b.length;
	if (Math.abs(la - lb) > max) return max + 1;
	if (la > 60 || lb > 60) return max + 1;

	let before = rowA;
	let prev = rowB;
	let cur = rowC;
	for (let j = 0; j <= lb; j++) prev[j] = j;
	for (let i = 1; i <= la; i++) {
		cur[0] = i;
		let rowMin = i;
		for (let j = 1; j <= lb; j++) {
			const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
			let value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
			if (
				i > 1 &&
				j > 1 &&
				a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
				a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
			) {
				value = Math.min(value, before[j - 2] + 1);
			}
			cur[j] = value;
			if (value < rowMin) rowMin = value;
		}
		if (rowMin > max) return max + 1;
		const spare = before;
		before = prev;
		prev = cur;
		cur = spare;
	}
	return prev[lb];
};

export interface DocInput {
	path: string;
	title: string;
	/** Section titles, one per line. */
	headings: string;
	/** Tags and MOC, space separated. */
	tags: string;
	/** Readable body text (see `parseNote`). */
	body: string;
	mtime: number;
}

export interface IndexedDoc {
	id: number;
	path: string;
	title: string;
	folder: string;
	mtime: number;
	/** The readable body, kept to build the result's excerpt. */
	text: string;
	titleFolded: string;
	lengths: number[];
	/** Every distinct word of the note, to clean the postings on removal. */
	words: string[];
}

export interface SearchHit {
	id: number;
	path: string;
	title: string;
	folder: string;
	mtime: number;
	score: number;
	/** Words of the index that matched, to highlight them. */
	terms: string[];
}

export interface SearchResult {
	hits: SearchHit[];
	/** No note contains every word: the hits contain some of them. */
	partial: boolean;
}

interface Candidate {
	term: string;
	weight: number;
}

const folderOf = (path: string): string => {
	const slash = path.lastIndexOf("/");
	return slash === -1 ? "" : path.slice(0, slash);
};

export class SearchIndex {
	private docs = new Map<number, IndexedDoc>();
	private idByPath = new Map<string, number>();
	private postings = new Map<string, Map<number, number>>();
	private totals = [0, 0, 0, 0, 0];
	private nextId = 1;

	get size(): number {
		return this.docs.size;
	}

	/** Number of distinct words known to the index. */
	get vocabularySize(): number {
		return this.postings.size;
	}

	clear(): void {
		this.docs.clear();
		this.idByPath.clear();
		this.postings.clear();
		this.totals = [0, 0, 0, 0, 0];
	}

	has(path: string): boolean {
		return this.idByPath.has(path);
	}

	getDoc(id: number): IndexedDoc | undefined {
		return this.docs.get(id);
	}

	/** Adds a note, replacing the previous version of the same path. */
	addDoc(input: DocInput): number {
		this.removePath(input.path);

		const id = this.nextId++;
		const folder = folderOf(input.path);
		const texts = [input.title, input.headings, input.tags, folder, input.body];
		const lengths = [0, 0, 0, 0, 0];
		const counts = new Map<string, number[]>();

		for (let f = 0; f < FIELDS; f++) {
			const tokens = tokenize(foldText(texts[f]));
			lengths[f] = tokens.length;
			this.totals[f] += tokens.length;
			for (const token of tokens) {
				let entry = counts.get(token.term);
				if (!entry) {
					entry = [0, 0, 0, 0, 0];
					counts.set(token.term, entry);
				}
				entry[f]++;
			}
		}

		counts.forEach((entry, term) => {
			let docsOfTerm = this.postings.get(term);
			if (!docsOfTerm) {
				docsOfTerm = new Map<number, number>();
				this.postings.set(term, docsOfTerm);
			}
			docsOfTerm.set(id, pack(entry));
		});

		this.docs.set(id, {
			id,
			path: input.path,
			title: input.title,
			folder,
			mtime: input.mtime,
			text: input.body,
			titleFolded: foldText(input.title),
			lengths,
			words: Array.from(counts.keys()),
		});
		this.idByPath.set(input.path, id);
		return id;
	}

	removePath(path: string): boolean {
		const id = this.idByPath.get(path);
		if (id === undefined) return false;
		const doc = this.docs.get(id);
		if (doc) {
			for (const word of doc.words) {
				const docsOfTerm = this.postings.get(word);
				if (!docsOfTerm) continue;
				docsOfTerm.delete(id);
				if (docsOfTerm.size === 0) this.postings.delete(word);
			}
			for (let f = 0; f < FIELDS; f++) this.totals[f] -= doc.lengths[f];
		}
		this.docs.delete(id);
		this.idByPath.delete(path);
		return true;
	}

	/** Words of the index that a typed word can stand for. */
	private expand(typed: string): Candidate[] {
		// A single letter ("C", "E-R") only matches itself: its prefixes are the whole vocabulary
		if (typed.length === 1) {
			return this.postings.has(typed) ? [{ term: typed, weight: WEIGHT_EXACT }] : [];
		}
		const found: Candidate[] = [];
		const maxDistance = typed.length < 4 ? 0 : typed.length < 8 ? 1 : 2;
		const first = typed.charAt(0);
		this.postings.forEach((_docs, term) => {
			if (term === typed) {
				found.push({ term, weight: WEIGHT_EXACT });
			} else if (term.length > typed.length && term.indexOf(typed) === 0) {
				found.push({ term, weight: WEIGHT_PREFIX });
			} else if (
				maxDistance > 0 &&
				Math.abs(term.length - typed.length) <= maxDistance &&
				term.charAt(0) === first &&
				boundedDistance(typed, term, maxDistance) <= maxDistance
			) {
				found.push({ term, weight: WEIGHT_TYPO });
			}
		});
		return found;
	}

	private fieldScore(doc: IndexedDoc, packed: number, averages: number[]): number {
		let score = 0;
		for (let f = 0; f < FIELDS; f++) {
			const tf = countAt(packed, f);
			if (tf === 0) continue;
			const norm = 1 - B + (B * doc.lengths[f]) / averages[f];
			score += BOOST[f] * ((tf * (K1 + 1)) / (tf + K1 * norm));
		}
		return score;
	}

	search(query: string, limit = 30): SearchResult {
		const typed = queryTerms(query).slice(0, MAX_QUERY_TERMS);
		const total = this.docs.size;
		if (typed.length === 0 || total === 0) return { hits: [], partial: false };

		const averages = this.totals.map((sum) => Math.max(1, sum / total));
		const scores = new Map<number, number>();
		const matched = new Map<number, number>();
		const termsOfDoc = new Map<number, Set<string>>();

		for (const word of typed) {
			// Best contribution of this typed word, per note
			const best = new Map<number, number>();
			for (const candidate of this.expand(word)) {
				const docsOfTerm = this.postings.get(candidate.term);
				if (!docsOfTerm) continue;
				const df = docsOfTerm.size;
				const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
				docsOfTerm.forEach((packed, id) => {
					const doc = this.docs.get(id);
					if (!doc) return;
					const value =
						candidate.weight * idf * this.fieldScore(doc, packed, averages);
					const previous = best.get(id);
					if (previous === undefined || value > previous) best.set(id, value);
					let terms = termsOfDoc.get(id);
					if (!terms) {
						terms = new Set<string>();
						termsOfDoc.set(id, terms);
					}
					terms.add(candidate.term);
				});
			}
			best.forEach((value, id) => {
				scores.set(id, (scores.get(id) || 0) + value);
				matched.set(id, (matched.get(id) || 0) + 1);
			});
		}

		// Every word must be there; if no note has them all, show the best partial matches
		const ids: number[] = [];
		scores.forEach((_score, id) => {
			if (matched.get(id) === typed.length) ids.push(id);
		});
		const partial = ids.length === 0;
		if (partial) scores.forEach((_score, id) => ids.push(id));

		const folded = foldText(query).trim();
		const ranked = ids.map((id) => {
			const doc = this.docs.get(id) as IndexedDoc;
			let score = scores.get(id) || 0;
			// A title that starts with, or contains, what was typed comes first
			const at = doc.titleFolded.indexOf(folded);
			if (at === 0) score *= 1.6;
			else if (at > 0) score *= 1.25;
			return { doc, score, count: matched.get(id) || 0 };
		});
		ranked.sort(
			(a, b) =>
				b.count - a.count || b.score - a.score || b.doc.mtime - a.doc.mtime
		);

		return {
			partial,
			hits: ranked.slice(0, limit).map(({ doc, score }) => ({
				id: doc.id,
				path: doc.path,
				title: doc.title,
				folder: doc.folder,
				mtime: doc.mtime,
				score,
				terms: Array.from(termsOfDoc.get(doc.id) || []),
			})),
		};
	}
}
