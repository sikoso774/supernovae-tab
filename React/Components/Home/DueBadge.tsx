import React from "react";
import { useObsidian } from "../../Context/ObsidianAppContext";
import { countDue } from "React/Utils/reviewMarkers";
import useDueCards from "React/Utils/useDueCards";
import useToday from "React/Utils/useToday";

/** Number of flashcards due today, shown on the button it sits in. Hidden at 0. */
const DueBadge = () => {
	const obsidian = useObsidian();
	const dates = useDueCards(obsidian);
	const due = countDue(dates, useToday());

	if (due === 0) return null;
	return (
		<span
			className="home-nav-badge"
			title={`${due} carte${due > 1 ? "s" : ""} à réviser aujourd'hui`}
		>
			{due}
		</span>
	);
};

export default DueBadge;
