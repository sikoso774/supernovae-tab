import { App, Notice, TFile, normalizePath } from "obsidian";
import { openInNewTab } from "./openNote";

const TEMPLATER_ID = "templater-obsidian";

export interface DailyNoteSettings {
	/** Folder of the daily notes; {{YYYY}}, {{MM}} and {{DD}} are replaced by the day. */
	dailyNoteFolder: string;
	/** Templater template used to create a missing note (with or without ".md"). */
	dailyNoteTemplate: string;
}

interface TemplaterLike {
	create_new_note_from_template?: (
		template: TFile | string,
		folder?: string,
		filename?: string,
		openNewNote?: boolean
	) => Promise<TFile | undefined>;
}

/** Folder for `day` ("YYYY-MM-DD"): the pattern with its date variables filled in. */
export const dailyFolder = (pattern: string, day: string): string => {
	const [year, month, date] = day.split("-");
	return pattern
		.replace(/{{YYYY}}/g, year)
		.replace(/{{MM}}/g, month)
		.replace(/{{DD}}/g, date)
		.replace(/\/+$/, "");
};

const find = (app: App, day: string, path: string): TFile | null => {
	const file =
		app.vault.getAbstractFileByPath(path) ?? app.metadataCache.getFirstLinkpathDest(day, "");
	return file instanceof TFile ? file : null;
};

/**
 * Opens the daily note of `day` ("YYYY-MM-DD", today in practice) in a tab of
 * its own. When it does not exist yet it is created from the Templater
 * template, so it comes out filled in exactly as a note made by Templater
 * itself. Without Templater (or without that template) an empty note is
 * created in the right folder and a message says why.
 */
export const openDailyNote = async (
	app: App | undefined,
	settings: DailyNoteSettings,
	day: string
): Promise<void> => {
	if (!app) return;
	const folder = dailyFolder(settings.dailyNoteFolder.trim(), day);
	const path = normalizePath(`${folder ? `${folder}/` : ""}${day}.md`);

	const existing = find(app, day, path);
	if (existing) {
		openInNewTab(app, existing);
		return;
	}

	const templater = (
		app as unknown as { plugins?: { plugins?: Record<string, { templater?: TemplaterLike }> } }
	).plugins?.plugins?.[TEMPLATER_ID]?.templater;
	const templatePath = settings.dailyNoteTemplate.trim();
	const template = templatePath
		? app.vault.getAbstractFileByPath(
				normalizePath(templatePath.endsWith(".md") ? templatePath : `${templatePath}.md`)
			)
		: null;

	let reason = "";
	let created: TFile | null = null;
	if (!templater?.create_new_note_from_template) {
		reason = "Templater n'est pas actif";
	} else if (!(template instanceof TFile)) {
		reason = `modèle introuvable (${templatePath || "aucun modèle réglé"})`;
	} else {
		try {
			const file = await templater.create_new_note_from_template(template, folder, day, false);
			created = file instanceof TFile ? file : null;
		} catch (e) {
			console.warn("[supernovae-tab] daily note", e);
		}
		if (!created) reason = "Templater n'a pas pu créer la note";
	}

	if (!created) {
		// Templater may have left the file behind before failing
		created = find(app, day, path);
		if (!created) {
			if (folder && !app.vault.getAbstractFileByPath(folder)) {
				await app.vault.createFolder(folder);
			}
			created = await app.vault.create(path, "");
		}
		new Notice(`Note du jour créée vide : ${reason}.`);
	}

	openInNewTab(app, created);
};
