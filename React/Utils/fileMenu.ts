import { App, Menu, Platform, TFile } from "obsidian";
import type { MouseEvent as ReactMouseEvent } from "react";
import { openInNewTab } from "React/Utils/openNote";

/** Source given to the `file-menu` event, so other plugins can tell where the menu comes from. */
const MENU_SOURCE = "supernovae-tab-context-menu";

/**
 * Right-click menu of a note: the ways to open it first (as in the menu of a tab),
 * then what Obsidian and the plugins add to every file menu: bookmark, copy the
 * Obsidian URL, reveal in navigation, open in the default app...
 * Rename and delete are added by the callers of that event (file explorer, tab
 * header), not by the event itself, so they are never offered from here.
 */
export const showFileMenu = (
	app: App | undefined,
	file: TFile,
	e: ReactMouseEvent
): void => {
	if (!app) return;
	e.preventDefault();

	const menu = new Menu();
	menu.addItem((item) =>
		item
			.setSection("open")
			.setTitle("Open in new tab")
			.setIcon("lucide-file-plus")
			.onClick(() => openInNewTab(app, file))
	);
	if (!Platform.isMobile) {
		menu.addItem((item) =>
			item
				.setSection("open")
				.setTitle("Open to the right")
				.setIcon("lucide-separator-vertical")
				.onClick(() => {
					void app.workspace.getLeaf("split").openFile(file);
				})
		);
	}
	if (Platform.isDesktopApp) {
		menu.addItem((item) =>
			item
				.setSection("open")
				.setTitle("Open in new window")
				.setIcon("lucide-picture-in-picture-2")
				.onClick(() => {
					void app.workspace.openPopoutLeaf().openFile(file);
				})
		);
	}

	app.workspace.trigger("file-menu", menu, file, MENU_SOURCE);
	menu.showAtMouseEvent(e.nativeEvent);
};
