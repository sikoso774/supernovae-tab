/**
 * Keeps the home dashboard on one screen: when the window is too small for it,
 * the whole block is scaled down (CSS transform) instead of being cropped or
 * scrolled. Scaling is uniform, so the layout and its proportions are kept
 * whatever the window, the open side panels or the number of wrapped rows.
 * No Obsidian import here so it can be checked in a plain browser page.
 */

/** Below this the text gets too small: the wrapper scrolls instead. */
export const MIN_FIT_SCALE = 0.5;

/** Width the three-column layout is designed for; narrower windows scale it down. */
export const DESIGN_WIDTH = 1200;

/** Scale that makes `needed` fit in `available` (1 when it already fits). */
export const computeFitScale = (
	available: number,
	needed: number,
	min = MIN_FIT_SCALE
): number => {
	if (available <= 0 || needed <= available) return 1;
	return Math.max(min, available / needed);
};

/**
 * Scale imposed by the width alone: the layout keeps at least `designWidth`
 * of room, so a narrower window shrinks it proportionally.
 */
export const widthScale = (
	width: number,
	designWidth = DESIGN_WIDTH,
	min = MIN_FIT_SCALE
): number => (width >= designWidth ? 1 : Math.max(min, width / designWidth));

/**
 * `fit` is the block to scale; its CSS reads the `--fit` variable (scale, and
 * width and height = 100% / scale so the scaled block exactly fills `wrapper`).
 * The layout width grows as the scale drops, which shortens the block: the
 * scale is refined a few times, then checked so that the result always fits.
 * Returns a cleanup function.
 */
export const attachFit = (
	fit: HTMLElement,
	wrapper: HTMLElement
): (() => void) => {
	let timer = 0;

	// Height of the block when every section takes its content size
	const naturalHeight = (scale: number): number => {
		fit.style.setProperty("--fit", String(scale));
		fit.style.height = "auto";
		const height = fit.offsetHeight;
		fit.style.height = "";
		return height;
	};

	const measure = () => {
		timer = 0;
		const width = wrapper.clientWidth;
		const height = wrapper.clientHeight;
		if (width <= 0 || height <= 0) return;

		const byWidth = widthScale(width);
		let scale = byWidth;
		let needed = naturalHeight(scale);
		for (let i = 0; i < 3; i++) {
			const next = Math.min(byWidth, computeFitScale(height, needed));
			if (Math.abs(next - scale) < 0.005) break;
			scale = next;
			needed = naturalHeight(scale);
		}
		// A smaller scale only widens the layout, so shrinking further always fits
		if (needed * scale > height + 1 && scale > MIN_FIT_SCALE) {
			scale = Math.max(MIN_FIT_SCALE, height / needed);
			needed = naturalHeight(scale);
		}
		fit.style.setProperty("--fit", String(scale));
		// Scrolling only as a last resort, once the minimum scale is reached
		wrapper.style.overflow = needed * scale > height + 1 ? "auto" : "hidden";
	};

	// A timer rather than requestAnimationFrame: frames are paused while the window is hidden
	const schedule = () => {
		if (timer === 0) timer = window.setTimeout(measure, 16);
	};

	const resizes = new ResizeObserver(schedule);
	resizes.observe(wrapper);
	// Added or removed nodes only: the clock text changes every second
	const mutations = new MutationObserver(schedule);
	mutations.observe(fit, { childList: true, subtree: true });
	// The embedded font changes the text metrics once it is ready
	void document.fonts?.ready.then(schedule);
	schedule();

	return () => {
		resizes.disconnect();
		mutations.disconnect();
		if (timer !== 0) window.clearTimeout(timer);
	};
};
