import React, { useEffect, useMemo, useRef, useState } from "react";
import { Notice, TFile, moment } from "obsidian";
import { useObsidian } from "../../Context/ObsidianAppContext";
import getTimeOfDayGreeting from "React/Utils/getTimeOfDayGreeting";
import Observable from "src/Utils/Observable";
import { TabGalaxyPluginSettings } from "src/Settings/Settings";
import { NavLink } from "src/Types/Interfaces";
import TabGalaxyPlugin from "main";
import StarField from "../StarField/StarField";
import Icon from "../Icon/Icon";
import Clock from "../Clock/Clock";
import Activity from "./Activity";
import DueBadge from "./DueBadge";
import useVaultFiles, {
	getActiveProjects,
	getRecentMarkdownFiles,
} from "React/Utils/useVaultFiles";

interface NavRow {
	group: string;
	links: NavLink[];
}

// One row per group, in order of first appearance; links without a group share the main row
const groupLinks = (links: NavLink[]): NavRow[] => {
	const rows: NavRow[] = [];
	for (const link of links) {
		const group = (link.group ?? "").trim();
		let row = rows.find((r) => r.group === group);
		if (!row) {
			row = { group, links: [] };
			rows.push(row);
		}
		row.links.push(link);
	}
	return rows;
};

const Home = ({
	settingsObservable,
	plugin,
}: {
	settingsObservable: Observable<TabGalaxyPluginSettings>;
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
	const navRows = useMemo(
		() => groupLinks(settings.homeNavLinks),
		[settings.homeNavLinks]
	);

	const resolvePath = (path: string) =>
		path === "{{today}}" ? moment().format("YYYY-MM-DD") : path;

	const openTFile = (file: TFile) => {
		void obsidian?.workspace.getMostRecentLeaf()?.openFile(file);
	};

	const openFile = (path: string) => {
		const resolved = resolvePath(path);
		const file =
			obsidian?.metadataCache.getFirstLinkpathDest(resolved, "") ??
			obsidian?.vault.getAbstractFileByPath(`${resolved}.md`);
		if (file instanceof TFile) {
			openTFile(file);
		} else {
			new Notice(`Note introuvable : ${resolved}`);
		}
	};

	// A calendar day opens that day's journal note (named YYYY-MM-DD), if any
	const openDay = (day: string) => {
		const file = obsidian?.metadataCache.getFirstLinkpathDest(day, "");
		if (file instanceof TFile) {
			openTFile(file);
		} else {
			new Notice(`Pas de note de journal pour le ${day}`);
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

				{/* Boutons de navigation, une rangée par groupe */}
				<div className="home-nav">
					{navRows.map(({ group, links }) => (
						<div key={group || "main"} className="home-nav-row">
							{group && (
								<span className="home-nav-group-label">
									{group}
								</span>
							)}
							{links.map(({ label, path, badge }) => (
								<a
									key={`${label}-${path}`}
									className={`home-nav-btn${path === "{{today}}" ? " home-nav-btn--today" : ""}`}
									onClick={() => openFile(path)}
								>
									{label}
									{badge === "due-cards" && <DueBadge />}
								</a>
							))}
						</div>
					))}
				</div>

				{/* Activité + Récents + Projets actifs */}
				<div className="galaxy-bottom home-bottom">
					{settings.showActivity && <Activity onOpenDay={openDay} />}

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
									onClick={() => openTFile(file)}
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
										onClick={() => openTFile(file)}
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
