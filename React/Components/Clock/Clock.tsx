import { useEffect, useState } from "react";
import getTime from "React/Utils/getTime";
import getDate from "React/Utils/getDate";
import { DATE_LANGUAGE, TIME_FORMAT } from "src/Types/Enums";

/**
 * Isolated so the 1-second tick only re-renders the clock, not the whole view.
 */
const Clock = ({
	timeFormat,
	dateLanguage,
	showDate = true,
	className = "",
}: {
	timeFormat: TIME_FORMAT;
	dateLanguage: DATE_LANGUAGE;
	showDate?: boolean;
	className?: string;
}) => {
	const [time, setTime] = useState(getTime(timeFormat));
	const [date, setDate] = useState(getDate(dateLanguage));

	useEffect(() => {
		setTime(getTime(timeFormat));
		setDate(getDate(dateLanguage));
		const timer = window.setInterval(() => {
			setTime(getTime(timeFormat));
			setDate(getDate(dateLanguage));
		}, 1000);
		return () => window.clearInterval(timer);
	}, [timeFormat, dateLanguage]);

	return (
		<>
			<div className={`galaxy-time ${className}`.trim()}>{time}</div>
			{showDate && <div className="galaxy-date">{date}</div>}
		</>
	);
};

export default Clock;
