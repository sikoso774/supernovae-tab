import { App, TFile } from "obsidian";
import { TabGalaxyPluginSettings } from "src/Settings/Settings";
import { BOOKMARK_SOURCE } from "src/Types/Enums";
import { BookmarkItem } from "src/Types/ObsidianInternal";

export interface BookmarkGroup {
	title: string;
	path: string;
}

/**
 * Recursively gets all bookmarks
 * @param items
 */
const flattenBookmarks = (items: BookmarkItem[] = []): BookmarkItem[] => {
	let flattedBookmarks: BookmarkItem[] = [];

	items.forEach((item) => {
		if (item.type === "file") {
			flattedBookmarks.push(item);
		} else if (item.type === "group") {
			flattedBookmarks = flattedBookmarks.concat(
				flattenBookmarks(item.items)
			);
		}
	});

	return flattedBookmarks;
};

/**
 * Finds a group by name and then returns it's bookmarks
 * @param title
 * @param items
 */
const getBookmarksByGroupName = (
	title: string,
	items: BookmarkItem[] = []
): BookmarkItem[] => {
	let flattedBookmarks: BookmarkItem[] = [];

	items.forEach((item) => {
		if (item.type === "group") {
			if (item.title === title) {
				flattedBookmarks = flattenBookmarks(item.items);
			} else {
				const bookmarks = getBookmarksByGroupName(title, item.items);
				if (bookmarks.length > 0) {
					flattedBookmarks = bookmarks;
				}
			}
		}
	});

	return flattedBookmarks;
};

/**
 * Raw bookmark items, or an empty list when the core Bookmarks plugin is
 * disabled (its instance is then missing, notably on mobile).
 * @param app
 */
const getBookmarkItems = (app: App | undefined): BookmarkItem[] => {
	const items = app?.internalPlugins?.plugins?.bookmarks?.instance?.items;
	return Array.isArray(items) ? items : [];
};

/**
 * Gets a list of bookmarks depending on settings. It will either get all bookmarks or bookmarks in a specific group.
 * @param app
 * @param settings
 */
export const getBookmarks = (
	app: App | undefined,
	settings: TabGalaxyPluginSettings
): TFile[] => {
	const items = getBookmarkItems(app);
	const bookmarks =
		settings.bookmarkSource === BOOKMARK_SOURCE.GROUP
			? getBookmarksByGroupName(settings.bookmarkGroup, items)
			: flattenBookmarks(items);

	return bookmarks
		.map((bookmark) =>
			bookmark.path ? app?.vault.getAbstractFileByPath(bookmark.path) : null
		)
		.filter((file): file is TFile => file instanceof TFile);
};

/**
 * Recursive function to return all bookmark groups with their paths
 * @param items
 * @param parentPath
 */
const flattenBookmarkGroups = (
	items: BookmarkItem[] = [],
	parentPath: string | null = null
): BookmarkGroup[] => {
	let flattedGroups: BookmarkGroup[] = [];

	items.forEach((item) => {
		if (item.type === "group") {
			const title = item.title ?? "";
			const path = parentPath ? `${parentPath}/${title}` : title;
			flattedGroups.push({ title, path });
			flattedGroups = flattedGroups.concat(
				flattenBookmarkGroups(item.items, path)
			);
		}
	});

	return flattedGroups;
};

/**
 * Gets a list of all bookmark groups
 * @param app
 */
export const getBookmarkGroups = (app: App): BookmarkGroup[] =>
	flattenBookmarkGroups(getBookmarkItems(app));
