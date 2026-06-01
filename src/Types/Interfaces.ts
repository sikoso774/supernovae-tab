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
}
