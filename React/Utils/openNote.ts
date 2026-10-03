import { App, TFile } from "obsidian";
import type { MouseEvent as ReactMouseEvent } from "react";

/** Opens `file` in a tab of its own: the tab it was chosen from stays as it is. */
export const openInNewTab = (app: App | undefined, file: TFile): void => {
	void app?.workspace.getLeaf("tab").openFile(file);
};

/** Opens `file` in the most recent tab: from a new tab, the note takes its place. */
export const openInThisTab = (app: App | undefined, file: TFile): void => {
	void app?.workspace.getMostRecentLeaf()?.openFile(file);
};

/**
 * Props that make a click of the middle button (the wheel) run `onMiddle`.
 * The press itself is cancelled: over a scrolling list Windows would start its
 * scroll mode and the click would never arrive.
 */
export const middleClick = (onMiddle: () => void) => ({
	onMouseDown: (e: ReactMouseEvent) => {
		if (e.button === 1) e.preventDefault();
	},
	onAuxClick: (e: ReactMouseEvent) => {
		if (e.button !== 1) return;
		e.preventDefault();
		onMiddle();
	},
});
