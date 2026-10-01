import { useEffect, useState } from "react";
import { toDayKey } from "React/Utils/activity";

/** Today as a YYYY-MM-DD key, refreshed at local midnight. */
const useToday = (): string => {
	const [today, setToday] = useState(() => toDayKey(new Date()));

	useEffect(() => {
		const now = new Date();
		const midnight = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() + 1
		);
		const timer = window.setTimeout(
			() => setToday(toDayKey(new Date())),
			midnight.getTime() - now.getTime() + 1000
		);
		return () => window.clearTimeout(timer);
	}, [today]);

	return today;
};

export default useToday;
