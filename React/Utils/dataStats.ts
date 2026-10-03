/**
 * Pure helpers for the "DATA NERDS" card: notes created per month, notes per
 * domain, and the geometry of the line chart and the donut. No Obsidian import
 * here so they can be checked outside the app.
 */
import { DayCounts } from "React/Utils/activity";

export interface MonthTotal {
	/** YYYY-MM */
	month: string;
	label: string;
	total: number;
}

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** Notes created per month over the last `months` months, oldest first. */
export const monthlyTotals = (
	counts: DayCounts,
	today: string,
	monthName: (monthIndex: number) => string,
	months = 12
): MonthTotal[] => {
	const perMonth: Record<string, number> = {};
	for (const day of Object.keys(counts)) {
		const key = day.slice(0, 7);
		perMonth[key] = (perMonth[key] || 0) + counts[day];
	}

	let year = Number(today.slice(0, 4));
	let month = Number(today.slice(5, 7)) - 1;
	const result: MonthTotal[] = [];
	for (let i = 0; i < months; i++) {
		const key = `${year}-${pad(month + 1)}`;
		result.unshift({ month: key, label: monthName(month), total: perMonth[key] || 0 });
		month--;
		if (month < 0) {
			month = 11;
			year--;
		}
	}
	return result;
};

export interface DomainShare {
	name: string;
	count: number;
}

/** "02-Code" -> "Code", "77-MATHS" -> "MATHS", "TryHackMe" -> "TryHackMe". */
export const domainName = (folder: string): string =>
	folder.replace(/^\d+\s*-\s*/, "") || folder;

/**
 * Notes per domain: a domain is the first folder under `root`. The biggest
 * `top` are kept, the others are merged into "Autres".
 */
export const groupByDomain = (
	paths: string[],
	root: string,
	top = 6
): DomainShare[] => {
	const prefix = `${root.replace(/\/+$/, "")}/`;
	const counts: Record<string, number> = {};
	for (const path of paths) {
		if (path.indexOf(prefix) !== 0) continue;
		const rest = path.slice(prefix.length);
		const slash = rest.indexOf("/");
		// A note directly under the root belongs to no domain
		const name = slash === -1 ? "Autres" : domainName(rest.slice(0, slash));
		counts[name] = (counts[name] || 0) + 1;
	}

	const all = Object.keys(counts)
		.map((name) => ({ name, count: counts[name] }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
	const kept = all.filter((d) => d.name !== "Autres").slice(0, top);
	const others = all.reduce(
		(sum, d) => (kept.indexOf(d) === -1 ? sum + d.count : sum),
		0
	);
	return others > 0 ? [...kept, { name: "Autres", count: others }] : kept;
};

export interface Point {
	x: number;
	y: number;
}

/** Points of a line chart in a width x height box, with `padding` around. */
export const linePoints = (
	values: number[],
	width: number,
	height: number,
	padding = 6
): Point[] => {
	const max = Math.max(1, ...values);
	const innerW = width - padding * 2;
	const innerH = height - padding * 2;
	return values.map((value, i) => ({
		x: padding + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
		y: padding + innerH - (value / max) * innerH,
	}));
};

const fmt = (n: number): string => String(Math.round(n * 10) / 10);

export const linePath = (points: Point[]): string =>
	points.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)},${fmt(p.y)}`).join(" ");

/** The line closed down to `baseY`, for the gradient area under it. */
export const areaPath = (points: Point[], baseY: number): string =>
	points.length === 0
		? ""
		: `${linePath(points)} L${fmt(points[points.length - 1].x)},${fmt(baseY)} L${fmt(points[0].x)},${fmt(baseY)} Z`;

export interface DonutArc {
	/** Visible length of the segment along the circle. */
	length: number;
	/** `stroke-dashoffset` that starts the segment at the right place. */
	offset: number;
}

/**
 * Segments of a donut drawn as stroked circles of radius `radius`: each one is
 * `stroke-dasharray = length, circumference` with `stroke-dashoffset = offset`.
 * A small `gap` separates neighbours (not applied to a single segment).
 */
export const donutArcs = (values: number[], radius: number, gap = 2): DonutArc[] => {
	const total = values.reduce((sum, v) => sum + v, 0);
	if (total <= 0) return [];
	const circumference = 2 * Math.PI * radius;
	const spacing = values.length > 1 ? gap : 0;
	let start = 0;
	return values.map((value) => {
		const share = (value / total) * circumference;
		const arc = { length: Math.max(0, share - spacing), offset: -start };
		start += share;
		return arc;
	});
};
