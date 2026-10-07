import React from "react";
import { useObsidian } from "../../Context/ObsidianAppContext";
import { countDue } from "React/Utils/reviewMarkers";
import useDueCards from "React/Utils/useDueCards";
import useSrCardCount from "React/Utils/useSrCardCount";
import useToday from "React/Utils/useToday";

/**
 * Flashcards to review today (due + never reviewed), shown on the button it
 * sits in. Hidden at 0. The figure is the one Spaced Repetition itself shows in
 * its status bar; only when the plugin cannot give it (missing, still starting)
 * is it estimated from the scheduling markers of the notes.
 */
const DueBadge = () => {
	const obsidian = useObsidian();
	const srCount = useSrCardCount(obsidian);
	const { dates, fresh } = useDueCards(obsidian, srCount === null);
	const today = useToday();
	const due = srCount ?? countDue(dates, today) + fresh;

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
