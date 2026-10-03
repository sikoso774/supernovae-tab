import React, { useMemo } from "react";
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

/**
 * "DATA NERDS" card: notes created per month (line) and notes per domain
 * (donut). Plain SVG, no chart library; all numbers come from the metadata
 * cache and the file list, no file is read.
 */
const DataNerds = ({ counts, root }: { counts: DayCounts; root: string }) => {
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
