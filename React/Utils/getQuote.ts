import { requestUrl } from "obsidian";
import { QUOTE_SOURCE } from "src/Types/Enums";
import { CustomQuote } from "src/Types/Interfaces";

export interface Quote {
	content: string;
	author: string;
}

interface QuotableResponse {
	content?: unknown;
	author?: unknown;
}

const fetchQuotable = async (): Promise<Quote | null> => {
	const res = await requestUrl("https://api.quotable.io/random");
	if (res.status !== 200) return null;
	const data = res.json as QuotableResponse;
	if (typeof data.content !== "string") return null;
	return {
		content: data.content,
		author: typeof data.author === "string" ? data.author : "",
	};
};

/**
 * Based on the configured quoteSource, gets a random quote from Quoteable, a custom quote, or both.
 * @param quoteSource
 * @param customQuotes
 */
const getQuote = async (
	quoteSource: QUOTE_SOURCE,
	customQuotes: CustomQuote[]
): Promise<Quote | null> => {
	let actualQuoteSource = quoteSource;

	// If set to both, pick one of the two at random
	if (quoteSource === QUOTE_SOURCE.BOTH) {
		actualQuoteSource = [QUOTE_SOURCE.QUOTEABLE, QUOTE_SOURCE.MY_QUOTES][
			Math.floor(Math.random() * 2)
		];
	}

	if (actualQuoteSource === QUOTE_SOURCE.QUOTEABLE) {
		return fetchQuotable();
	}

	if (actualQuoteSource === QUOTE_SOURCE.MY_QUOTES && customQuotes.length) {
		const randomQuote =
			customQuotes[Math.floor(Math.random() * customQuotes.length)];
		return { content: randomQuote.text, author: randomQuote.author };
	}

	return null;
};

export default getQuote;
