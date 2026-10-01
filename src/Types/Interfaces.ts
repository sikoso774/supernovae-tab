export interface SearchProvider {
	command: string;
	display: string;
}

export interface CustomQuote {
	text: string;
	author: string;
}

export interface NavLink {
	label: string;
	path: string;
	/** Row the button belongs to. Empty or missing = the main row. */
	group?: string;
	/** Optional counter shown on the button. */
	badge?: NavBadge;
}

export type NavBadge = "due-cards";
