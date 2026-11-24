import React, { useEffect, useRef, useState } from "react";
import { ReviewSettings } from "React/Utils/reviewStats";

const STEP = 5;
const MAX_GOAL = 9999;
const PRESETS = [20, 30, 50];

// Monday first on screen; the plugin stores Sunday first (Date#getDay order)
const WEEK = [
	{ dow: 1, label: "Lun" },
	{ dow: 2, label: "Mar" },
	{ dow: 3, label: "Mer" },
	{ dow: 4, label: "Jeu" },
	{ dow: 5, label: "Ven" },
	{ dow: 6, label: "Sam" },
	{ dow: 0, label: "Dim" },
];

const clampGoal = (n: number): number => Math.max(1, Math.min(MAX_GOAL, n));

interface NumFieldProps {
	value: number;
	label: string;
	onCommit: (value: number) => void;
}

// A typed number is applied after a short pause, on Enter, when the field loses
// focus and when the menu closes: whichever comes first, so it is never lost
const TYPING_PAUSE = 600;

/** A number typed in. */
const NumField = ({ value, label, onCommit }: NumFieldProps) => {
	const [draft, setDraft] = useState(String(value));
	const draftRef = useRef(draft);
	const valueRef = useRef(value);
	const commitRef = useRef(onCommit);
	const timer = useRef(0);
	valueRef.current = value;
	commitRef.current = onCommit;

	useEffect(() => {
		draftRef.current = String(value);
		setDraft(String(value));
	}, [value]);

	const commit = () => {
		window.clearTimeout(timer.current);
		const n = parseInt(draftRef.current, 10);
		if (n > 0 && n !== valueRef.current) {
			valueRef.current = clampGoal(n);
			commitRef.current(valueRef.current);
		} else {
			draftRef.current = String(valueRef.current);
			setDraft(draftRef.current);
		}
	};

	// Menu closing with a number still pending
	useEffect(
		() => () => {
			window.clearTimeout(timer.current);
			const n = parseInt(draftRef.current, 10);
			if (n > 0 && n !== valueRef.current) commitRef.current(clampGoal(n));
		},
		[]
	);

	return (
		<input
			className="rev-num"
			type="text"
			inputMode="numeric"
			value={draft}
			aria-label={label}
			onChange={(e) => {
				const next = e.target.value.replace(/\D/g, "").slice(0, 4);
				draftRef.current = next;
				setDraft(next);
				window.clearTimeout(timer.current);
				timer.current = window.setTimeout(commit, TYPING_PAUSE);
			}}
			onBlur={commit}
			onKeyDown={(e) => {
				// Keep Obsidian's hotkeys out of the field, but let Escape close the menu
				if (e.key !== "Escape") e.stopPropagation();
				if (e.key === "Enter") (e.target as HTMLInputElement).blur();
			}}
		/>
	);
};

interface Props {
	settings: ReviewSettings;
	/** Weekday of today (0 = Sunday), highlighted in the weekly mode. */
	todayDow: number;
	onChange: (patch: Partial<ReviewSettings>) => void;
	onClose: () => void;
	/** Extra class to place the panel in another card. */
	className?: string;
}

/**
 * Panel to set the daily goal without leaving the home page: one goal for every
 * day, or one per weekday. The log plugin stores it and every figure follows
 * (ring, bar chart, heatmap and its own Stats view).
 */
const GoalMenu = ({
	settings: saved,
	todayDow,
	onChange: save,
	onClose,
	className,
}: Props) => {
	const ref = useRef<HTMLDivElement>(null);

	// The menu is the only writer while it is open, so it keeps the latest values
	// itself: two quick edits (a field leaving focus, then a "+" elsewhere) would
	// otherwise both start from the week as last saved, and the second would
	// erase the first.
	const latest = useRef<ReviewSettings>(saved);
	const [settings, setSettings] = useState<ReviewSettings>(saved);
	const onChange = (patch: Partial<ReviewSettings>) => {
		latest.current = { ...latest.current, ...patch };
		setSettings(latest.current);
		save(patch);
	};

	const weekly = settings.goalByWeekday !== null;
	const week = settings.goalByWeekday ?? Array(7).fill(settings.dailyGoal);

	useEffect(() => {
		// A number being typed is applied when its field loses focus: do it before the
		// menu disappears, or closing it would drop the value
		const closeAndKeep = () => {
			const field = ref.current?.contains(document.activeElement)
				? (document.activeElement as HTMLElement)
				: null;
			field?.blur();
			onClose();
		};
		const onDown = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			// The triggers (ring, caption link) toggle the menu themselves
			if (ref.current?.contains(target) || target?.closest("[data-rev-goal-trigger]")) return;
			closeAndKeep();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeAndKeep();
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	const setDay = (dow: number, value: number) => {
		const current = latest.current;
		const next = (current.goalByWeekday ?? Array(7).fill(current.dailyGoal)).slice();
		next[dow] = clampGoal(value);
		onChange({ goalByWeekday: next });
	};

	const nudge = (dow: number, delta: number) => {
		const current = latest.current;
		setDay(dow, (current.goalByWeekday?.[dow] ?? current.dailyGoal) + delta);
	};

	return (
		<div
			className={`rev-goal-pop${className ? ` ${className}` : ""}`}
			ref={ref}
			role="dialog"
			aria-label="Objectif quotidien"
		>
			<div className="rev-pop-head">
				<span>Objectif quotidien</span>
				<a
					className="rev-pop-x"
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => {
						(document.activeElement as HTMLElement | null)?.blur();
						onClose();
					}}
					aria-label="Fermer"
				>
					×
				</a>
			</div>

			<div className="rev-seg-switch">
				<a
					className={!weekly ? "is-on" : ""}
					onClick={() => weekly && onChange({ goalByWeekday: null })}
				>
					Chaque jour
				</a>
				<a
					className={weekly ? "is-on" : ""}
					onClick={() =>
						!weekly &&
						onChange({ goalByWeekday: Array(7).fill(latest.current.dailyGoal) })
					}
				>
					Par jour de la semaine
				</a>
			</div>

			{!weekly ? (
				<>
					<div className="rev-stepper">
						<a
							className="rev-step"
							onClick={() => onChange({ dailyGoal: clampGoal(latest.current.dailyGoal - STEP) })}
						>
							−
						</a>
						<NumField
							value={settings.dailyGoal}
							label="Objectif quotidien"
							onCommit={(n) => onChange({ dailyGoal: n })}
						/>
						<a
							className="rev-step"
							onClick={() => onChange({ dailyGoal: clampGoal(latest.current.dailyGoal + STEP) })}
						>
							+
						</a>
						<span className="rev-pop-unit">réponses par jour</span>
					</div>
					<div className="rev-presets">
						{PRESETS.map((n) => (
							<a
								key={n}
								className={`rev-chip${settings.dailyGoal === n ? " is-on" : ""}`}
								onClick={() => onChange({ dailyGoal: n })}
							>
								{n}
							</a>
						))}
					</div>
				</>
			) : (
				<div className="rev-week">
					{WEEK.map(({ dow, label }) => (
						<div key={dow} className={`rev-week-col${dow === todayDow ? " is-today" : ""}`}>
							<span className="rev-week-label">{label}</span>
							<a className="rev-step" onClick={() => nudge(dow, STEP)}>
								+
							</a>
							<NumField
								value={week[dow]}
								label={`Objectif du ${label}`}
								onCommit={(n) => setDay(dow, n)}
							/>
							<a className="rev-step" onClick={() => nudge(dow, -STEP)}>
								−
							</a>
						</div>
					))}
				</div>
			)}

			<div className="rev-pop-note">
				Recalculé partout, jours passés compris (barres, heatmap, vue Stats).
			</div>
		</div>
	);
};

export default GoalMenu;
