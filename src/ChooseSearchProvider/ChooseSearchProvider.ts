import { App, FuzzySuggestModal } from "obsidian";
import {
	TabGalaxyPluginSettings,
	SEARCH_PROVIDER,
} from "src/Settings/Settings";
import { SearchProvider } from "src/Types/Interfaces";
import "src/Types/ObsidianInternal";

/**
 * This class is used to create a modal to choose a search provider from a list of available search providers
 * Available search providers are defined in SEARCH_PROVIDER
 * Used in TabGalaxyPluginSettingTab
 */
class ChooseSearchProvider extends FuzzySuggestModal<SearchProvider> {
	settings: TabGalaxyPluginSettings;
	onSubmit: (result: SearchProvider) => void;
	result: SearchProvider;

	constructor(
		app: App,
		settings: TabGalaxyPluginSettings,
		onSubmit: (result: SearchProvider) => void
	) {
		super(app);
		this.settings = settings;
		this.onSubmit = onSubmit;
	}

	getItems(): SearchProvider[] {
		return Object.entries(this.app.commands.commands)
			.filter(([id]) => SEARCH_PROVIDER.includes(id.split(":")[0]))
			.map(([id, command]) => ({ command: id, display: command.name }));
	}

	getItemText(item: SearchProvider): string {
		return item.display;
	}

	onChooseItem(item: SearchProvider, evt: MouseEvent | KeyboardEvent): void {
		this.result = item;
		this.onSubmit(item);
		this.close();
	}
}

export default ChooseSearchProvider;
