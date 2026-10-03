import { App } from "obsidian";
import { DomainShare, groupByDomain } from "React/Utils/dataStats";
import { useVaultValue } from "React/Utils/useVaultFiles";

const REFRESH_DELAY = 1000;

/** Notes per domain (first folder under `root`), from file paths only: no file is read. */
const useDomainCounts = (app: App | undefined, root: string): DomainShare[] =>
	useVaultValue<DomainShare[]>(
		app,
		(vaultApp) =>
			groupByDomain(
				vaultApp.vault.getMarkdownFiles().map((file) => file.path),
				root
			),
		[],
		REFRESH_DELAY,
		[root]
	);

export default useDomainCounts;
