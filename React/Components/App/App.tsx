import React, { useEffect, useMemo, useState, useRef } from "react";
import { useObsidian } from "../../Context/ObsidianAppContext";
import { TFile, getIcon } from "obsidian";
import getTime from "React/Utils/getTime";
import getDate from "React/Utils/getDate";
import Observable from "src/Utils/Observable";
import BeautitabPlugin from "main";
import getTimeOfDayGreeting from "React/Utils/getTimeOfDayGreeting";
import { getBookmarks } from "React/Utils/getBookmarks";
import { BeautitabPluginSettings } from "src/Settings/Settings";
import getQuote from "React/Utils/getQuote";
import StarField from "../StarField/StarField";

const Icon = ({ name }: { name: string }) => {
	const iconText = new XMLSerializer().serializeToString(
		getIcon(name) || new Node()
	);
	return (
		<span
			className="beautitab-icon"
			dangerouslySetInnerHTML={{ __html: iconText }}
		></span>
	);
};

const App = ({
	settingsObservable,
	plugin,
}: {
	settingsObservable: Observable;
	plugin: BeautitabPlugin;
}) => {
	const [quote, setQuote] = useState<{
		content: string;
		author: string;
	} | null>(null);
	const [settings, setSettings] = useState<BeautitabPluginSettings>(
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
			(newSettings: BeautitabPluginSettings) => setSettings(newSettings)
		);
		return () => unsubscribe();
	}, [setSettings]);

	useEffect(() => {
		mainDivRef?.current?.focus();
	}, []);

	return (
		<div
			className="beautitab-root"
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
			<div className="beautitab-wrapper">
				<div className="beautitab-top">
					{settings.showTopLeftSearchButton && (
						<a
							className="beautitab-iconbutton"
							onClick={() => {
								plugin.openSwitcherCommand(
									settings.topLeftSearchProvider.command
								);
							}}
						>
							<span className="beautitab-iconbutton-text">
								Open Search
							</span>
							<Icon name="search" />
						</a>
					)}
				</div>
				<div className="beautitab-center">
					{settings.showTime && (
						<div className="beautitab-time">{time}</div>
					)}
					{settings.showTime && (
						<div className="galaxy-date">{date}</div>
					)}
					{settings.showGreeting && (
						<div className="beautitab-greeting">
							{settings.greetingText.replace(
								/{{greeting}}/gi,
								getTimeOfDayGreeting()
							)}
						</div>
					)}
				</div>
				<div className="beautitab-bottom">
					<div className="beautitab-search">
						{settings.showInlineSearch && (
							<a
								className="beautitab-search-wrapper"
								onClick={() => {
									plugin.openSwitcherCommand(
										settings.inlineSearchProvider.command
									);
								}}
							>
								<Icon name="search" />
								<span className="beautitab-search-text">
									Rechercher dans le vault...
								</span>
							</a>
						)}
					</div>
					{settings.showRecentFiles && (
						<div className="beautitab-recentlyedited">
							{latestModifiedMarkdownFiles?.map(
								(file) =>
									file instanceof TFile && (
										<a
											key={file.path}
											className="beautitab-recentlyedited-file"
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
											<span className="beautitab-recentlyedited-file-name">
												{file.basename}
											</span>
										</a>
									)
							)}
						</div>
					)}
					{settings.showBookmarks && (
						<div className="beautitab-recentlyedited">
							{bookmarks?.map(
								(file: TFile) =>
									file && (
										<a
											key={file.path}
											className="beautitab-recentlyedited-file"
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
											<span className="beautitab-recentlyedited-file-name">
												{file.basename}
											</span>
										</a>
									)
							)}
						</div>
					)}
				</div>
				<div className="beautitab-quote">
					{quote && settings.showQuote && (
						<div className="beautitab-quote-content">
							&quot;{quote.content}&quot;
						</div>
					)}
					{quote && settings.showQuote && (
						<div className="beautitab-quote-author">
							— {quote.author}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default App;
