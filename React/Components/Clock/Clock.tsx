import { useEffect, useState } from "react";
import getTime from "React/Utils/getTime";
import getDate from "React/Utils/getDate";
import { TIME_FORMAT } from "src/Types/Enums";

/**
 * Isolated so the 1-second tick only re-renders the clock, not the whole view.
 */
const Clock = ({
	timeFormat,
	className = "",
}: {
	timeFormat: TIME_FORMAT;
	className?: string;
}) => {
	const [time, setTime] = useState(getTime(timeFormat));
	const [date, setDate] = useState(getDate());

	useEffect(() => {
		setTime(getTime(timeFormat));
		const timer = window.setInterval(() => {
			setTime(getTime(timeFormat));
			setDate(getDate());
		}, 1000);
		return () => window.clearInterval(timer);
	}, [timeFormat]);

	return (
		<>
			<div className={`galaxy-time ${className}`.trim()}>{time}</div>
			<div className="galaxy-date">{date}</div>
		</>
	);
};

export default Clock;
