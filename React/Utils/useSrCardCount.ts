import { useEffect, useState } from "react";
import { App } from "obsidian";
import { readSrCardCount } from "React/Utils/spacedRepetition";

// Spaced Repetition emits no event when its count changes (a card answered, a
// sync): reading the deck tree is a few dozen additions, so a light poll is
// enough to follow its status bar
const POLL_INTERVAL = 1000;

/**
 * Cards to review as counted by the Spaced Repetition plugin itself (the figure
 * of its status bar), or `null` while that figure is not available.
 */
const useSrCardCount = (app: App | undefined): number | null => {
	const [count, setCount] = useState<number | null>(() =>
		app ? readSrCardCount(app) : null
	);

	useEffect(() => {
		if (!app) return;
		// setState with an unchanged number does not re-render
		const read = () => setCount(readSrCardCount(app));
		read();
		const timer = window.setInterval(read, POLL_INTERVAL);
		return () => window.clearInterval(timer);
	}, [app]);

	return count;
};

export default useSrCardCount;
