import React, { useEffect, useMemo, useRef } from "react";
import VaultSearch, { SearchStatus } from "src/Search/VaultSearch";
import { SearchHit, SearchResult } from "React/Utils/searchIndex";
import {
	Range,
	Snippet,
	breadcrumb,
	buildSnippet,
	findRanges,
} from "React/Utils/searchSnippet";
import Highlighted from "./Highlighted";
import SearchPreview from "./SearchPreview";

interface ResultItem {
	hit: SearchHit;
	titleRanges: Range[];
	snippet: Snippet;
}

/** The result list on the left, the preview of the selected note on the right. */
const SearchPanel = ({
	search,
	result,
	status,
	query,
	selected,
	onSelect,
	onOpen,
}: {
	search: VaultSearch;
	result: SearchResult;
	status: SearchStatus;
	query: string;
	selected: number;
	onSelect: (index: number) => void;
	onOpen: (hit: SearchHit, newTab: boolean) => void;
}) => {
	const listRef = useRef<HTMLDivElement>(null);

	const items = useMemo<ResultItem[]>(
		() =>
			result.hits.map((hit) => ({
				hit,
				titleRanges: findRanges(hit.title, hit.terms),
				snippet: buildSnippet(search.index.getDoc(hit.id)?.text ?? "", hit.terms),
			})),
		[result, search]
	);

	// Arrow keys move the selection past the visible part of the list
	useEffect(() => {
		const row = listRef.current?.querySelector(".is-selected");
		if (row) row.scrollIntoView({ block: "nearest" });
	}, [selected, items]);

	const indexing = !status.ready;
	let caption = "";
	if (indexing) {
		caption = `Indexation du coffre… ${status.indexed} / ${status.total}`;
	} else if (items.length > 0) {
		caption = `${items.length} résultat${items.length > 1 ? "s" : ""}`;
	}

	return (
		<div className="galaxy-results">
			<div className="galaxy-results-list" ref={listRef}>
				{caption && <div className="galaxy-results-caption">{caption}</div>}
				{result.partial && items.length > 0 && (
					<div className="galaxy-results-caption is-warning">
						Aucune note ne contient tous les mots : résultats partiels
					</div>
				)}
				{items.map(({ hit, titleRanges, snippet }, i) => (
					<div
						key={hit.id}
						className={`galaxy-result${i === selected ? " is-selected" : ""}`}
						onMouseMove={() => i !== selected && onSelect(i)}
						onClick={(e) => onOpen(hit, e.ctrlKey || e.metaKey)}
						onAuxClick={(e) => e.button === 1 && onOpen(hit, true)}
					>
						<div className="galaxy-result-title">
							<Highlighted text={hit.title} ranges={titleRanges} />
						</div>
						<div className="galaxy-result-path">{breadcrumb(hit.folder)}</div>
						{snippet.text && (
							<div className="galaxy-result-snippet">
								<Highlighted text={snippet.text} ranges={snippet.ranges} />
							</div>
						)}
					</div>
				))}
				{!indexing && items.length === 0 && query.trim().length > 0 && (
					<div className="galaxy-results-empty">
						Aucune note ne correspond à « {query.trim()} »
					</div>
				)}
			</div>
			<SearchPreview hit={items[selected]?.hit} onOpen={onOpen} />
		</div>
	);
};

export default SearchPanel;
