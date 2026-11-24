/**
 * Grid of the Home dashboard for whichever blocks are shown. Three columns
 * (left, centre, right) and up to three rows: the header (buttons, clock, date)
 * and two rows of cards. A column with one card gives it both rows, a column
 * with two shares them; the reviews band, when shown, takes the last row under
 * the centre and right columns. No Obsidian import here so it can be checked
 * outside the app.
 */

export interface HomeBlocks {
	tabs: boolean;
	clock: boolean;
	date: boolean;
	groups: boolean;
	recent: boolean;
	activity: boolean;
	data: boolean;
	reviews: boolean;
}

export interface HomeLayout {
	/** One string per row, e.g. "tabs clock date" (CSS `grid-template-areas`). */
	areas: string[];
	/** CSS `grid-template-rows`. */
	rows: string;
}

const EMPTY = ".";
const FLEX = "minmax(0, 1fr)";

/** The two card rows of a column holding `cards` (already filtered to the shown ones). */
const split = (cards: string[]): [string, string] => {
	if (cards.length === 0) return [EMPTY, EMPTY];
	if (cards.length === 1) return [cards[0], cards[0]];
	return [cards[0], cards[1]];
};

export const buildHomeLayout = (blocks: HomeBlocks): HomeLayout => {
	const header = [
		blocks.tabs ? "tabs" : EMPTY,
		blocks.clock ? "clock" : EMPTY,
		blocks.date ? "date" : EMPTY,
	];
	const hasHeader = header.some((cell) => cell !== EMPTY);

	const left = [blocks.groups ? "groups" : "", blocks.recent ? "recent" : ""].filter(Boolean);
	const [leftTop, leftBottom] = split(left);

	const areas: string[] = [];
	const rows: string[] = [];
	if (hasHeader) {
		areas.push(header.join(" "));
		rows.push("auto");
	}

	if (blocks.reviews) {
		const middleShown = blocks.activity || blocks.data;
		if (middleShown) {
			// The calendar and the data card keep one row, the band takes the next
			areas.push(
				[leftTop, blocks.activity ? "activity" : EMPTY, blocks.data ? "data" : EMPTY].join(" ")
			);
			areas.push([leftBottom, "reviews", "reviews"].join(" "));
			rows.push("auto", FLEX);
		} else {
			areas.push([leftTop, "reviews", "reviews"].join(" "));
			areas.push([leftBottom, "reviews", "reviews"].join(" "));
			rows.push(FLEX, FLEX);
		}
	} else {
		const centre = blocks.activity ? "activity" : EMPTY;
		const right = blocks.data ? "data" : EMPTY;
		areas.push([leftTop, centre, right].join(" "));
		areas.push([leftBottom, centre, right].join(" "));
		rows.push(FLEX, FLEX);
	}

	return { areas, rows: rows.join(" ") };
};
