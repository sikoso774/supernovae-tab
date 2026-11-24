import React from "react";
import useToday from "React/Utils/useToday";
import { DATE_LANGUAGE } from "src/Types/Enums";

/**
 * Today's date as a card: weekday, big day number, month and year. A click
 * (or Enter) opens today's daily note.
 */
const DateCard = ({
	language,
	onOpen,
}: {
	language: DATE_LANGUAGE;
	onOpen: () => void;
}) => {
	const [year, month, day] = useToday().split("-").map(Number);
	const date = new Date(year, month - 1, day);

	return (
		<div
			className="home-card home-date is-clickable"
			role="button"
			tabIndex={0}
			title="Ouvrir la note du jour"
			onClick={onOpen}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onOpen();
				}
			}}
		>
			<span className="date-weekday">
				{date.toLocaleDateString(language, { weekday: "long" })}
			</span>
			<span className="date-day">{day}</span>
			<span className="date-month">
				{date.toLocaleDateString(language, { month: "long" })} {year}
			</span>
		</div>
	);
};

export default DateCard;
