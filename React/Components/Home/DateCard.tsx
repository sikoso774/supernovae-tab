import React from "react";
import useToday from "React/Utils/useToday";
import { DATE_LANGUAGE } from "src/Types/Enums";

/** Today's date as a card: weekday, big day number, month and year. */
const DateCard = ({ language }: { language: DATE_LANGUAGE }) => {
	const [year, month, day] = useToday().split("-").map(Number);
	const date = new Date(year, month - 1, day);

	return (
		<div className="home-card home-date">
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
