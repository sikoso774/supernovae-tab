import React, { useEffect, useMemo, useRef, useState } from "react";
import { Notice, TFile, getIcon } from "obsidian";
import { useObsidian } from "../../Context/ObsidianAppContext";
import getTime from "React/Utils/getTime";
import getDate from "React/Utils/getDate";
import getTimeOfDayGreeting from "React/Utils/getTimeOfDayGreeting";
import Observable from "src/Utils/Observable";
import { TabGalaxyPluginSettings } from "src/Settings/Settings";
import TabGalaxyPlugin from "main";
import StarField from "../StarField/StarField";


const Icon = ({ name }: { name: string }) => {
	const iconText = new XMLSerializer().serializeToString(
		getIcon(name) || new Node()
	);
	return (
		<span
			className="galaxy-icon"
			dangerouslySetInnerHTML={{ __html: iconText }}
		/>
	);
};

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
	const [time, setTime] = useState(getTime(settings.timeFormat));
	const [date, setDate] = useState(getDate());
	const mainDivRef = useRef<HTMLDivElement>(null);
	const obsidian = useObsidian();

	const allVaultFiles = obsidian?.vault.getAllLoadedFiles();

	const latestFiles = useMemo(() => {
		const files = allVaultFiles?.filter(
			(f) => f instanceof TFile && f.extension === "md"
		);
		files?.sort((a, b) =>
			a instanceof TFile && b instanceof TFile
				? b.stat.mtime - a.stat.mtime
				: 0
		);
		return (files?.slice(0, 5) ?? []) as TFile[];
	}, [allVaultFiles]);

	const activeProjects = useMemo(() => {
		return (allVaultFiles?.filter((f) => {
			if (!(f instanceof TFile) || f.extension !== "md") return false;
			const meta = obsidian?.metadataCache.getFileCache(f)?.frontmatter;
			return meta?.Type === "Project" && meta?.status === "active";
		}) ?? []) as TFile[];
	}, [allVaultFiles]);

	const resolvePath = (path: string) =>
		path === "{{today}}" ? new Date().toISOString().slice(0, 10) : path;

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
		const timer = setInterval(() => {
			setTime(getTime(settings.timeFormat));
			setDate(getDate());
		}, 1000);
		return () => clearInterval(timer);
	}, [settings]);

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
					<div className="galaxy-time home-time">{time}</div>
					<div className="galaxy-date">{date}</div>
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
