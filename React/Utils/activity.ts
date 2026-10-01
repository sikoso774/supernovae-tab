/**
 * Pure helpers for the writing calendar and the day streak. A "day" is a
 * local `YYYY-MM-DD` key; all arithmetic goes through UTC so a daylight-saving
 * change can never skip or repeat a day. No Obsidian import here so they can
 * be checked outside the app.
 */

export type DayCounts = Record<string, number>;

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** Local calendar day of a Date, as YYYY-MM-DD. */
export const toDayKey = (date: Date): string =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const keyToUtc = (key: string): number => {
	const [y, m, d] = key.split("-").map(Number);
	return Date.UTC(y, m - 1, d);
};

const utcToKey = (ms: number): string => {
	const d = new Date(ms);
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const DAY_MS = 86400000;

export const addDays = (key: string, days: number): string =>
	utcToKey(keyToUtc(key) + days * DAY_MS);

/** 0 = Monday … 6 = Sunday. */
export const weekdayIndex = (key: string): number =>
	(new Date(keyToUtc(key)).getUTCDay() + 6) % 7;

/** YYYY-MM-DD prefix of a frontmatter value, or null if it is not a date. */
export const parseDay = (value: unknown): string | null => {
	if (value === null || value === undefined) return null;
	const match = /^\d{4}-\d{2}-\d{2}/.exec(String(value));
	return match ? match[0] : null;
};

export interface StreakStats {
	/** Consecutive days with a note, alive until the end of today. */
	current: number;
	longest: number;
	activeDays: number;
}

export const computeStreaks = (
	counts: DayCounts,
	today: string
): StreakStats => {
	const days = Object.keys(counts)
		.filter((day) => counts[day] > 0)
		.sort();

	// Nothing written yet today does not break yesterday's streak.
	let cursor = counts[today] > 0 ? today : addDays(today, -1);
	let current = 0;
	while (counts[cursor] > 0) {
		current++;
		cursor = addDays(cursor, -1);
	}

	let longest = 0;
	let run = 0;
	let previous: string | null = null;
	for (const day of days) {
		run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
		if (run > longest) longest = run;
		previous = day;
	}

	return { current, longest, activeDays: days.length };
};

/** Total notes created during one calendar year. */
export const yearTotal = (counts: DayCounts, year: string): number => {
	let total = 0;
	for (const day of Object.keys(counts)) {
		if (day.indexOf(year) === 0) total += counts[day];
	}
	return total;
};

/** 0 = empty, then 1..5 — same thresholds as the graph of Home.md. */
export const levelFor = (count: number): number => {
	if (count <= 0) return 0;
	if (count < 2) return 1;
	if (count < 4) return 2;
	if (count < 8) return 3;
	if (count < 15) return 4;
	return 5;
};

export interface CalendarCell {
	day: string;
	count: number;
	level: number;
	/** Outside the displayed range (padding at the edges, or later than today). */
	muted: boolean;
}

export interface CalendarWeek {
	cells: CalendarCell[];
	/** Month name to print above this column, when a new month starts in it. */
	monthLabel: string | null;
}

/**
 * Monday-first columns of 7 days covering [from, to]. Days outside the range
 * are kept (muted) so every column is complete.
 */
export const buildCalendar = (
	counts: DayCounts,
	from: string,
	to: string,
	monthName: (monthIndex: number) => string
): CalendarWeek[] => {
	const weeks: CalendarWeek[] = [];
	let monday = addDays(from, -weekdayIndex(from));
	let lastMonth = -1;

	while (monday <= to) {
		const cells: CalendarCell[] = [];
		let monthLabel: string | null = null;
		for (let i = 0; i < 7; i++) {
			const day = addDays(monday, i);
			const inRange = day >= from && day <= to;
			const count = inRange ? counts[day] || 0 : 0;
			cells.push({ day, count, level: levelFor(count), muted: !inRange });
			if (inRange && monthLabel === null) {
				const month = Number(day.slice(5, 7)) - 1;
				if (month !== lastMonth) {
					monthLabel = monthName(month);
					lastMonth = month;
				}
			}
		}
		weeks.push({ cells, monthLabel });
		monday = addDays(monday, 7);
	}
	return weeks;
};

export type StreakTier = "cold" | "spark" | "flame" | "blaze" | "nova";

export const streakTier = (days: number): StreakTier => {
	if (days >= 100) return "nova";
	if (days >= 30) return "blaze";
	if (days >= 7) return "flame";
	if (days >= 1) return "spark";
	return "cold";
};
