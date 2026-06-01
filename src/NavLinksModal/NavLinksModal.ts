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
		this._links = JSON.parse(
			JSON.stringify(this._plugin.settings.homeNavLinks)
		);
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
			text: 'Use {{today}} as path to dynamically link to today\'s journal note.',
			cls: "setting-item-description",
		});

		const table = contentEl.createEl("table", { cls: "customQuotesTable" });
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th");
		headerRow.createEl("th", { text: "Label" });
		headerRow.createEl("th", { text: "Path (note name)" });
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
			});
			labelInput.style.width = "160px";
			labelInput.addEventListener("input", (e: any) => {
				this._links[index].label = e.target.value;
			});

			const pathCell = row.createEl("td");
			const pathInput = pathCell.createEl("input", {
				type: "text",
				value: link.path,
			});
			pathInput.style.width = "200px";
			pathInput.placeholder = "Nom de la note ou {{today}}";
			pathInput.addEventListener("input", (e: any) => {
				this._links[index].path = e.target.value;
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
