import type { TFile } from "obsidian";

/**
 * Notes that are scaffolding rather than writing: they never count as recent
 * activity, as a day's contribution or as flashcards.
 */
const EXCLUDED_FOLDERS = ["06 - Templates/"];
const EXCLUDED_BASENAMES = [
	"Home",
	"Theme Studio",
	"Dashboard",
	"Flashcards Dashboard",
];

export const isTemplatePath = (path: string): boolean =>
	EXCLUDED_FOLDERS.some((folder) => path.indexOf(folder) === 0);

/** For "recent notes": hides the dashboards and the templates. */
export const isScaffoldingNote = (file: TFile): boolean =>
	isTemplatePath(file.path) || EXCLUDED_BASENAMES.indexOf(file.basename) !== -1;
