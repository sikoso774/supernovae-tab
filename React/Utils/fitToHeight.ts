/**
 * Keeps the home dashboard on one screen: when its content is taller than the
 * window, the whole block is scaled down (CSS transform) instead of scrolling.
 * Scaling is uniform, so proportions are kept whatever the window, the open
 * side panels or the number of wrapped button rows. No Obsidian import here so
 * it can be checked in a plain browser page.
 */

/** Below this the text gets too small: the wrapper scrolls instead. */
export const MIN_FIT_SCALE = 0.5;

export const computeFitScale = (
	available: number,
	needed: number,
	min = MIN_FIT_SCALE
): number => {
	if (available <= 0 || needed <= available) return 1;
	return Math.max(min, available / needed);
};

/**
 * `fit` is the block to scale; its CSS reads the `--fit` variable (scale, and
 * height = 100% / scale so the scaled block exactly fills `wrapper`).
 * Returns a cleanup function.
 */
export const attachFit = (
	fit: HTMLElement,
	wrapper: HTMLElement
): (() => void) => {
	let timer = 0;

	const measure = () => {
		timer = 0;
		// Natural height: at scale 1 with an automatic height, every section takes its content size
		fit.style.setProperty("--fit", "1");
		fit.style.height = "auto";
		const needed = fit.offsetHeight;
		fit.style.height = "";
		const available = wrapper.clientHeight;
		const scale = computeFitScale(available, needed);
		fit.style.setProperty("--fit", String(scale));
		// Scrolling only as a last resort, once the minimum scale is reached
		wrapper.style.overflowY = needed * scale > available + 1 ? "auto" : "hidden";
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
