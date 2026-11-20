import React from "react";
import Icon from "../Icon/Icon";
import { ReviewStats, TrickyCard } from "React/Utils/reviewStats";

const RING_R = 40;
const RING_STROKE = 9;
const RING_LENGTH = 2 * Math.PI * RING_R;

// Top to bottom in a bar, and in the legend order
const RESPONSES = [
	{ key: "easy", label: "Easy" },
	{ key: "good", label: "Good" },
	{ key: "hard", label: "Hard" },
	{ key: "again", label: "Again" },
] as const;

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

const plural = (n: number, one: string, many: string): string => (n > 1 ? many : one);

const baseName = (path: string): string =>
	path.split("/").pop()?.replace(/\.md$/, "") ?? path;

const rateClass = (rate: number): string =>
	rate >= 80 ? "is-high" : rate < 60 ? "is-low" : "is-mid";

interface Props {
	stats: ReviewStats;
	onOpenStats: () => void;
	onReview: () => void;
	onReviewDeck: (path: string) => void;
	onOpenCard: (card: TrickyCard) => void;
}

/**
 * "RÉVISIONS" band: what Spaced Repetition answers gave today, over the last
 * fortnight, per deck and the cards that keep failing. The figures come from the
 * SR Review Log plugin; plain HTML and SVG, no chart library.
 */
const Reviews = ({ stats, onOpenStats, onReview, onReviewDeck, onOpenCard }: Props) => {
	const { todayStats: today, goal } = stats;
	const done = today.total >= goal;
	const ratio = Math.min(1, today.total / goal);
	const scaleMax = Math.max(goal, ...stats.days.map((d) => d.total));
	const decks = stats.decks.slice(0, 5);
	const tricky = stats.tricky.slice(0, 4);

	return (
		<div className="home-card home-reviews">
			<div className="home-card-title">
				<Icon name="layers" />
				<span>Révisions</span>
				<span className="rev-title-gap" />
				<a className="rev-chip" onClick={onReview}>
					Réviser
				</a>
				<a className="rev-chip" onClick={onOpenStats}>
					Stats
				</a>
			</div>

			{stats.total === 0 ? (
				<div className="rev-empty">
					Fais une session de flashcards : chaque réponse (Again, Hard, Good, Easy)
					apparaîtra ici.
				</div>
			) : (
				<div className="rev-cols">
					{/* Aujourd'hui */}
					<section className="rev-col rev-today">
						<div className="rev-caption">Aujourd'hui</div>
						<div className="rev-today-main">
							<div
								className={`rev-ring${done ? " is-done" : ""}`}
								title={`${today.total} réponse${today.total > 1 ? "s" : ""} sur un objectif de ${goal}`}
							>
								<svg viewBox="0 0 100 100" role="img" aria-label="Objectif du jour">
									<circle
										className="rev-ring-track"
										cx="50"
										cy="50"
										r={RING_R}
										strokeWidth={RING_STROKE}
									/>
									<circle
										className="rev-ring-arc"
										cx="50"
										cy="50"
										r={RING_R}
										strokeWidth={RING_STROKE}
										strokeDasharray={`${RING_LENGTH * ratio} ${RING_LENGTH}`}
										transform="rotate(-90 50 50)"
									/>
								</svg>
								<div className="rev-ring-text">
									<span className="rev-ring-num">{today.total}</span>
									<span className="rev-ring-goal">/ {goal}</span>
								</div>
							</div>
							<ul className="rev-resp">
								{RESPONSES.map(({ key, label }) => (
									<li key={key}>
										<span className={`rev-dot dot-${key}`} />
										<span className="rev-resp-name">{label}</span>
										<span className="rev-resp-n">{today[key]}</span>
									</li>
								))}
							</ul>
						</div>
						<div className="rev-figures">
							<div title="Part de réponses Good + Easy sur 30 jours">
								<b>{stats.rate30 === null ? "–" : `${stats.rate30} %`}</b>
								<span>rétention 30 j</span>
							</div>
							<div title="Jours de révision consécutifs">
								<b>{stats.streak}</b>
								<span>{plural(stats.streak, "jour d'affilée", "jours d'affilée")}</span>
							</div>
							<div title="Cartes vues pour la première fois aujourd'hui">
								<b>{today.fresh}</b>
								<span>{plural(today.fresh, "nouvelle", "nouvelles")}</span>
							</div>
						</div>
					</section>

					{/* 14 derniers jours */}
					<section className="rev-col rev-days">
						<div className="rev-caption">
							<span>{stats.days.length} derniers jours</span>
							<span className="rev-hint">objectif {goal}</span>
						</div>
						<div className="rev-bars">
							<div
								className="rev-goal-line"
								style={{ "--rev-goal": goal / scaleMax } as React.CSSProperties}
							/>
							{stats.days.map((day) => {
								const rate = day.total
									? Math.round((100 * (day.good + day.easy)) / day.total)
									: null;
								const tip =
									day.total === 0
										? `${longDay(day.d)} — aucune révision`
										: `${longDay(day.d)} — ${day.total} réponse${day.total > 1 ? "s" : ""} (${rate} %) · Easy ${day.easy} · Good ${day.good} · Hard ${day.hard} · Again ${day.again}`;
								return (
									<div
										key={day.d}
										className={`rev-bar-col${day.d === stats.today ? " is-today" : ""}`}
										title={tip}
										onClick={onOpenStats}
									>
										<div className="rev-bar-plot">
											{day.total > 0 && (
												<div
													className={`rev-bar${day.total >= goal ? " is-goal" : ""}`}
													style={{ height: `${(100 * day.total) / scaleMax}%` }}
												>
													{RESPONSES.map(({ key }) =>
														day[key] ? (
															<div
																key={key}
																className={`rev-seg seg-${key}`}
																style={{ flex: day[key] }}
															/>
														) : null
													)}
												</div>
											)}
										</div>
										<div className="rev-bar-label">{parseDay(day.d).getDate()}</div>
									</div>
								);
							})}
						</div>
					</section>

					{/* Par deck */}
					<section className="rev-col rev-decks">
						<div className="rev-caption">
							<span>Par deck</span>
							<span className="rev-hint">30 j · réussite</span>
						</div>
						{decks.length === 0 ? (
							<div className="rev-muted">Aucune réponse sur 30 jours.</div>
						) : (
							<ul className="rev-list">
								{decks.map((deck) => (
									<li
										key={deck.path || deck.name}
										className={`rev-deck ${rateClass(deck.rate)}`}
										title={`${deck.name} — ${deck.n} réponse${deck.n > 1 ? "s" : ""} · Easy ${deck.easy} · Good ${deck.good} · Hard ${deck.hard} · Again ${deck.again}\nClic : réviser ce deck`}
										onClick={() => deck.path && onReviewDeck(deck.path)}
									>
										<span className="rev-deck-name">{deck.name}</span>
										<span className="rev-deck-bar">
											<span style={{ width: `${Math.max(4, deck.rate)}%` }} />
										</span>
										<span className="rev-deck-rate">{deck.rate} %</span>
									</li>
								))}
							</ul>
						)}
					</section>

					{/* À reprendre */}
					<section className="rev-col rev-tricky">
						<div className="rev-caption">
							<span>À reprendre</span>
							<span className="rev-hint">30 j</span>
						</div>
						{tricky.length === 0 ? (
							<div className="rev-muted">Aucune carte récalcitrante, bravo !</div>
						) : (
							<ul className="rev-list">
								{tricky.map((card) => (
									<li
										key={`${card.file}|${card.q}`}
										className="rev-card"
										title={`${card.q}\n${card.file}\nClic : ouvrir la note`}
										onClick={() => onOpenCard(card)}
									>
										<span className="rev-card-main">
											<span className="rev-card-q">{card.q || "(carte)"}</span>
											<span className="rev-card-f">{baseName(card.file)}</span>
										</span>
										<span className="rev-card-pills">
											{card.again > 0 && (
												<span className="rev-pill pill-again">{card.again}×</span>
											)}
											{card.hard > 0 && (
												<span className="rev-pill pill-hard">{card.hard}×</span>
											)}
										</span>
									</li>
								))}
							</ul>
						)}
					</section>
				</div>
			)}
		</div>
	);
};

export default Reviews;
