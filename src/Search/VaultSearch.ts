import { TAbstractFile, TFile } from "obsidian";
import TabGalaxyPlugin from "main";
import Observable from "src/Utils/Observable";
import { SearchIndex } from "React/Utils/searchIndex";
import {
	excalidrawBlocks,
	isExcalidrawPath,
	parseNote,
	plainText,
} from "React/Utils/searchText";

export interface SearchStatus {
	/** Notes read so far during the first build. */
	indexed: number;
	total: number;
	/** The first build is over. */
	ready: boolean;
	/** Goes up each time the index changes, so searches can be run again. */
	version: number;
}

/** Notes read per step; the app gets control back between two steps. */
const CHUNK = 25;
const UPDATE_DELAY = 500;
const REBUILD_DELAY = 800;
/** A note longer than this (characters) is indexed on its beginning only. */
const MAX_NOTE_LENGTH = 1_000_000;

const nextTick = (): Promise<void> =>
	new Promise((resolve) => window.setTimeout(resolve, 0));

/**
 * The vault's full-text index: built in the background once the workspace is
 * ready, then kept up to date note by note. Shared by every New Tab.
 */
export default class VaultSearch {
	readonly index = new SearchIndex();
	readonly status = new Observable<SearchStatus>({
		indexed: 0,
		total: 0,
		ready: false,
		version: 0,
	});

	private plugin: TabGalaxyPlugin;
	private started = false;
	private buildId = 0;
	private updates = new Map<string, number>();
	private rebuildTimer: number | null = null;

	constructor(plugin: TabGalaxyPlugin) {
		this.plugin = plugin;
	}

	start(): void {
		if (this.started) return;
		this.started = true;

		const { vault } = this.plugin.app;
		this.plugin.registerEvent(vault.on("create", (file) => this.touch(file)));
		this.plugin.registerEvent(vault.on("modify", (file) => this.touch(file)));
		this.plugin.registerEvent(
			vault.on("delete", (file) => {
				if (this.index.removePath(file.path)) this.publish();
			})
		);
		this.plugin.registerEvent(
			vault.on("rename", (file, oldPath) => {
				if (this.index.removePath(oldPath)) this.publish();
				this.touch(file);
			})
		);

		void this.rebuild();
	}

	stop(): void {
		this.buildId++;
		this.updates.forEach((timer) => window.clearTimeout(timer));
		this.updates.clear();
		if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
		this.rebuildTimer = null;
	}

	/** After a change of the excluded folders (typed, so wait for a pause). */
	scheduleRebuild(): void {
		if (!this.started) return;
		if (this.rebuildTimer !== null) window.clearTimeout(this.rebuildTimer);
		this.rebuildTimer = window.setTimeout(() => {
			this.rebuildTimer = null;
			void this.rebuild();
		}, REBUILD_DELAY);
	}

	/** Reads the whole vault again, a few notes at a time. */
	async rebuild(): Promise<void> {
		const id = ++this.buildId;
		const files = this.plugin.app.vault
			.getMarkdownFiles()
			.filter((file) => this.isIndexable(file.path));

		this.index.clear();
		const current = this.status.getValue();
		this.status.setValue({
			indexed: 0,
			total: files.length,
			ready: false,
			version: current.version + 1,
		});

		for (let i = 0; i < files.length; i += CHUNK) {
			await Promise.all(
				files.slice(i, i + CHUNK).map((file) => this.indexFile(file))
			);
			// A newer build (or a stop) took over
			if (id !== this.buildId) return;
			this.status.setValue({
				indexed: Math.min(i + CHUNK, files.length),
				total: files.length,
				ready: false,
				version: this.status.getValue().version + 1,
			});
			await nextTick();
			if (id !== this.buildId) return;
		}

		this.status.setValue({
			indexed: files.length,
			total: files.length,
			ready: true,
			version: this.status.getValue().version + 1,
		});
	}

	private excludedPrefixes(): string[] {
		return this.plugin.settings.searchExcludedFolders
			.split(/[,\n]/)
			.map((folder) => folder.trim().replace(/^\/+|\/+$/g, ""))
			.filter((folder) => folder.length > 0)
			.map((folder) => `${folder}/`);
	}

	private isIndexable(path: string): boolean {
		return !this.excludedPrefixes().some((prefix) => path.indexOf(prefix) === 0);
	}

	private publish(): void {
		const current = this.status.getValue();
		this.status.setValue({ ...current, version: current.version + 1 });
	}

	/** A note changed: read it again once the typing (or the sync) calms down. */
	private touch(file: TAbstractFile): void {
		if (!(file instanceof TFile) || file.extension !== "md") return;
		const path = file.path;
		const pending = this.updates.get(path);
		if (pending !== undefined) window.clearTimeout(pending);
		this.updates.set(
			path,
			window.setTimeout(() => {
				this.updates.delete(path);
				void this.refresh(path);
			}, UPDATE_DELAY)
		);
	}

	private async refresh(path: string): Promise<void> {
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile && this.isIndexable(path)) {
			await this.indexFile(file);
		} else {
			this.index.removePath(path);
		}
		this.publish();
	}

	private async indexFile(file: TFile): Promise<void> {
		try {
			const raw = (await this.plugin.app.vault.cachedRead(file)).slice(
				0,
				MAX_NOTE_LENGTH
			);
			const drawing = isExcalidrawPath(file.path);
			const parsed = drawing
				? {
						headings: "",
						tags: "excalidraw",
						body: excalidrawBlocks(raw).map(plainText).join(" "),
				  }
				: parseNote(raw);
			this.index.addDoc({
				path: file.path,
				title: drawing ? file.basename.replace(/\.excalidraw$/i, "") : file.basename,
				headings: parsed.headings,
				tags: parsed.tags,
				body: parsed.body,
				mtime: file.stat.mtime,
			});
		} catch (e) {
			console.error(`Supernovae Tab: failed to index ${file.path}`, e);
		}
	}
}
