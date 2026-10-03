import type { WorkspaceLeaf } from "obsidian";

/**
 * Pins a tab, like "Pin" in its menu: Obsidian then opens the notes chosen from
 * it in a new tab instead of replacing it. Does nothing if it is already pinned.
 */
export const pinLeaf = (leaf: WorkspaceLeaf): void => {
	if (typeof leaf.setPinned !== "function") return;
	if (leaf.getViewState().pinned) return;
	leaf.setPinned(true);
};
