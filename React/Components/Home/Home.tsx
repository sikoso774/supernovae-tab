import React, { useEffect, useRef, useState } from "react";
import { Notice, TFile, moment } from "obsidian";
import { useObsidian } from "../../Context/ObsidianAppContext";
import getTimeOfDayGreeting from "React/Utils/getTimeOfDayGreeting";
import Observable from "src/Utils/Observable";
import { TabGalaxyPluginSettings } from "src/Settings/Settings";
import TabGalaxyPlugin from "main";
import StarField from "../StarField/StarField";
import Icon from "../Icon/Icon";
import Clock from "../Clock/Clock";
import useVaultFiles, {
	getActiveProjects,
	getRecentMarkdownFiles,
} from "React/Utils/useVaultFiles";

const Home = ({
	settingsObservable,
	plugin,
}: {
	settingsObservable: Observable;
	plugin: TabGalaxyPlugin;
}) => {
	const [settings, setSettings] = useState<TabGalaxyPluginSettings>(
		settingsObservable.getValue()
	);
	const mainDivRef = useRef<HTMLDivElement>(null);
	const obsidian = useObsidian();

	const latestFiles = useVaultFiles(obsidian, (app) =>
		getRecentMarkdownFiles(app)
	);
	const activeProjects = useVaultFiles(obsidian, getActiveProjects);

	const resolvePath = (path: string) =>
		path === "{{today}}" ? moment().format("YYYY-MM-DD") : path;

	const openFile = (path: string) => {
		const resolved = resolvePath(path);
		const file =
			obsidian?.metadataCache.getFirstLinkpathDest(resolved, "") ??
			obsidian?.vault.getAbstractFileByPath(`${resolved}.md`);
		if (file instanceof TFile) {
			obsidian?.workspace.getMostRecentLeaf()?.openFile(file);
		} else {
			new Notice(`Note introuvable : ${resolved}`);
		}
	};

	useEffect(() => {
		const unsubscribe = settingsObservable.onChange(
			(newSettings: TabGalaxyPluginSettings) => setSettings(newSettings)
		);
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		mainDivRef.current?.focus();
	}, []);

	return (
		<div className="galaxy-root" ref={mainDivRef} tabIndex={0}>
			<StarField />
			<div className="galaxy-wrapper home-wrapper">
				{/* Heure + greeting */}
				<div className="galaxy-center home-center">
					<Clock timeFormat={settings.timeFormat} className="home-time" />
					<div className="galaxy-greeting">
						{settings.greetingText
							.replace(/{{greeting}}/gi, getTimeOfDayGreeting())
							.replace(
								/{{name}}/gi,
								settings.userName || "explorer"
							)}
					</div>
				</div>

				{/* Boutons de navigation */}
				<div className="home-nav">
					{settings.homeNavLinks.map(({ label, path }) => (
						<a
							key={`${label}-${path}`}
							className={`home-nav-btn${path === "{{today}}" ? " home-nav-btn--today" : ""}`}
							onClick={() => openFile(path)}
						>
							{label}
						</a>
					))}
				</div>

				{/* Récents + Projets actifs */}
				<div className="galaxy-bottom home-bottom">
					<div className="galaxy-section">
						<div className="galaxy-section-label">
							<Icon name="clock" />
							<span>Récents</span>
						</div>
						<div className="galaxy-recentlyedited">
							{latestFiles.map((file) => (
								<a
									key={file.path}
									className="galaxy-recentlyedited-file"
									onClick={() =>
										obsidian?.workspace
											.getMostRecentLeaf()
											?.openFile(file)
									}
								>
									<Icon name="file" />
									<span className="galaxy-recentlyedited-file-name">
										{file.basename}
									</span>
								</a>
							))}
						</div>
					</div>

					{activeProjects.length > 0 && (
						<div className="galaxy-section">
							<div className="galaxy-section-label">
								<Icon name="rocket" />
								<span>Projets actifs</span>
							</div>
							<div className="home-projects">
								{activeProjects.map((file) => (
									<a
										key={file.path}
										className="home-project-item"
										onClick={() =>
											obsidian?.workspace
												.getMostRecentLeaf()
												?.openFile(file)
										}
									>
										<Icon name="file-text" />
										<span>{file.basename}</span>
									</a>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Home;
