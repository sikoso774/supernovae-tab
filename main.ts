import { Notice, Plugin } from "obsidian";
import { ReactView, GALAXY_REACT_VIEW } from "./Views/ReactView";
import Observable from "src/Utils/Observable";
import {
	TabGalaxyPluginSettingTab,
	TabGalaxyPluginSettings,
	DEFAULT_SETTINGS,
} from "src/Settings/Settings";

if (process.env.NODE_ENV === "development") {
	new EventSource("http://127.0.0.1:8000/esbuild").addEventListener(
		"change",
		() => location.reload()
	);
}

export default class TabGalaxyPlugin extends Plugin {
	settings: TabGalaxyPluginSettings;
	settingsObservable: Observable;

	async onload() {
		await this.loadSettings();

		this.injectOrbitronFont();

		this.settingsObservable = new Observable(this.settings);

		this.registerView(
			GALAXY_REACT_VIEW,
			(leaf) =>
				new ReactView(this.app, this.settingsObservable, leaf, this)
		);

		this.addSettingTab(new TabGalaxyPluginSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on(
				"layout-change",
				this.onLayoutChange.bind(this)
			)
		);

		if (process.env.NODE_ENV === "development") {
			// @ts-ignore
			if (process.env.EMULATE_MOBILE && !this.app.isMobile) {
				// @ts-ignore
				this.app.emulateMobile(true);
			}

			// @ts-ignore
			if (!process.env.EMULATE_MOBILE && this.app.isMobile) {
				// @ts-ignore
				this.app.emulateMobile(false);
			}
		}
	}

	onunload() {
		document.getElementById("tab-galaxy-orbitron")?.remove();
	}

	private injectOrbitronFont(): void {
		if (document.getElementById("tab-galaxy-orbitron")) return;
		const link = document.createElement("link");
		link.id = "tab-galaxy-orbitron";
		link.rel = "stylesheet";
		link.href =
			"https://fonts.googleapis.com/css2?family=Orbitron:wght@100;300;400;700&display=swap";
		document.head.appendChild(link);
	}

	async loadSettings() {
		const data = (await this.loadData()) || {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private onLayoutChange(): void {
		const leaf = this.app.workspace.getMostRecentLeaf();
		if (leaf?.getViewState().type === "empty") {
			leaf.setViewState({
				type: GALAXY_REACT_VIEW,
			});
		}
	}

	openSwitcherCommand(command: string): void {
		const pluginID = command.split(":")[0];
		//@ts-ignore
		const plugins = this.app.plugins.plugins;
		//@ts-ignore
		const internalPlugins = this.app.internalPlugins.plugins;

		if (plugins[pluginID] || internalPlugins[pluginID]?.enabled) {
			//@ts-ignore
			this.app.commands.executeCommandById(command);
		} else {
			new Notice(
				`Plugin ${pluginID} is not enabled. Please enable it in the settings.`
			);
		}
	}
}
