import React from "react";
import { Range, splitByRanges } from "React/Utils/searchSnippet";

/** `text` with the given ranges wrapped in `<mark>`. */
const Highlighted = ({ text, ranges }: { text: string; ranges: Range[] }) => (
	<>
		{splitByRanges(text, ranges).map((segment, i) =>
			segment.hit ? (
				<mark key={i} className="galaxy-hit">
					{segment.text}
				</mark>
			) : (
				<React.Fragment key={i}>{segment.text}</React.Fragment>
			)
		)}
	</>
);

export default Highlighted;
