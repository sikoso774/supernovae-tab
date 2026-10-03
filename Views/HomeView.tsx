import { App, ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { ObsidianContext } from "../React/Context/ObsidianAppContext";
import Observable from "src/Utils/Observable";
import TabGalaxyPlugin from "main";
import { TabGalaxyPluginSettings } from "src/Settings/Settings";
import HomeApp from "../React/Components/Home/Home";
import { pinLeaf } from "src/Utils/pinLeaf";

export const GALAXY_HOME_VIEW = "galaxy-home-view";

export class HomeView extends ItemView {
	root: Root | null = null;
	settingsObservable: Observable<TabGalaxyPluginSettings>;
	plugin: TabGalaxyPlugin;

	constructor(
		app: App,
		settingsObservable: Observable<TabGalaxyPluginSettings>,
		leaf: WorkspaceLeaf,
		plugin: TabGalaxyPlugin
	) {
		super(leaf);
		this.settingsObservable = settingsObservable;
		this.plugin = plugin;
	}

	getViewType() {
		return GALAXY_HOME_VIEW;
	}

	getDisplayText() {
		return "Home";
	}

	getIcon() {
		return "home";
	}

	async onOpen() {
		this.plugin.homeLeaves.add(this.leaf);

		// Pinned as soon as it opens, so notes chosen elsewhere open in a new tab.
		// Once more after the tab has finished loading its state.
		if (this.plugin.settings.pinHomeTab) {
			pinLeaf(this.leaf);
			window.setTimeout(() => pinLeaf(this.leaf), 0);
		}

		this.addAction("pencil", "Modifier Home.md", () => {
			const file =
				this.app.vault.getAbstractFileByPath("Home.md") ??
				this.app.metadataCache.getFirstLinkpathDest("Home", "");
			if (!(file instanceof TFile)) return;
			this.plugin.bypassHomeIntercept = true;
			const leaf = this.app.workspace.getLeaf(true);
			void leaf.openFile(file, { state: { mode: "source" } });
		});

		this.root = createRoot(this.contentEl);
		this.root.render(
			<ObsidianContext.Provider value={this.app}>
				<HomeApp
					settingsObservable={this.settingsObservable}
					plugin={this.plugin}
				/>
			</ObsidianContext.Provider>
		);
		this.containerEl.addClass("tab-galaxy");
		this.containerEl.addClass("tab-galaxy-home");
	}

	async onClose() {
		this.root?.unmount();
		this.root = null;
	}
}
