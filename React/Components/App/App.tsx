import React, { useEffect, useMemo, useState, useRef } from "react";
import { useObsidian } from "../../Context/ObsidianAppContext";
import { TFile, getIcon } from "obsidian";
import getTime from "React/Utils/getTime";
import getDate from "React/Utils/getDate";
import Observable from "src/Utils/Observable";
import TabGalaxyPlugin from "main";
import getTimeOfDayGreeting from "React/Utils/getTimeOfDayGreeting";
import { getBookmarks } from "React/Utils/getBookmarks";
import { TabGalaxyPluginSettings } from "src/Settings/Settings";
import getQuote from "React/Utils/getQuote";
import StarField from "../StarField/StarField";

const Icon = ({ name }: { name: string }) => {
	const iconText = new XMLSerializer().serializeToString(
		getIcon(name) || new Node()
	);
	return (
		<span
			className="galaxy-icon"
			dangerouslySetInnerHTML={{ __html: iconText }}
		></span>
	);
};

const App = ({
	settingsObservable,
	plugin,
}: {
	settingsObservable: Observable;
	plugin: TabGalaxyPlugin;
}) => {
	const [quote, setQuote] = useState<{
		content: string;
		author: string;
	} | null>(null);
	const [settings, setSettings] = useState<TabGalaxyPluginSettings>(
		settingsObservable.getValue()
	);
	const [time, setTime] = useState(getTime(settings.timeFormat));
	const [date, setDate] = useState(getDate());
	const mainDivRef = useRef<HTMLDivElement>(null);

	const obsidian = useObsidian();

	const allVaultFiles = obsidian?.vault.getAllLoadedFiles();
	const latestModifiedMarkdownFiles = useMemo(() => {
		const files = allVaultFiles?.filter(
			(file) => file instanceof TFile && file.extension === "md"
		);
		files?.sort((a, b) =>
			a instanceof TFile && b instanceof TFile
				? b.stat.mtime - a.stat.mtime
				: 0
		);
		return files?.slice(0, 5);
	}, [allVaultFiles]);

	const bookmarks = useMemo(
		() => getBookmarks(obsidian, settings).slice(0, 5),
		[obsidian, settings]
	);

	useEffect(() => {
		const timer = setInterval(() => {
			setTime(getTime(settings.timeFormat));
			setDate(getDate());
		}, 1000);
		return () => clearInterval(timer);
	}, [setTime, settings]);

	useEffect(() => {
		getQuote(settings.quoteSource, settings.customQuotes).then(
			(newQuote: any) => setQuote(newQuote)
		);
	}, [setQuote, settings.quoteSource, settings.customQuotes]);

	useEffect(() => {
		const unsubscribe = settingsObservable.onChange(
			(newSettings: TabGalaxyPluginSettings) => setSettings(newSettings)
		);
		return () => unsubscribe();
	}, [setSettings]);

	useEffect(() => {
		mainDivRef?.current?.focus();
	}, []);

	return (
		<div
			className="galaxy-root"
			onKeyDown={(e) => {
				if (!e.ctrlKey && !e.altKey && /^[A-Za-z0-9]$/.test(e.key)) {
					plugin.openSwitcherCommand(
						settings.inlineSearchProvider.command
					);
				}
			}}
			tabIndex={0}
			ref={mainDivRef}
		>
			<StarField />
			<div className="galaxy-wrapper">
				<div className="galaxy-top">
					{settings.showTopLeftSearchButton && (
						<a
							className="galaxy-iconbutton"
							onClick={() => {
								plugin.openSwitcherCommand(
									settings.topLeftSearchProvider.command
								);
							}}
						>
							<span className="galaxy-iconbutton-text">
								Open Search
							</span>
							<Icon name="search" />
						</a>
					)}
				</div>
				<div className="galaxy-center">
					{settings.showTime && (
						<div className="galaxy-time">{time}</div>
					)}
					{settings.showTime && (
						<div className="galaxy-date">{date}</div>
					)}
					{settings.showGreeting && (
						<div className="galaxy-greeting">
							{settings.greetingText
								.replace(/{{greeting}}/gi, getTimeOfDayGreeting())
								.replace(/{{name}}/gi, settings.userName || "explorer")}
						</div>
					)}
				</div>
				<div className="galaxy-bottom">
					<div className="galaxy-search">
						{settings.showInlineSearch && (
							<a
								className="galaxy-search-wrapper"
								onClick={() => {
									plugin.openSwitcherCommand(
										settings.inlineSearchProvider.command
									);
								}}
							>
								<Icon name="search" />
								<span className="galaxy-search-text">
									Rechercher dans le vault...
								</span>
							</a>
						)}
					</div>
					{settings.showRecentFiles && (
						<div className="galaxy-recentlyedited">
							{latestModifiedMarkdownFiles?.map(
								(file) =>
									file instanceof TFile && (
										<a
											key={file.path}
											className="galaxy-recentlyedited-file"
											data-path={file.path}
											onClick={() => {
												const leaf =
													obsidian?.workspace.getMostRecentLeaf();
												if (file instanceof TFile) {
													leaf?.openFile(file);
												}
											}}
										>
											<Icon name="file" />
											<span className="galaxy-recentlyedited-file-name">
												{file.basename}
											</span>
										</a>
									)
							)}
						</div>
					)}
					{settings.showBookmarks && (
						<div className="galaxy-recentlyedited">
							{bookmarks?.map(
								(file: TFile) =>
									file && (
										<a
											key={file.path}
											className="galaxy-recentlyedited-file"
											data-path={file.path}
											onClick={() => {
												const leaf =
													obsidian?.workspace.getMostRecentLeaf();
												if (file instanceof TFile) {
													leaf?.openFile(file);
												}
											}}
										>
											<Icon name="bookmark" />
											<span className="galaxy-recentlyedited-file-name">
												{file.basename}
											</span>
										</a>
									)
							)}
						</div>
					)}
				</div>
				<div className="galaxy-quote">
					{quote && settings.showQuote && (
						<div className="galaxy-quote-content">
							&quot;{quote.content}&quot;
						</div>
					)}
					{quote && settings.showQuote && (
						<div className="galaxy-quote-author">
							— {quote.author}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default App;
