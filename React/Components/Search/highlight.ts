import { findRanges, splitByRanges } from "React/Utils/searchSnippet";

const MAX_MARKS = 300;

/**
 * Wraps the words of `terms` found in the text of `root` in `<mark>`
 * (accents and case ignored) and returns the first one, to scroll to it.
 */
export const highlightTerms = (
	root: HTMLElement,
	terms: string[]
): HTMLElement | null => {
	if (terms.length === 0) return null;

	// Collected first: replacing a node while walking would confuse the walker
	const texts: Text[] = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let node: Node | null;
	while ((node = walker.nextNode()) !== null) {
		const parent = node.parentElement;
		if (parent && parent.closest("mark, script, style")) continue;
		texts.push(node as Text);
	}

	let first: HTMLElement | null = null;
	let marks = 0;
	for (const text of texts) {
		if (marks >= MAX_MARKS) break;
		const ranges = findRanges(text.data, terms);
		if (ranges.length === 0) continue;

		const fragment = document.createDocumentFragment();
		for (const segment of splitByRanges(text.data, ranges)) {
			if (!segment.hit) {
				fragment.appendChild(document.createTextNode(segment.text));
				continue;
			}
			const mark = document.createElement("mark");
			mark.className = "galaxy-hit";
			mark.textContent = segment.text;
			fragment.appendChild(mark);
			marks++;
			if (!first) first = mark;
		}
		text.replaceWith(fragment);
	}
	return first;
};
