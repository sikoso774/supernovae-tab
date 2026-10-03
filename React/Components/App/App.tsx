import React, { useEffect, useMemo, useState, useRef } from "react";
import { useObsidian } from "../../Context/ObsidianAppContext";
import { TFile } from "obsidian";
import Observable from "src/Utils/Observable";
import TabGalaxyPlugin from "main";
import getTimeOfDayGreeting from "React/Utils/getTimeOfDayGreeting";
import { getBookmarks } from "React/Utils/getBookmarks";
import { TabGalaxyPluginSettings } from "src/Settings/Settings";
import getQuote, { Quote } from "React/Utils/getQuote";
import StarField from "../StarField/StarField";
import Icon from "../Icon/Icon";
import Clock from "../Clock/Clock";
import useVaultFiles, { getRecentMarkdownFiles } from "React/Utils/useVaultFiles";
import useVaultSearch from "React/Utils/useVaultSearch";
import { SearchHit } from "React/Utils/searchIndex";
import SearchInput from "../Search/SearchInput";
import SearchPanel from "../Search/SearchPanel";
import { middleClick, openInNewTab, openInThisTab } from "React/Utils/openNote";

const PRINTABLE_KEY = /^[A-Za-z0-9]$/;
/** Results skipped by Page Up / Page Down. */
const PAGE_STEP = 5;

const App = ({
	settingsObservable,
	plugin,
}: {
	settingsObservable: Observable<TabGalaxyPluginSettings>;
	plugin: TabGalaxyPlugin;
}) => {
	const [quote, setQuote] = useState<Quote | null>(null);
	const [settings, setSettings] = useState<TabGalaxyPluginSettings>(
		settingsObservable.getValue()
	);
	const mainDivRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const obsidian = useObsidian();

	// The built-in search needs its index; without it the bar opens the chosen provider
	const search = plugin.search;
	const builtInSearch =
		settings.showInlineSearch && settings.useBuiltInSearch && search !== undefined;
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState(0);
	const { result, status, settledQuery } = useVaultSearch(
		builtInSearch ? search : undefined,
		query
	);
	const searching = builtInSearch && query.trim().length > 0;
	const current = Math.min(selected, Math.max(0, result.hits.length - 1));

	useEffect(() => setSelected(0), [settledQuery]);

	const openHit = (hit: SearchHit, newTab: boolean) => {
		const file = obsidian?.vault.getAbstractFileByPath(hit.path);
		if (!(file instanceof TFile)) return;
		if (newTab) openInNewTab(obsidian, file);
		else openInThisTab(obsidian, file);
	};

	const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.nativeEvent.isComposing) return;
		const last = result.hits.length - 1;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setSelected(Math.min(last, current + 1));
				break;
			case "ArrowUp":
				e.preventDefault();
				setSelected(Math.max(0, current - 1));
				break;
			case "PageDown":
				e.preventDefault();
				setSelected(Math.min(last, current + PAGE_STEP));
				break;
			case "PageUp":
				e.preventDefault();
				setSelected(Math.max(0, current - PAGE_STEP));
				break;
			case "Enter":
				if (result.hits[current]) {
					e.preventDefault();
					openHit(result.hits[current], e.ctrlKey || e.metaKey);
				}
				break;
			case "Escape":
				if (query) setQuery("");
				else inputRef.current?.blur();
				break;
		}
	};

	const latestModifiedMarkdownFiles = useVaultFiles(obsidian, (app) =>
		getRecentMarkdownFiles(app)
	);

	const bookmarks = useMemo(
		() => getBookmarks(obsidian, settings).slice(0, 5),
		[obsidian, settings]
	);

	useEffect(() => {
		let cancelled = false;
		getQuote(settings.quoteSource, settings.customQuotes)
			.then((newQuote) => {
				if (!cancelled) setQuote(newQuote);
			})
			.catch((e) => console.error("Supernovae Tab: quote failed", e));
		return () => {
			cancelled = true;
		};
	}, [settings.quoteSource, settings.customQuotes]);

	useEffect(() => {
		const unsubscribe = settingsObservable.onChange(
			(newSettings: TabGalaxyPluginSettings) => setSettings(newSettings)
		);
		return () => unsubscribe();
	}, [settingsObservable]);

	useEffect(() => {
		(builtInSearch ? inputRef.current : mainDivRef.current)?.focus();
	}, []);

	return (
		<div
			className={`galaxy-root${searching ? " is-searching" : ""}`}
			onKeyDown={(e) => {
				if (e.target === inputRef.current) return;
				if (!e.ctrlKey && !e.altKey && !e.metaKey && PRINTABLE_KEY.test(e.key)) {
					// Typing anywhere starts a search: the letter lands in the bar
					if (builtInSearch) inputRef.current?.focus();
					else
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
						<Clock
							timeFormat={settings.timeFormat}
							dateLanguage={settings.dateLanguage}
						/>
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
						{settings.showInlineSearch &&
							(builtInSearch ? (
								<SearchInput
									value={query}
									onChange={setQuery}
									onKeyDown={onSearchKeyDown}
									inputRef={inputRef}
								/>
							) : (
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
							))}
					</div>
					{searching && search && (
						<SearchPanel
							search={search}
							result={result}
							status={status}
							query={settledQuery}
							selected={current}
							onSelect={setSelected}
							onOpen={openHit}
						/>
					)}
					{settings.showRecentFiles && (
						<div className="galaxy-section">
							<div className="galaxy-section-label">
								<Icon name="clock" />
								<span>Récents</span>
							</div>
							<div className="galaxy-recentlyedited">
								{latestModifiedMarkdownFiles?.map(
									(file) =>
										file instanceof TFile && (
											<a
												key={file.path}
												className="galaxy-recentlyedited-file"
												data-path={file.path}
												onClick={() => openInThisTab(obsidian, file)}
												{...middleClick(() => openInNewTab(obsidian, file))}
											>
												<Icon name="file" />
												<span className="galaxy-recentlyedited-file-name">
													{file.basename}
												</span>
											</a>
										)
								)}
							</div>
						</div>
					)}
					{settings.showBookmarks && (
						<div className="galaxy-section">
							<div className="galaxy-section-label">
								<Icon name="bookmark" />
								<span>Signets</span>
							</div>
							<div className="galaxy-recentlyedited">
								{bookmarks?.map(
									(file: TFile) =>
										file && (
											<a
												key={file.path}
												className="galaxy-recentlyedited-file"
												data-path={file.path}
												onClick={() => openInThisTab(obsidian, file)}
												{...middleClick(() => openInNewTab(obsidian, file))}
											>
												<Icon name="file" />
												<span className="galaxy-recentlyedited-file-name">
													{file.basename}
												</span>
											</a>
										)
								)}
							</div>
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
