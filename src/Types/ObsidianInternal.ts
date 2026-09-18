import type { Command, Plugin } from "obsidian";

/**
 * Typings for the undocumented Obsidian internals this plugin relies on.
 * Everything is optional-friendly: these APIs may change without notice.
 */

export interface BookmarkItem {
	type: string;
	title?: string;
	path?: string;
	items?: BookmarkItem[];
}

export interface InternalPlugin {
	enabled: boolean;
	instance?: { items?: BookmarkItem[] } | null;
}

declare module "obsidian" {
	interface App {
		isMobile: boolean;
		emulateMobile(enabled: boolean): void;
		commands: {
			commands: Record<string, Command>;
			executeCommandById(id: string): boolean;
		};
		plugins: {
			plugins: Record<string, Plugin>;
		};
		internalPlugins: {
			plugins: Record<string, InternalPlugin | undefined>;
		};
	}
}
