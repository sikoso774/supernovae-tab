import { Notice, Platform, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { ReactView, GALAXY_REACT_VIEW } from "./Views/ReactView";
import { HomeView, GALAXY_HOME_VIEW } from "./Views/HomeView";
import Observable from "src/Utils/Observable";
import "src/Types/ObsidianInternal";
import {
	TabGalaxyPluginSettingTab,
	TabGalaxyPluginSettings,
	DEFAULT_SETTINGS,
} from "src/Settings/Settings";

// Live reload for `npm run dev` only. Never on mobile: a dev bundle synced to
// a phone would retry this localhost connection forever.
if (process.env.NODE_ENV === "development" && !Platform.isMobile) {
	new EventSource("http://127.0.0.1:8000/esbuild").addEventListener(
		"change",
		() => location.reload()
	);
}

export default class TabGalaxyPlugin extends Plugin {
	settings: TabGalaxyPluginSettings;
	settingsObservable: Observable<TabGalaxyPluginSettings>;
	bypassHomeIntercept = false;
	// Weak: closed leaves are garbage-collected, no manual cleanup needed.
	// Entries must outlive HomeView.onClose (used to redirect file opens).
	homeLeaves = new WeakSet<WorkspaceLeaf>();

	async onload() {
		await this.loadSettings();

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
			name: "Open home dashboard",
			callback: () => {
				void this.openHomeView();
			},
		});

		this.addRibbonIcon("home", "Galaxy home", () => {
			void this.openHomeView();
		});

		this.addSettingTab(new TabGalaxyPluginSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("layout-change", () => this.onLayoutChange())
		);

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				this.onFileOpen(file).catch((e) =>
					console.error("Supernovae Tab: file-open handler failed", e)
				);
			})
		);

		if (process.env.NODE_ENV === "development") {
			const emulateMobile = process.env.EMULATE_MOBILE === "true";
			if (emulateMobile !== this.app.isMobile) {
				this.app.emulateMobile(emulateMobile);
			}
		}
	}

	onunload() {}

	private async onFileOpen(file: TFile | null): Promise<void> {
		if (!file) return;

		const activeLeaf = this.app.workspace.getMostRecentLeaf();

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
				void this.app.workspace.revealLeaf(newLeaf);
			}
			window.setTimeout(() => {
				this.bypassHomeIntercept = false;
			}, 500);
		}
	}

	async openHomeView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(GALAXY_HOME_VIEW);
		if (existing.length > 0) {
			void this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getLeaf(true);
		await leaf.setViewState({ type: GALAXY_HOME_VIEW });
		void this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		const data = ((await this.loadData()) ??
			{}) as Partial<TabGalaxyPluginSettings>;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** Notifies open views of a settings change, then persists it. */
	updateSettings(): void {
		this.settingsObservable.setValue(this.settings);
		this.saveSettings().catch((e) =>
			console.error("Supernovae Tab: failed to save settings", e)
		);
	}

	private onLayoutChange(): void {
		if (this.bypassHomeIntercept) return;
		const leaf = this.app.workspace.getMostRecentLeaf();
		if (leaf?.getViewState().type === "empty") {
			leaf.setViewState({
				type: GALAXY_REACT_VIEW,
			}).catch((e) =>
				console.error("Supernovae Tab: failed to open new tab view", e)
			);
		}
	}

	openSwitcherCommand(command: string): void {
		const pluginID = command.split(":")[0];
		const plugins = this.app.plugins.plugins;
		const internalPlugins = this.app.internalPlugins.plugins;

		if (plugins[pluginID] || internalPlugins[pluginID]?.enabled) {
			this.app.commands.executeCommandById(command);
		} else {
			new Notice(
				`Plugin ${pluginID} is not enabled. Please enable it in the settings.`
			);
		}
	}
}
