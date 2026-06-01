import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { ReactView, GALAXY_REACT_VIEW } from "./Views/ReactView";
import { HomeView, GALAXY_HOME_VIEW } from "./Views/HomeView";
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
	bypassHomeIntercept = false;
	homeLeaves = new Set<WorkspaceLeaf>();

	async onload() {
		await this.loadSettings();

		this.injectOrbitronFont();

		this.settingsObservable = new Observable(this.settings);

		this.registerView(
			GALAXY_REACT_VIEW,
			(leaf) =>
				new ReactView(this.app, this.settingsObservable, leaf, this)
		);

		this.registerView(
			GALAXY_HOME_VIEW,
			(leaf) =>
				new HomeView(this.app, this.settingsObservable, leaf, this)
		);

		this.addCommand({
			id: "open-galaxy-home",
			name: "Open Home Dashboard",
			callback: () => this.openHomeView(),
		});

		this.addRibbonIcon("home", "Galaxy Home", () => this.openHomeView());

		this.addSettingTab(new TabGalaxyPluginSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on(
				"layout-change",
				this.onLayoutChange.bind(this)
			)
		);

		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (!file) return;

				const activeLeaf = this.app.workspace.activeLeaf;

				// Home.md ouvert dans un onglet normal → convertir en vue galaxie
				if (file.basename === "Home") {
					if (this.bypassHomeIntercept) {
						this.bypassHomeIntercept = false;
						return;
					}
					if (!activeLeaf || activeLeaf.getViewState().type === GALAXY_HOME_VIEW) return;
					await activeLeaf.setViewState({ type: GALAXY_HOME_VIEW, active: true });
					return;
				}

				// Fichier non-Home ouvert dans un onglet Home → rediriger vers nouvel onglet
				if (
					activeLeaf &&
					this.homeLeaves.has(activeLeaf) &&
					activeLeaf.getViewState().type !== GALAXY_HOME_VIEW
				) {
					this.bypassHomeIntercept = true;
					await activeLeaf.setViewState({ type: GALAXY_HOME_VIEW });
					const newLeaf = this.app.workspace.getLeaf(true);
					const tfile = this.app.vault.getAbstractFileByPath(file.path);
					if (tfile instanceof TFile) {
						await newLeaf.openFile(tfile);
						this.app.workspace.revealLeaf(newLeaf);
					}
					setTimeout(() => { this.bypassHomeIntercept = false; }, 500);
				}
			})
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

	async openHomeView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(GALAXY_HOME_VIEW);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getLeaf(true);
		await leaf.setViewState({ type: GALAXY_HOME_VIEW });
		this.app.workspace.revealLeaf(leaf);
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
		if (this.bypassHomeIntercept) return;
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
