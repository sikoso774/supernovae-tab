import React, { useEffect, useRef } from "react";
import { Component, MarkdownRenderer, TFile } from "obsidian";
import { useObsidian } from "../../Context/ObsidianAppContext";
import { SearchHit } from "React/Utils/searchIndex";
import { middleClick } from "React/Utils/openNote";
import { breadcrumb, previewSource } from "React/Utils/searchSnippet";
import { excalidrawBlocks, isExcalidrawPath } from "React/Utils/searchText";
import { highlightTerms } from "./highlight";

/** Wait for the selection to settle before rendering (arrow keys held down). */
const RENDER_DELAY = 120;

/**
 * The selected note, rendered by Obsidian itself: from the section that holds
 * the first match, with the matching words highlighted.
 */
const SearchPreview = ({
	hit,
	onOpen,
}: {
	hit: SearchHit | undefined;
	onOpen: (hit: SearchHit, newTab: boolean) => void;
}) => {
	const app = useObsidian();
	const bodyRef = useRef<HTMLDivElement>(null);
	const termsKey = hit ? hit.terms.join(" ") : "";

	useEffect(() => {
		const body = bodyRef.current;
		if (!app || !body) return;
		if (!hit) {
			body.replaceChildren();
			return;
		}

		let cancelled = false;
		const component = new Component();
		component.load();

		const render = async () => {
			// Hidden when the tab is narrow: nothing to render
			if (body.clientWidth === 0) return;
			const file = app.vault.getAbstractFileByPath(hit.path);
			if (!(file instanceof TFile)) return;
			const raw = await app.vault.cachedRead(file);
			if (cancelled) return;

			// A drawing is JSON: its texts are what can be read
			const source = isExcalidrawPath(hit.path)
				? excalidrawBlocks(raw).join("\n\n")
				: raw;
			const { markdown } = previewSource(source, hit.terms);

			// Rendered next to the current preview, which stays until this one is ready
			const holder = document.createElement("div");
			holder.className =
				"galaxy-preview-render markdown-preview-view markdown-rendered is-rendering";
			body.appendChild(holder);
			try {
				await MarkdownRenderer.render(app, markdown, holder, hit.path, component);
			} catch (e) {
				console.error("Supernovae Tab: preview failed", e);
				holder.textContent = markdown;
				holder.classList.add("is-plain");
			}
			if (cancelled) {
				holder.remove();
				return;
			}

			const first = highlightTerms(holder, hit.terms);
			Array.from(body.children).forEach((child) => {
				if (child !== holder) child.remove();
			});
			holder.classList.remove("is-rendering");
			body.scrollTop = 0;
			if (first) {
				const offset =
					first.getBoundingClientRect().top - body.getBoundingClientRect().top;
				body.scrollTop = Math.max(0, offset - body.clientHeight * 0.25);
			}
		};

		const timer = window.setTimeout(() => {
			render().catch((e) => console.error("Supernovae Tab: preview failed", e));
		}, RENDER_DELAY);

		return () => {
			cancelled = true;
			window.clearTimeout(timer);
			component.unload();
		};
	}, [app, hit?.id, hit?.path, termsKey]);

	const linkOf = (e: React.MouseEvent): HTMLAnchorElement | null =>
		(e.target as HTMLElement).closest("a.internal-link");

	// A link of the previewed note opens that note
	const openLink = (e: React.MouseEvent, newTab: boolean) => {
		const link = linkOf(e);
		if (!link || !hit || !app) return;
		e.preventDefault();
		const href = link.getAttribute("data-href") || link.getAttribute("href");
		if (href) void app.workspace.openLinkText(href, hit.path, newTab);
	};

	return (
		<div className="galaxy-preview">
			{hit ? (
				<div className="galaxy-preview-head">
					<a
						className="galaxy-preview-title"
						onClick={(e) => onOpen(hit, e.ctrlKey || e.metaKey)}
						{...middleClick(() => onOpen(hit, true))}
					>
						{hit.title}
					</a>
					<div className="galaxy-preview-path">{breadcrumb(hit.folder)}</div>
				</div>
			) : (
				<div className="galaxy-preview-empty">Aperçu de la note sélectionnée</div>
			)}
			<div
				className="galaxy-preview-body"
				ref={bodyRef}
				onClick={(e) => openLink(e, e.ctrlKey || e.metaKey)}
				onMouseDown={(e) => {
					// No scroll mode on a link: the middle click opens it in a new tab
					if (e.button === 1 && linkOf(e)) e.preventDefault();
				}}
				onAuxClick={(e) => e.button === 1 && openLink(e, true)}
			/>
		</div>
	);
};

export default SearchPreview;
