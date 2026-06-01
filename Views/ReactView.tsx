import { App, FileView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import ReactApp from "../React/Components/App/App";
import { ObsidianContext } from "../React/Context/ObsidianAppContext";
import Observable from "src/Utils/Observable";
import BeautitabPlugin from "main";

export const GALAXY_REACT_VIEW = "tab-galaxy-react-view";

export class ReactView extends FileView {
	root: Root | null = null;
	app: App;
	settingsObservable: Observable;
	plugin: BeautitabPlugin;

	constructor(
		app: App,
		settingsObservable: Observable,
		leaf: WorkspaceLeaf,
		plugin: BeautitabPlugin
	) {
		super(leaf);
		this.app = app;
		this.settingsObservable = settingsObservable;
		this.allowNoFile = true;
		this.plugin = plugin;
	}

	getViewType() {
		return GALAXY_REACT_VIEW;
	}

	getDisplayText() {
		return "New tab";
	}

	getIcon() {
		return "";
	}

	async onOpen() {
		this.root = createRoot(this.contentEl);
		this.root.render(
			<ObsidianContext.Provider value={this.app}>
				<ReactApp
					settingsObservable={this.settingsObservable}
					plugin={this.plugin}
				/>
			</ObsidianContext.Provider>
		);
		this.containerEl.addClass("tab-galaxy");
	}

	async onClose() {
		this.root?.unmount();
	}
}
