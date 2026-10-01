import React from "react";
import { useObsidian } from "../../Context/ObsidianAppContext";
import { countDue } from "React/Utils/reviewMarkers";
import useDueCards from "React/Utils/useDueCards";
import useToday from "React/Utils/useToday";

/**
 * Flashcards to review today (due + never reviewed, like the Spaced Repetition
 * status bar), shown on the button it sits in. Hidden at 0.
 */
const DueBadge = () => {
	const obsidian = useObsidian();
	const { dates, fresh } = useDueCards(obsidian);
	const due = countDue(dates, useToday()) + fresh;

	if (due === 0) return null;
	return (
		<span
			className="home-nav-badge"
			title={`${due} carte${due > 1 ? "s" : ""} à réviser (dues ou nouvelles)`}
		>
			{due}
		</span>
	);
};

export default DueBadge;
