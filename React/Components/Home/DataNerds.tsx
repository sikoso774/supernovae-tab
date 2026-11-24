import React, { useCallback, useMemo, useState } from "react";
import { useObsidian } from "../../Context/ObsidianAppContext";
import { DayCounts } from "React/Utils/activity";
import {
	areaPath,
	donutArcs,
	linePath,
	linePoints,
	monthlyTotals,
} from "React/Utils/dataStats";
import useDomainCounts from "React/Utils/useDomainCounts";
import { ReviewSettings, ReviewStats } from "React/Utils/reviewStats";
import GoalMenu from "./GoalMenu";
import useToday from "React/Utils/useToday";

const LINE_W = 300;
const LINE_H = 118;
const LINE_PAD = 10;
const LABEL_BAND = 16;

const DONUT_R = 36;
const DONUT_STROKE = 15;

// Nebula palette, same family as the calendar; the last colour is for "Autres"
const PALETTE = ["#7c5cff", "#5678ff", "#3ca5ff", "#46dcf0", "#4ad6a8", "#f0a85c"];
const OTHERS_COLOR = "#6f7fb0";

const monthName = (monthIndex: number): string =>
	new Date(2000, monthIndex, 1).toLocaleDateString("fr-FR", { month: "short" });

const monthTitle = (key: string): string => {
	const [y, m] = key.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
		month: "long",
		year: "numeric",
	});
};

const plural = (n: number): string => (n > 1 ? "notes" : "note");

const BARS_CHOICES = [7, 14, 30];

const parseDay = (key: string): Date => {
	const [y, m, d] = key.split("-").map(Number);
	return new Date(y, m - 1, d, 12);
};

const longDay = (key: string): string =>
	parseDay(key).toLocaleDateString("fr-FR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

/** What the review curve needs from the Home page. */
export interface ReviewCurveProps {
	stats: ReviewStats;
	onSettings: (patch: Partial<ReviewSettings>) => void;
}

/**
 * Answers given in Spaced Repetition, one point per day over the chosen period
 * (7, 14 or 30 days), with the daily goal as a dashed line. Same drawing as the
 * notes curve; the figures come from the SR Review Log plugin.
 */
const ReviewCurve = ({
	stats,
	onSettings,
	onEditGoal,
}: ReviewCurveProps & { onEditGoal: () => void }) => {
	const days = stats.days;
	const totals = days.map((d) => d.total);
	const goals = days.map((d) => d.goal ?? stats.goal);
	const sum = totals.reduce((a, b) => a + b, 0);
	const top = Math.max(1, ...totals, ...goals);

	const chartH = LINE_H - LABEL_BAND;
	const xs = linePoints(totals, LINE_W, chartH, LINE_PAD).map((p) => p.x);
	const yOf = (v: number) => LINE_PAD + (chartH - LINE_PAD * 2) * (1 - v / top);
	const points = totals.map((v, i) => ({ x: xs[i], y: yOf(v) }));
	const goalPoints = goals.map((g, i) => ({ x: xs[i], y: yOf(g) }));
	// Label from the right so today is always shown and the spacing stays even
	const step = days.length <= 7 ? 1 : days.length <= 14 ? 3 : 7;

	return (
		<div className="data-block">
			<div className="data-caption">
				<span>Révisions par jour</span>
				<span className="data-figure">{sum}</span>
			</div>
			<div className="data-sub">
				<span className="rev-range" title="Nombre de jours affichés">
					{BARS_CHOICES.map((n) => (
						<a
							key={n}
							className={n === days.length ? "is-on" : ""}
							onClick={() => onSettings({ barsDays: n })}
						>
							{n} j
						</a>
					))}
				</span>
				<a
					className="rev-hint rev-goal-edit"
					data-rev-goal-trigger=""
					onClick={onEditGoal}
					title="Régler l'objectif quotidien"
				>
					objectif {stats.goal} ✎
				</a>
			</div>
			{stats.total === 0 ? (
				<div className="data-empty">
					Fais une session de flashcards : chaque réponse apparaîtra ici.
				</div>
			) : (
				<svg
					className="data-line is-clickable"
					viewBox={`0 0 ${LINE_W} ${LINE_H}`}
					role="img"
					aria-label={`Réponses de révision par jour sur ${days.length} jours`}
					data-rev-goal-trigger=""
					onClick={onEditGoal}
				>
					<defs>
						<linearGradient id="data-area-fill-rev" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="#5b8cff" stopOpacity="0.55" />
							<stop offset="100%" stopColor="#5b8cff" stopOpacity="0" />
						</linearGradient>
					</defs>
					{[0, 0.5, 1].map((ratio) => (
						<line
							key={ratio}
							className="data-grid"
							x1={LINE_PAD}
							x2={LINE_W - LINE_PAD}
							y1={LINE_PAD + (chartH - LINE_PAD * 2) * ratio}
							y2={LINE_PAD + (chartH - LINE_PAD * 2) * ratio}
						/>
					))}
					<path
						className="data-area data-area--rev"
						d={areaPath(points, chartH - LINE_PAD)}
					/>
					<path className="data-goal" d={linePath(goalPoints)} />
					<path className="data-stroke" d={linePath(points)} />
					{points.map((p, i) => (
						<circle
							key={days[i].d}
							className={`data-dot${totals[i] >= goals[i] && totals[i] > 0 ? " is-goal" : ""}`}
							cx={p.x}
							cy={p.y}
							r={i === points.length - 1 ? 3.6 : days.length > 14 ? 1.8 : 2.4}
						>
							<title>{`${longDay(days[i].d)} — ${totals[i]} réponse${totals[i] > 1 ? "s" : ""} sur ${goals[i]}`}</title>
						</circle>
					))}
					{points.map((p, i) =>
						(points.length - 1 - i) % step === 0 ? (
							<text
								key={`l-${days[i].d}`}
								className="data-axis"
								x={p.x}
								y={LINE_H - 3}
								textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
							>
								{parseDay(days[i].d).getDate()}
							</text>
						) : null
					)}
					<text className="data-axis" x={LINE_PAD} y={LINE_PAD - 1} textAnchor="start">
						max {top}
					</text>
				</svg>
			)}
		</div>
	);
};

/**
 * "DATA NERDS" card: notes created per month (line) and notes per domain
 * (donut). Plain SVG, no chart library; all numbers come from the metadata
 * cache and the file list, no file is read.
 */
const DataNerds = ({
	counts,
	root,
	reviews,
}: {
	counts: DayCounts;
	root: string;
	/** When given, the line shows the review answers instead of the notes created. */
	reviews?: ReviewCurveProps | null;
}) => {
	const [goalMenu, setGoalMenu] = useState(false);
	const closeGoalMenu = useCallback(() => setGoalMenu(false), []);
	const obsidian = useObsidian();
	const today = useToday();
	const domains = useDomainCounts(obsidian, root);

	const months = useMemo(
		() => monthlyTotals(counts, today, monthName),
		[counts, today]
	);
	const monthTotal = months.reduce((sum, m) => sum + m.total, 0);
	const peak = Math.max(1, ...months.map((m) => m.total));

	const chartH = LINE_H - LABEL_BAND;
	const points = linePoints(
		months.map((m) => m.total),
		LINE_W,
		chartH,
		LINE_PAD
	);

	const domainTotal = domains.reduce((sum, d) => sum + d.count, 0);
	const colorOf = (name: string, index: number): string =>
		name === "Autres" ? OTHERS_COLOR : PALETTE[index % PALETTE.length];
	const arcs = donutArcs(
		domains.map((d) => d.count),
		DONUT_R
	);
	const circumference = 2 * Math.PI * DONUT_R;

	return (
		<div className="home-card home-data">
			<div className="home-card-title">DATA NERDS</div>

			{reviews && (
				<ReviewCurve
					{...reviews}
					onEditGoal={() => setGoalMenu((open) => !open)}
				/>
			)}
			{reviews && goalMenu && (
				<GoalMenu
					className="rev-goal-pop--end"
					settings={reviews.stats.settings}
					todayDow={parseDay(reviews.stats.today).getDay()}
					onChange={reviews.onSettings}
					onClose={closeGoalMenu}
				/>
			)}

			{!reviews && (
				<div className="data-block">
					<div className="data-caption">
						<span>Notes créées par mois</span>
						<span className="data-figure">{monthTotal}</span>
					</div>
					<svg
						className="data-line"
						viewBox={`0 0 ${LINE_W} ${LINE_H}`}
						role="img"
						aria-label="Notes créées par mois sur douze mois"
					>
						<defs>
							<linearGradient id="data-area-fill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#5b8cff" stopOpacity="0.55" />
								<stop offset="100%" stopColor="#5b8cff" stopOpacity="0" />
							</linearGradient>
						</defs>
						{[0, 0.5, 1].map((ratio) => (
							<line
								key={ratio}
								className="data-grid"
								x1={LINE_PAD}
								x2={LINE_W - LINE_PAD}
								y1={LINE_PAD + (chartH - LINE_PAD * 2) * ratio}
								y2={LINE_PAD + (chartH - LINE_PAD * 2) * ratio}
							/>
						))}
						<path className="data-area" d={areaPath(points, chartH - LINE_PAD)} />
						<path className="data-stroke" d={linePath(points)} />
						{points.map((p, i) => (
							<circle
								key={months[i].month}
								className="data-dot"
								cx={p.x}
								cy={p.y}
								r={i === points.length - 1 ? 3.6 : 2.4}
							>
								<title>{`${monthTitle(months[i].month)} — ${months[i].total} ${plural(months[i].total)}`}</title>
							</circle>
						))}
						{points.map((p, i) =>
							i % 3 === 0 || i === points.length - 1 ? (
								<text
									key={`l-${months[i].month}`}
									className="data-axis"
									x={p.x}
									y={LINE_H - 3}
									textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
								>
									{months[i].label}
								</text>
							) : null
						)}
						<text className="data-axis" x={LINE_PAD} y={LINE_PAD - 1} textAnchor="start">
							max {peak}
						</text>
					</svg>
				</div>
			)}

			<div className="data-block">
				<div className="data-caption">
					<span>Notes par domaine</span>
					<span className="data-figure">{domainTotal}</span>
				</div>
				{domains.length === 0 ? (
					<div className="data-empty">Aucune note dans « {root} »</div>
				) : (
					<div className="data-donut-row">
						<svg
							className="data-donut"
							viewBox="0 0 100 100"
							role="img"
							aria-label="Répartition des notes par domaine"
						>
							<circle className="data-donut-track" cx="50" cy="50" r={DONUT_R} strokeWidth={DONUT_STROKE} />
							{domains.map((d, i) => (
								<circle
									key={d.name}
									className="data-donut-arc"
									cx="50"
									cy="50"
									r={DONUT_R}
									strokeWidth={DONUT_STROKE}
									stroke={colorOf(d.name, i)}
									strokeDasharray={`${arcs[i].length} ${circumference}`}
									strokeDashoffset={arcs[i].offset}
									transform="rotate(-90 50 50)"
								>
									<title>{`${d.name} — ${d.count} ${plural(d.count)}`}</title>
								</circle>
							))}
							<text className="data-donut-total" x="50" y="53" textAnchor="middle">
								{domainTotal}
							</text>
						</svg>
						<ul className="data-legend">
							{domains.map((d, i) => (
								<li key={d.name}>
									<span className="data-swatch" style={{ background: colorOf(d.name, i) }} />
									<span className="data-legend-name">{d.name}</span>
									<span className="data-legend-count">{d.count}</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
};

export default DataNerds;
