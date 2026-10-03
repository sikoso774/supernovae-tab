import TabGalaxyPlugin from "main";
import { Modal, Setting } from "obsidian";
import ConfirmModal from "src/ConfirmModal/ConfirmModal";
import { NavLink } from "src/Types/Interfaces";

class NavLinksModal extends Modal {
	_onSave: (links: NavLink[]) => void;
	_plugin: TabGalaxyPlugin;
	_links: NavLink[];

	constructor(plugin: TabGalaxyPlugin, onSave: (links: NavLink[]) => void) {
		super(plugin.app);
		this._plugin = plugin;
		this._onSave = onSave;
		this._links = this._plugin.settings.homeNavLinks.map((link) => ({
			...link,
		}));
	}

	onOpen() {
		this.display();
	}

	onClose() {
		this.contentEl.empty();
	}

	display(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Navigation links" });
		contentEl.createEl("p", {
			text: 'Use {{today}} as path to dynamically link to today\'s journal note. Use command:<id> as path to run an Obsidian command (e.g. command:obsidian-spaced-repetition:srs-review-flashcards). Links with the same group share a row; leave the group empty for the main row. "Due" shows the number of flashcards to review today.',
			cls: "setting-item-description",
		});

		const table = contentEl.createEl("table", { cls: "customQuotesTable" });
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th");
		headerRow.createEl("th", { text: "Label" });
		headerRow.createEl("th", { text: "Path (note name)" });
		headerRow.createEl("th", { text: "Group" });
		headerRow.createEl("th", { text: "Due" });
		const tbody = table.createEl("tbody");

		this._links.forEach((link, index) => {
			const row = tbody.createEl("tr");

			const actionCell = row.createEl("td");
			const removeBtn = actionCell.createEl("button", {
				text: "✕",
				cls: "mod-warning",
			});
			removeBtn.addEventListener("click", () => {
				new ConfirmModal(
					this.app,
					() => {
						this._links.splice(index, 1);
						this.display();
					},
					"Remove link",
					`Remove "${link.label}" ?`,
					"Remove"
				).open();
			});

			const labelCell = row.createEl("td");
			const labelInput = labelCell.createEl("input", {
				type: "text",
				value: link.label,
				cls: "galaxy-navlinks-label",
			});
			labelInput.addEventListener("input", () => {
				this._links[index].label = labelInput.value;
			});

			const pathCell = row.createEl("td");
			const pathInput = pathCell.createEl("input", {
				type: "text",
				value: link.path,
				cls: "galaxy-navlinks-path",
				placeholder: "Nom de la note, {{today}} ou command:<id>",
			});
			pathInput.addEventListener("input", () => {
				this._links[index].path = pathInput.value;
			});

			const groupCell = row.createEl("td");
			const groupInput = groupCell.createEl("input", {
				type: "text",
				value: link.group ?? "",
				cls: "galaxy-navlinks-group",
				placeholder: "Main row",
			});
			groupInput.addEventListener("input", () => {
				this._links[index].group = groupInput.value;
			});

			const badgeCell = row.createEl("td");
			const badgeInput = badgeCell.createEl("input", {
				type: "checkbox",
				cls: "galaxy-navlinks-badge",
			});
			badgeInput.checked = link.badge === "due-cards";
			badgeInput.addEventListener("change", () => {
				this._links[index].badge = badgeInput.checked
					? "due-cards"
					: undefined;
			});
		});

		new Setting(contentEl).addButton((component) => {
			component.setButtonText("Add link").onClick(() => {
				this._links.push({ label: "🔗 Nouveau", path: "" });
				this.display();
			});
		});

		new Setting(contentEl).addButton((component) => {
			component
				.setButtonText("Save")
				.setCta()
				.onClick(() => {
					this._onSave(this._links);
					this.close();
				});
		});
	}
}

export default NavLinksModal;
