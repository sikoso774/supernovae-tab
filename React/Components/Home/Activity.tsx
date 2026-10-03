import React, { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon/Icon";
import { useObsidian } from "../../Context/ObsidianAppContext";
import useToday from "React/Utils/useToday";
import useWritingActivity from "React/Utils/useWritingActivity";
import {
	addDays,
	buildCalendar,
	computeStreaks,
	streakTier,
	yearTotal,
} from "React/Utils/activity";

const RECENT = "recent";

const monthName = (monthIndex: number): string =>
	new Date(2000, monthIndex, 1).toLocaleDateString("fr-FR", {
		month: "short",
	});

const WEEKDAY_LABELS = ["Lun", "", "Mer", "", "Ven", "", ""];

const describeDay = (day: string, count: number): string => {
	const [y, m, d] = day.split("-").map(Number);
	const label = new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
		weekday: "short",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	const notes =
		count === 0
			? "Aucune note"
			: `${count} ${count > 1 ? "notes" : "note"}`;
	return `${notes} — ${label}`;
};

interface Tip {
	text: string;
	left: number;
	top: number;
}

/**
 * Writing streak + a one-square-per-day calendar of the notes created.
 * Plain CSS grid (no canvas, no chart library): cheap enough to leave open.
 */
const Activity = ({ onOpenDay }: { onOpenDay: (day: string) => void }) => {
	const counts = useWritingActivity(useObsidian());
	const today = useToday();
	const [view, setView] = useState(RECENT);
	const [tip, setTip] = useState<Tip | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	const currentYear = today.slice(0, 4);
	const stats = useMemo(() => computeStreaks(counts, today), [counts, today]);
	const tier = streakTier(stats.current);
	const writtenToday = (counts[today] || 0) > 0;

	const years = useMemo(() => {
		const found: Record<string, true> = { [currentYear]: true };
		for (const day of Object.keys(counts)) found[day.slice(0, 4)] = true;
		return Object.keys(found).sort().reverse();
	}, [counts, currentYear]);

	const weeks = useMemo(() => {
		const from = view === RECENT ? addDays(today, -364) : `${view}-01-01`;
		const to =
			view === RECENT || view === currentYear ? today : `${view}-12-31`;
		return buildCalendar(counts, from, to, monthName);
	}, [counts, today, view, currentYear]);

	// Newest weeks sit on the right: start the scroll there when the grid overflows
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollLeft = el.scrollWidth;
	}, [weeks]);

	const showTip = (target: HTMLElement) => {
		const day = target.dataset.day;
		const root = rootRef.current;
		if (!day || !root || target.classList.contains("is-muted")) {
			setTip(null);
			return;
		}
		const cell = target.getBoundingClientRect();
		const box = root.getBoundingClientRect();
		// The dashboard may be scaled down to fit: convert screen pixels back to layout pixels
		const scale = box.width / root.offsetWidth || 1;
		setTip({
			text: describeDay(day, Number(target.dataset.count || 0)),
			left: (cell.left - box.left + cell.width / 2) / scale,
			top: (cell.top - box.top) / scale,
		});
	};

	const dayOf = (target: EventTarget | null): HTMLElement | null =>
		target instanceof HTMLElement && target.dataset.day ? target : null;

	const streakLabel =
		stats.current === 0
			? "Aucune série en cours"
			: stats.current === 1
				? "jour d'affilée"
				: "jours d'affilée";

	return (
		<div className={`galaxy-section home-activity tier-${tier}`} ref={rootRef}>
			<div className="activity-hero">
				<div className="activity-flame">
					<Icon name={tier === "nova" ? "sparkles" : "flame"} />
				</div>
				<div className="activity-streak">
					{stats.current > 0 && (
						<span className="activity-streak-count">
							{stats.current}
						</span>
					)}
					<span className="activity-streak-label">{streakLabel}</span>
					<span className="activity-streak-hint">
						{stats.current === 0
							? "Écris une note aujourd'hui pour allumer la flamme"
							: writtenToday
								? "Série sauvée pour aujourd'hui"
								: "Écris une note aujourd'hui pour garder ta série"}
					</span>
				</div>
				<div className="activity-stats">
					<div className="activity-stat">
						<span className="activity-stat-value">
							{stats.longest}
						</span>
						<span className="activity-stat-label">Record (jours)</span>
					</div>
					<div className="activity-stat">
						<span className="activity-stat-value">
							{yearTotal(counts, currentYear)}
						</span>
						<span className="activity-stat-label">
							Notes en {currentYear}
						</span>
					</div>
					<div className="activity-stat">
						<span className="activity-stat-value">
							{stats.activeDays}
						</span>
						<span className="activity-stat-label">Jours actifs</span>
					</div>
				</div>
			</div>

			<div className="activity-panel">
				<div className="activity-calendar">
					<div className="activity-weekdays">
						{WEEKDAY_LABELS.map((label, i) => (
							<span key={i}>{label}</span>
						))}
					</div>
					<div className="activity-scroll" ref={scrollRef}>
						<div
							key={view}
							className="activity-board"
							style={{ ["--weeks" as string]: weeks.length }}
							onMouseOver={(e) => {
								const cell = dayOf(e.target);
								if (cell) showTip(cell);
							}}
							onMouseLeave={() => setTip(null)}
							onClick={(e) => {
								const cell = dayOf(e.target);
								if (cell && !cell.classList.contains("is-muted")) {
									onOpenDay(cell.dataset.day as string);
								}
							}}
						>
							<div className="activity-months">
								{weeks.map(
									(week, wi) =>
										week.monthLabel && (
											<span
												key={wi}
												style={{ gridColumn: wi + 1 }}
											>
												{week.monthLabel}
											</span>
										)
								)}
							</div>
							<div className="activity-grid">
								{weeks.map((week, wi) =>
									week.cells.map((cell) => (
										<div
											key={cell.day}
											data-day={cell.day}
											data-count={cell.count}
											className={`activity-cell level-${cell.level}${
												cell.muted ? " is-muted" : ""
											}${cell.day === today ? " is-today" : ""}`}
											style={
												cell.level > 0
													? {
															animationDelay: `${wi * 14}ms`,
														}
													: undefined
											}
										/>
									))
								)}
							</div>
						</div>
					</div>
				</div>

				<div className="activity-footer">
					<div className="activity-tabs">
						{years.length > 1 &&
							[RECENT, ...years].map((v) => (
								<a
									key={v}
									className={`activity-tab${v === view ? " is-active" : ""}`}
									onClick={() => setView(v)}
								>
									{v === RECENT ? "12 mois" : v}
								</a>
							))}
					</div>
					<div className="activity-legend">
						<span>Moins</span>
						{[0, 1, 2, 3, 4, 5].map((level) => (
							<span key={level} className={`activity-cell level-${level}`} />
						))}
						<span>Plus</span>
					</div>
				</div>
			</div>

			{tip && (
				<div
					className="activity-tip"
					style={{ left: tip.left, top: tip.top }}
				>
					{tip.text}
				</div>
			)}
		</div>
	);
};

export default Activity;
