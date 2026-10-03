import { useEffect, useMemo, useState } from "react";
import { SearchResult } from "React/Utils/searchIndex";
import VaultSearch, { SearchStatus } from "src/Search/VaultSearch";

const NO_RESULT: SearchResult = { hits: [], partial: false };
const NOT_READY: SearchStatus = { indexed: 0, total: 0, ready: false, version: 0 };
/** Wait for a pause in the typing before searching. */
const TYPING_PAUSE = 60;

/**
 * Results of `query` in the vault index. The search itself takes a few
 * milliseconds, so it runs synchronously; it runs again whenever the index
 * changes (first build, a note edited) so the list never goes stale.
 */
const useVaultSearch = (
	search: VaultSearch | undefined,
	query: string,
	limit = 30
): { result: SearchResult; status: SearchStatus; settledQuery: string } => {
	const [status, setStatus] = useState<SearchStatus>(
		search ? search.status.getValue() : NOT_READY
	);
	const [settledQuery, setSettledQuery] = useState(query);

	useEffect(() => {
		if (!search) return;
		setStatus(search.status.getValue());
		return search.status.onChange(setStatus);
	}, [search]);

	useEffect(() => {
		const timer = window.setTimeout(() => setSettledQuery(query), TYPING_PAUSE);
		return () => window.clearTimeout(timer);
	}, [query]);

	const result = useMemo(
		() =>
			search && settledQuery.trim().length > 0
				? search.index.search(settledQuery, limit)
				: NO_RESULT,
		[search, settledQuery, status.version, limit]
	);

	return { result, status, settledQuery };
};

export default useVaultSearch;
