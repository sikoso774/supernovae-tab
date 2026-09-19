import { getBookmarkGroups } from "React/Utils/getBookmarks";
import TabGalaxyPlugin from "main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import ChooseSearchProvider from "src/ChooseSearchProvider/ChooseSearchProvider";
import CustomQuotesModel from "src/CustomQuotesModel/CustomQuotesModel";
import NavLinksModal from "src/NavLinksModal/NavLinksModal";
import {
	BOOKMARK_SOURCE,
	QUOTE_SOURCE,
	TIME_FORMAT,
} from "src/Types/Enums";
import { CustomQuote, NavLink, SearchProvider } from "src/Types/Interfaces";

const DEFAULT_SEARCH_PROVIDER: SearchProvider = {
	command: "switcher:open",
	display: "Obsidian Core Quick Switcher",
};

export const SEARCH_PROVIDER = [
	"switcher",
	"omnisearch",
	"darlal-switcher-plus",
	"obsidian-another-quick-switcher",
];

export interface TabGalaxyPluginSettings {
	disableOnMobile: boolean;
	userName: string;
	showTopLeftSearchButton: boolean;
	topLeftSearchProvider: SearchProvider;
	showTime: boolean;
	timeFormat: TIME_FORMAT;
	showGreeting: boolean;
	greetingText: string;
	showInlineSearch: boolean;
	inlineSearchProvider: SearchProvider;
	showRecentFiles: boolean;
	showBookmarks: boolean;
	bookmarkSource: BOOKMARK_SOURCE;
	bookmarkGroup: string;
	showQuote: boolean;
	quoteSource: QUOTE_SOURCE;
	customQuotes: CustomQuote[];
	homeNavLinks: NavLink[];
}

export const DEFAULT_SETTINGS: TabGalaxyPluginSettings = {
	// The animated view is not reliable on phones and tablets yet
	disableOnMobile: true,
	userName: "",
	showTopLeftSearchButton: true,
	topLeftSearchProvider: DEFAULT_SEARCH_PROVIDER,
	showTime: true,
	timeFormat: TIME_FORMAT.TWELVE_HOUR,
	showGreeting: true,
	greetingText: "{{greeting}}, {{name}}.",
	showInlineSearch: true,
	inlineSearchProvider: DEFAULT_SEARCH_PROVIDER,
	showRecentFiles: true,
	showBookmarks: false,
	bookmarkSource: BOOKMARK_SOURCE.ALL,
	bookmarkGroup: "",
	showQuote: true,
	quoteSource: QUOTE_SOURCE.QUOTEABLE,
	customQuotes: [],
	homeNavLinks: [
		{ label: "📘 Journal", path: "Dashboard" },
		{ label: "🚀 Projets", path: "LienVersProjets" },
		{ label: "🧠 Hub", path: "🧠Hub" },
		{ label: "📖 Reading", path: "LIVRES.base" },
		{ label: "☀️ Aujourd'hui", path: "{{today}}" },
	],
};

export class TabGalaxyPluginSettingTab extends PluginSettingTab {
	plugin: TabGalaxyPlugin;

	constructor(app: App, plugin: TabGalaxyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		/****************************************
		 * Mobile settings
		 ***************************************/
		new Setting(containerEl).setHeading().setName(`Mobile settings`);

		new Setting(containerEl)
			.setName("Disable on mobile")
			.setDesc(
				`The galaxy view is not stable on phones and tablets yet. When enabled, the plugin does nothing on mobile. Restart the app to apply.`
			)
			.addToggle((component) => {
				component.setValue(this.plugin.settings.disableOnMobile);
				component.onChange((value) => {
					this.plugin.settings.disableOnMobile = value;
					this.plugin.updateSettings();
					new Notice("Restart the app to apply this change.");
				});
			});

		/****************************************
		 * Search settings
		 ***************************************/
		new Setting(containerEl).setHeading().setName(`Search settings`);

		new Setting(containerEl)
			.setName("Show top left search button")
			.setDesc(
				`Should the search button at the top left of the new tab screen be displayed?`
			)
			.addToggle((component) => {
				component.setValue(
					this.plugin.settings.showTopLeftSearchButton
				);
				component.onChange((value) => {
					this.plugin.settings.showTopLeftSearchButton = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Top left search provider")
			.setDesc(
				`Which plugin should be utilized for search when clicking the top left button?`
			)
			.setClass("search-provider")
			.addText((component) => {
				component.setValue(
					this.plugin.settings.topLeftSearchProvider.display
				);
				component.setDisabled(true);
			})
			.addButton((component) => {
				component.setButtonText("Change");
				component.setTooltip("Choose search provider");
				component.onClick(() => {
					new ChooseSearchProvider(
						this.app,
						this.plugin.settings,
						(result) => {
							this.plugin.settings.topLeftSearchProvider = result;
							this.plugin.updateSettings();
							this.display();
						}
					).open();
				});
			});

		new Setting(containerEl)
			.setName("Show inline search")
			.setDesc(
				`Should the inline search in the middle of the new tab screen be displayed?`
			)
			.addToggle((component) => {
				component.setValue(this.plugin.settings.showInlineSearch);
				component.onChange((value) => {
					this.plugin.settings.showInlineSearch = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Inline search provider")
			.setDesc(
				`Which plugin should be utilized for search when clicking the middle of the screen button?`
			)
			.setClass("search-provider")
			.addText((component) => {
				component
					.setValue(this.plugin.settings.inlineSearchProvider.display)
					.setDisabled(true);
			})
			.addButton((component) => {
				component.setButtonText("Change");
				component.setTooltip("Choose search provider");
				component.onClick(() => {
					new ChooseSearchProvider(
						this.app,
						this.plugin.settings,
						(result) => {
							this.plugin.settings.inlineSearchProvider = result;
							this.plugin.updateSettings();
							this.display();
						}
					).open();
				});
			});

		/****************************************
		 * Time settings
		 ***************************************/
		new Setting(containerEl).setHeading().setName(`Time settings`);

		new Setting(containerEl)
			.setName("Show time")
			.setDesc(
				`Should the time in the middle of the new tab screen be displayed?`
			)
			.addToggle((component) => {
				component.setValue(this.plugin.settings.showTime);
				component.onChange((value) => {
					this.plugin.settings.showTime = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Time format")
			.setDesc(`Should the time be in 12-hour format or 24-hour format?`)
			.addDropdown((component) => {
				component.addOption(
					TIME_FORMAT.TWELVE_HOUR,
					TIME_FORMAT.TWELVE_HOUR
				);
				component.addOption(
					TIME_FORMAT.TWENTY_FOUR_HOUR,
					TIME_FORMAT.TWENTY_FOUR_HOUR
				);

				component.setValue(this.plugin.settings.timeFormat);

				component.onChange((value: TIME_FORMAT) => {
					this.plugin.settings.timeFormat = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		/****************************************
		 * Greeting settings
		 ***************************************/
		new Setting(containerEl).setHeading().setName(`Greeting settings`);

		new Setting(containerEl)
			.setName("Your name")
			.setDesc(
				`Your name, used in the greeting via the {{name}} placeholder.`
			)
			.addText((component) => {
				component.setPlaceholder("Explorer");
				component.setValue(this.plugin.settings.userName);
				component.onChange((value) => {
					this.plugin.settings.userName = value;
					this.plugin.updateSettings();
				});
			});

		new Setting(containerEl)
			.setName("Show greeting")
			.setDesc(
				`Should the greeting in the middle of the new tab screen be displayed?`
			)
			.addToggle((component) => {
				component.setValue(this.plugin.settings.showGreeting);
				component.onChange((value) => {
					this.plugin.settings.showGreeting = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Greeting text")
			.setDesc(
				`What text should be displayed as a greeting? Use {{greeting}} for time-of-day (e.g. Good morning) and {{name}} for your name.`
			)
			.addText((component) => {
				component.setValue(this.plugin.settings.greetingText);
				component.onChange((value) => {
					this.plugin.settings.greetingText = value;
					this.plugin.updateSettings();
				});
			});

		/****************************************
		 * Recent file settings
		 ***************************************/
		new Setting(containerEl).setHeading().setName(`Recent file settings`);

		new Setting(containerEl)
			.setName("Show recent files")
			.setDesc(
				`Should recent files in the middle of the new tab screen be displayed?`
			)
			.addToggle((component) => {
				component.setValue(this.plugin.settings.showRecentFiles);
				component.onChange((value) => {
					this.plugin.settings.showRecentFiles = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		/****************************************
		 * Bookmark settings
		 ***************************************/
		new Setting(containerEl).setHeading().setName(`Bookmark settings`);

		new Setting(containerEl)
			.setName("Show bookmarks")
			.setDesc(
				`Should bookmarks in the middle of the new tab screen be displayed?`
			)
			.addToggle((component) => {
				component.setValue(this.plugin.settings.showBookmarks);
				component.onChange((value) => {
					this.plugin.settings.showBookmarks = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Bookmarks source")
			.setDesc(
				`Should all bookmarks be displayed or bookmarks from a specific group?`
			)
			.addDropdown((component) => {
				component.addOption(BOOKMARK_SOURCE.ALL, "All bookmarks");
				component.addOption(
					BOOKMARK_SOURCE.GROUP,
					"Bookmarks from group"
				);

				component.setValue(this.plugin.settings.bookmarkSource);
				component.onChange((value: BOOKMARK_SOURCE) => {
					this.plugin.settings.bookmarkSource = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		if (this.plugin.settings.bookmarkSource === BOOKMARK_SOURCE.GROUP) {
			new Setting(containerEl)
				.setName("Bookmarks group")
				.setDesc(`Which group should bookmarks be pulled from?`)
				.addDropdown((component) => {
					getBookmarkGroups(this.app).forEach((group) => {
						component.addOption(group.title, group.path);
					});

					component.setValue(this.plugin.settings.bookmarkGroup);
					component.onChange((value) => {
						this.plugin.settings.bookmarkGroup = value;
						this.plugin.updateSettings();
						this.display();
					});
				});
		}

		/****************************************
		 * Home Dashboard settings
		 ***************************************/
		new Setting(containerEl).setHeading().setName(`Home dashboard settings`);

		new Setting(containerEl)
			.setName("Navigation links")
			.setDesc(
				`${this.plugin.settings.homeNavLinks.length} link(s). Use {{today}} as path to open today's journal note.`
			)
			.addButton((component) => {
				component.setButtonText("Edit");
				component.onClick(() => {
					new NavLinksModal(
						this.plugin,
						(modified: NavLink[]) => {
							this.plugin.settings.homeNavLinks = modified;
							this.plugin.updateSettings();
							this.display();
						}
					).open();
				});
			});

		/****************************************
		 * Quote settings
		 ***************************************/
		new Setting(containerEl).setHeading().setName(`Quote settings`);

		new Setting(containerEl)
			.setName("Show quote")
			.setDesc(
				`Should the quote at the bottom of the new tab screen be displayed?`
			)
			.addToggle((component) => {
				component.setValue(this.plugin.settings.showQuote);
				component.onChange((value) => {
					this.plugin.settings.showQuote = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Quote source")
			.setDesc(
				`Where should quotes be pulled from? You can use either built in quotes, your own quotes, or a combination of both.`
			)
			.addDropdown((component) => {
				Object.values(QUOTE_SOURCE).forEach((source) => {
					component.addOption(source, source);
				});

				component.setValue(this.plugin.settings.quoteSource);
				component.onChange((value: QUOTE_SOURCE) => {
					this.plugin.settings.quoteSource = value;
					this.plugin.updateSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Custom quotes")
			.setDesc(`${this.plugin.settings.customQuotes.length} quotes`)
			.addButton((component) => {
				component.setButtonText("Edit");

				component.onClick(() => {
					new CustomQuotesModel(
						this.plugin,
						(modifiedCustomQuotes: CustomQuote[]) => {
							this.plugin.settings.customQuotes =
								modifiedCustomQuotes;
							this.plugin.updateSettings();
							this.display();
						}
					).open();
				});
			});
	}
}
