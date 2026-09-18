import { useEffect, useRef } from "react";
import { getIcon } from "obsidian";

const Icon = ({ name }: { name: string }) => {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.empty();
		// getIcon returns null for unknown icon names: render nothing then
		const svg = getIcon(name);
		if (svg) el.appendChild(svg);
	}, [name]);

	return <span className="galaxy-icon" ref={ref} />;
};

export default Icon;
