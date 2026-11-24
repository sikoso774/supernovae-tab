import React, { useEffect, useMemo, useRef, useState } from "react";
import { Notice, TFile, moment } from "obsidian";
import { useObsidian } from "../../Context/ObsidianAppContext";
import getTimeOfDayGreeting from "React/Utils/getTimeOfDayGreeting";
import Observable from "src/Utils/Observable";
import { attachFit } from "React/Utils/fitToWindow";
import useWritingActivity from "React/Utils/useWritingActivity";
import { TabGalaxyPluginSettings } from "src/Settings/Settings";
import { NavLink } from "src/Types/Interfaces";
import TabGalaxyPlugin from "main";
import StarField from "../StarField/StarField";
import Icon from "../Icon/Icon";
import Clock from "../Clock/Clock";
import Activity from "./Activity";
import DataNerds from "./DataNerds";
import DateCard from "./DateCard";
import DueBadge from "./DueBadge";
import Reviews from "./Reviews";
import useVaultFiles, {
	getRecentMarkdownFiles,
} from "React/Utils/useVaultFiles";
import { middleClick, openInNewTab } from "React/Utils/openNote";
import useReviewStats, {
	openCardAt,
	reviewDeck,
	setReviewSettings,
	useOpenReviewStats,
} from "React/Utils/reviewStats";
import useToday from "React/Utils/useToday";
import { buildHomeLayout } from "React/Utils/homeLayout";
import { openDailyNote } from "React/Utils/dailyNote";

interface NavRow {
	group: string;
	links: NavLink[];
}

const COMMAND_PREFIX = "command:";
const SR_REVIEW_COMMAND = "obsidian-spaced-repetition:srs-review-flashcards";

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
	const fitRef = useRef<HTMLDivElement>(null);
	const obsidian = useObsidian();

	const latestFiles = useVaultFiles(obsidian, (app) =>
		getRecentMarkdownFiles(app)
	);
	// Read once and shared by the streak card and the data card
	const counts = useWritingActivity(obsidian);
	const today = useToday();
	// Answers journalled by the SR Review Log plugin; null while it is not there
	const reviewStats = useReviewStats(obsidian, today);
	const openReviewStats = useOpenReviewStats(obsidian);
	const showReviews = settings.showReviews && reviewStats !== null;
	const navRows = useMemo(
		() => groupLinks(settings.homeNavLinks),
		[settings.homeNavLinks]
	);
	const mainLinks = navRows.find((row) => row.group === "")?.links ?? [];
	const groupRows = navRows.filter((row) => row.group !== "");

	// Each block has its own setting; the grid is rebuilt for the ones shown
	const showTabs = settings.showHomeNav && mainLinks.length > 0;
	const showGroups = settings.showHomeGroups && groupRows.length > 0;
	const layout = buildHomeLayout({
		tabs: showTabs,
		clock: settings.showHomeClock,
		date: settings.showHomeDate,
		groups: showGroups,
		recent: settings.showHomeRecent,
		activity: settings.showActivity,
		data: settings.showDataNerds,
		reviews: showReviews,
	});

	const resolvePath = (path: string) =>
		path === "{{today}}" ? moment().format("YYYY-MM-DD") : path;

	// Always in a tab of its own: the dashboard stays where it is
	const openTFile = (file: TFile) => openInNewTab(obsidian, file);

	// A link path "command:<id>" runs that Obsidian command instead of opening a note
	const openLink = (path: string) => {
		if (path.indexOf(COMMAND_PREFIX) === 0) {
			plugin.openSwitcherCommand(path.slice(COMMAND_PREFIX.length));
		} else {
			openFile(path);
		}
	};

	const openToday = () => void openDailyNote(obsidian, settings, today);

	const openFile = (path: string) => {
		// The daily note is created from the Templater template when it is missing
		if (path === "{{today}}") {
			openToday();
			return;
		}
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

	// Scale the whole dashboard down when the window is too small for it
	useEffect(() => {
		const fit = fitRef.current;
		const wrapper = fit?.parentElement;
		if (!fit || !wrapper) return;
		return attachFit(fit, wrapper);
	}, []);

	return (
		<div className="galaxy-root" ref={mainDivRef} tabIndex={0}>
			<StarField />
			<div className="galaxy-wrapper home-wrapper">
				<div className="home-fit" ref={fitRef}>
					<div className="home-pad home-pad--top" />
					<div
						className="home-grid"
						style={{
							gridTemplateAreas: layout.areas.map((row) => `"${row}"`).join(" "),
							gridTemplateRows: layout.rows,
						}}
					>
						{/* Onglets principaux */}
						{showTabs && (
							<div className="home-card home-tabs">
								{mainLinks.map((link) => (
									<a
										key={`${link.label}-${link.path}`}
										className={`home-nav-btn${link.path === "{{today}}" ? " home-nav-btn--today" : ""}`}
										onClick={() => openLink(link.path)}
										{...middleClick(() => openLink(link.path))}
									>
										{link.label}
										{link.badge === "due-cards" && <DueBadge />}
									</a>
								))}
							</div>
						)}

						{/* Heure + salutation */}
						{settings.showHomeClock && (
							<div className="galaxy-center home-center">
								<Clock
									timeFormat={settings.timeFormat}
									dateLanguage={settings.dateLanguage}
									showDate={false}
									className="home-time"
								/>
								<div className="galaxy-greeting">
									{settings.greetingText
										.replace(/{{greeting}}/gi, getTimeOfDayGreeting())
										.replace(
											/{{name}}/gi,
											settings.userName || "explorer"
										)}
								</div>
							</div>
						)}

						{settings.showHomeDate && (
							<DateCard language={settings.dateLanguage} onOpen={openToday} />
						)}

						{/* Groupes de liens (MIAGE…) : liste qui défile */}
						{showGroups && (
							<div className="home-card home-groups">
								<div className="home-card-title">
									{groupRows.length === 1
										? groupRows[0].group
										: "Raccourcis"}
								</div>
								<div className="home-scroll">
									{groupRows.map((row) => (
										<div key={row.group} className="home-list">
											{groupRows.length > 1 && (
												<div className="home-list-label">
													{row.group}
												</div>
											)}
											{row.links.map((link) => (
												<a
													key={`${link.label}-${link.path}`}
													className="home-list-row"
													onClick={() => openLink(link.path)}
													{...middleClick(() => openLink(link.path))}
												>
													{link.label}
													{link.badge === "due-cards" && (
														<DueBadge />
													)}
												</a>
											))}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Série + calendrier */}
						{settings.showActivity && (
							<Activity counts={counts} onOpenDay={openDay} />
						)}

						{/* Graphiques */}
						{settings.showDataNerds && (
							<DataNerds
									counts={counts}
									root={settings.domainsFolder}
									reviews={
										settings.dataCurve === "reviews" && reviewStats
											? {
													stats: reviewStats,
													onSettings: (patch) =>
														void setReviewSettings(obsidian, patch),
												}
											: null
									}
								/>
						)}

						{/* Notes récentes : liste qui défile */}
						{settings.showHomeRecent && (
							<div className="home-card home-recent">
								<div className="home-card-title">
									<Icon name="clock" />
									<span>Récents</span>
								</div>
								<div className="home-scroll">
									<div className="home-list">
										{latestFiles.map((file) => (
											<a
												key={file.path}
												className="home-list-row"
												onClick={() => openTFile(file)}
												{...middleClick(() => openTFile(file))}
											>
												<Icon name="file" />
												<span className="home-list-name">
													{file.basename}
												</span>
											</a>
										))}
									</div>
								</div>
							</div>
						)}

						{/* Révisions : réponses journalisées par SR Review Log */}
						{showReviews && reviewStats && (
							<Reviews
								stats={reviewStats}
								onOpenStats={openReviewStats}
								onReview={() => plugin.openSwitcherCommand(SR_REVIEW_COMMAND)}
								onReviewDeck={(path) => void reviewDeck(obsidian, path)}
								onOpenCard={(card) => openCardAt(obsidian, card.file, card.line)}
								onSettings={(patch) => void setReviewSettings(obsidian, patch)}
							/>
						)}
					</div>
					<div className="home-pad home-pad--bottom" />
				</div>
			</div>
		</div>
	);
};

export default Home;
