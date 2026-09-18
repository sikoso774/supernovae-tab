import { useEffect, useRef } from "react";
import { Platform } from "obsidian";

interface Star {
	x: number;
	y: number;
	radius: number;
	opacity: number;
	twinkleSpeed: number;
	phase: number;
}

interface ConstellationEdge {
	a: number;
	b: number;
}

interface ShootingStar {
	x: number;
	y: number;
	angle: number;
	speed: number;
	length: number;
	opacity: number;
}

// Mobile WebViews (iOS WKWebView especially) have a tight memory/GPU budget:
// fewer stars, lower frame rate.
const IS_MOBILE = Platform.isMobile;
const MAX_STARS = IS_MOBILE ? 150 : 400;
const FRAME_INTERVAL = 1000 / (IS_MOBILE ? 30 : 60);
const STAR_AREA = IS_MOBILE ? 9000 : 6000;
const GLOW_SPRITE_SIZE = 32;

const drawPlanet = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
	const px = w * 0.82;
	const py = h * 0.76;
	const r = Math.min(w * 0.12, h * 0.19);

	// Outer atmosphere glow
	const glow = ctx.createRadialGradient(px, py, r * 0.5, px, py, r * 2.6);
	glow.addColorStop(0, "rgba(60, 100, 220, 0.18)");
	glow.addColorStop(0.5, "rgba(40, 70, 180, 0.08)");
	glow.addColorStop(1, "rgba(0, 0, 0, 0)");
	ctx.fillStyle = glow;
	ctx.beginPath();
	ctx.arc(px, py, r * 2.6, 0, Math.PI * 2);
	ctx.fill();

	// Ring — far half (behind planet)
	ctx.save();
	ctx.translate(px, py);
	ctx.rotate(-0.22);
	ctx.scale(1, 0.26);
	ctx.beginPath();
	ctx.arc(0, 0, r * 1.62, Math.PI, Math.PI * 2);
	ctx.strokeStyle = "rgba(110, 160, 255, 0.30)";
	ctx.lineWidth = r * 0.22;
	ctx.stroke();
	ctx.restore();

	// Planet body — radial gradient with light source top-left
	const body = ctx.createRadialGradient(
		px - r * 0.28, py - r * 0.28, r * 0.05,
		px + r * 0.15, py + r * 0.15, r
	);
	body.addColorStop(0, "rgba(155, 190, 255, 0.65)");
	body.addColorStop(0.4, "rgba(65, 100, 205, 0.52)");
	body.addColorStop(0.82, "rgba(18, 42, 135, 0.40)");
	body.addColorStop(1, "rgba(6, 12, 65, 0.25)");
	ctx.beginPath();
	ctx.arc(px, py, r, 0, Math.PI * 2);
	ctx.fillStyle = body;
	ctx.fill();

	// Atmospheric rim
	const rim = ctx.createRadialGradient(px, py, r * 0.72, px, py, r * 1.06);
	rim.addColorStop(0, "rgba(0, 0, 0, 0)");
	rim.addColorStop(0.75, "rgba(90, 140, 255, 0.10)");
	rim.addColorStop(1, "rgba(120, 175, 255, 0.28)");
	ctx.beginPath();
	ctx.arc(px, py, r * 1.06, 0, Math.PI * 2);
	ctx.fillStyle = rim;
	ctx.fill();

	// Ring — near half (in front of planet)
	ctx.save();
	ctx.translate(px, py);
	ctx.rotate(-0.22);
	ctx.scale(1, 0.26);
	ctx.beginPath();
	ctx.arc(0, 0, r * 1.62, 0, Math.PI);
	ctx.strokeStyle = "rgba(150, 195, 255, 0.40)";
	ctx.lineWidth = r * 0.22;
	ctx.stroke();
	ctx.restore();
};

/**
 * Nebulae + planet never change between frames: render them once per resize
 * into an offscreen canvas instead of rebuilding gradients every frame.
 */
const renderStaticLayer = (w: number, h: number): HTMLCanvasElement => {
	const layer = createEl("canvas", { attr: { width: w, height: h } });
	const ctx = layer.getContext("2d");
	if (!ctx) return layer;

	const nebula1 = ctx.createRadialGradient(
		w * 0.25, h * 0.35, 0,
		w * 0.25, h * 0.35, w * 0.45
	);
	nebula1.addColorStop(0, "rgba(70, 20, 140, 0.14)");
	nebula1.addColorStop(0.5, "rgba(40, 10, 90, 0.07)");
	nebula1.addColorStop(1, "rgba(0, 0, 0, 0)");
	ctx.fillStyle = nebula1;
	ctx.fillRect(0, 0, w, h);

	const nebula2 = ctx.createRadialGradient(
		w * 0.75, h * 0.65, 0,
		w * 0.75, h * 0.65, w * 0.4
	);
	nebula2.addColorStop(0, "rgba(20, 50, 130, 0.12)");
	nebula2.addColorStop(1, "rgba(0, 0, 0, 0)");
	ctx.fillStyle = nebula2;
	ctx.fillRect(0, 0, w, h);

	drawPlanet(ctx, w, h);
	return layer;
};

/** Pre-rendered star glow, drawn with globalAlpha instead of a per-star gradient. */
const renderGlowSprite = (): HTMLCanvasElement => {
	const sprite = createEl("canvas", {
		attr: { width: GLOW_SPRITE_SIZE, height: GLOW_SPRITE_SIZE },
	});
	const ctx = sprite.getContext("2d");
	if (!ctx) return sprite;
	const c = GLOW_SPRITE_SIZE / 2;
	const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
	grad.addColorStop(0, "rgba(180, 210, 255, 0.5)");
	grad.addColorStop(1, "rgba(0, 0, 0, 0)");
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
	return sprite;
};

const StarField = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationId: number | null = null;
		let resizeTimer: number | null = null;
		let lastFrameTime = 0;
		let frame = 0;
		let isIntersecting = true;
		const stars: Star[] = [];
		const constellationEdges: ConstellationEdge[] = [];
		let shootingStar: ShootingStar | null = null;
		let nextShootingStarFrame = 300 + Math.random() * 300;
		let staticLayer: HTMLCanvasElement | null = null;
		const glowSprite = renderGlowSprite();

		const initStars = () => {
			stars.length = 0;
			const count = Math.min(
				MAX_STARS,
				Math.floor((canvas.width * canvas.height) / STAR_AREA)
			);
			for (let i = 0; i < count; i++) {
				stars.push({
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					radius: Math.random() * 1.4 + 0.2,
					opacity: Math.random() * 0.6 + 0.3,
					twinkleSpeed: Math.random() * 0.015 + 0.003,
					phase: Math.random() * Math.PI * 2,
				});
			}
		};

		const buildConstellations = () => {
			constellationEdges.length = 0;
			const maxDist = Math.min(canvas.width, canvas.height) * 0.18;
			const maxDistSq = maxDist * maxDist;
			const edgeSet = new Set<number>();
			const n = stars.length;
			for (let i = 0; i < n; i++) {
				let best1 = -1;
				let best2 = -1;
				let d1 = Infinity;
				let d2 = Infinity;
				for (let j = 0; j < n; j++) {
					if (i === j) continue;
					const dx = stars[i].x - stars[j].x;
					const dy = stars[i].y - stars[j].y;
					const d = dx * dx + dy * dy;
					if (d >= maxDistSq) continue;
					if (d < d1) {
						best2 = best1;
						d2 = d1;
						best1 = j;
						d1 = d;
					} else if (d < d2) {
						best2 = j;
						d2 = d;
					}
				}
				for (const j of [best1, best2]) {
					if (j < 0) continue;
					const key = i < j ? i * n + j : j * n + i;
					if (!edgeSet.has(key)) {
						edgeSet.add(key);
						constellationEdges.push({ a: i, b: j });
					}
				}
			}
		};

		const resize = () => {
			const w = canvas.offsetWidth;
			const h = canvas.offsetHeight;
			// Hidden tab (display: none) → nothing to draw, keep previous state
			if (w === 0 || h === 0) return;
			if (w === canvas.width && h === canvas.height && staticLayer) return;
			canvas.width = w;
			canvas.height = h;
			staticLayer = renderStaticLayer(w, h);
			initStars();
			buildConstellations();
		};

		const scheduleResize = () => {
			if (resizeTimer !== null) window.clearTimeout(resizeTimer);
			// iOS fires resize bursts (keyboard, rotation): debounce them
			resizeTimer = window.setTimeout(() => {
				resizeTimer = null;
				resize();
				updateLoop();
			}, 150);
		};

		const spawnShootingStar = () => {
			shootingStar = {
				x: Math.random() * canvas.width * 0.7,
				y: Math.random() * canvas.height * 0.4,
				angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
				speed: Math.random() * 7 + 5,
				length: Math.random() * 100 + 60,
				opacity: 1,
			};
		};

		const drawFrame = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			if (staticLayer) ctx.drawImage(staticLayer, 0, 0);

			// Constellation lines (between planet and stars)
			ctx.lineWidth = 1.0;
			ctx.strokeStyle = "rgb(140, 185, 255)";
			for (const edge of constellationEdges) {
				const sa = stars[edge.a];
				const sb = stars[edge.b];
				const twinkleA = Math.sin(frame * sa.twinkleSpeed + sa.phase) * 0.25 + 0.75;
				const twinkleB = Math.sin(frame * sb.twinkleSpeed + sb.phase) * 0.25 + 0.75;
				ctx.globalAlpha = Math.min(twinkleA, twinkleB) * 0.30;
				ctx.beginPath();
				ctx.moveTo(sa.x, sa.y);
				ctx.lineTo(sb.x, sb.y);
				ctx.stroke();
			}

			// Stars
			ctx.fillStyle = "rgb(230, 240, 255)";
			for (const star of stars) {
				const twinkle =
					Math.sin(frame * star.twinkleSpeed + star.phase) * 0.25 + 0.75;
				const alpha = star.opacity * twinkle;

				if (star.radius > 1.1) {
					const size = star.radius * 8;
					ctx.globalAlpha = alpha;
					ctx.drawImage(
						glowSprite,
						star.x - size / 2,
						star.y - size / 2,
						size,
						size
					);
				}

				ctx.globalAlpha = alpha;
				ctx.beginPath();
				ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;

			// Shooting star
			if (frame >= nextShootingStarFrame && !shootingStar) {
				spawnShootingStar();
				nextShootingStarFrame = frame + 250 + Math.random() * 350;
			}

			if (shootingStar) {
				shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
				shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
				shootingStar.opacity -= 0.022;

				if (shootingStar.opacity <= 0) {
					shootingStar = null;
				} else {
					const tailX =
						shootingStar.x -
						Math.cos(shootingStar.angle) * shootingStar.length;
					const tailY =
						shootingStar.y -
						Math.sin(shootingStar.angle) * shootingStar.length;
					const grad = ctx.createLinearGradient(
						tailX, tailY,
						shootingStar.x, shootingStar.y
					);
					grad.addColorStop(0, "rgba(200, 220, 255, 0)");
					grad.addColorStop(1, `rgba(255, 255, 255, ${shootingStar.opacity})`);
					ctx.beginPath();
					ctx.moveTo(tailX, tailY);
					ctx.lineTo(shootingStar.x, shootingStar.y);
					ctx.strokeStyle = grad;
					ctx.lineWidth = 1.5;
					ctx.stroke();
				}
			}

			frame++;
		};

		const tick = (now: number) => {
			animationId = window.requestAnimationFrame(tick);
			// Small tolerance: rAF timestamps jitter around the display refresh
			if (now - lastFrameTime < FRAME_INTERVAL - 4) return;
			lastFrameTime = now;
			drawFrame();
		};

		const shouldAnimate = () =>
			!document.hidden &&
			isIntersecting &&
			canvas.offsetWidth > 0 &&
			canvas.offsetHeight > 0;

		// Start/stop the loop so hidden tabs cost nothing
		const updateLoop = () => {
			if (shouldAnimate()) {
				if (animationId === null) {
					lastFrameTime = 0;
					animationId = window.requestAnimationFrame(tick);
				}
			} else if (animationId !== null) {
				window.cancelAnimationFrame(animationId);
				animationId = null;
			}
		};

		const resizeObserver = new ResizeObserver(scheduleResize);
		resizeObserver.observe(canvas);

		const intersectionObserver = new IntersectionObserver((entries) => {
			isIntersecting = entries.some((e) => e.isIntersecting);
			updateLoop();
		});
		intersectionObserver.observe(canvas);

		document.addEventListener("visibilitychange", updateLoop);

		resize();
		updateLoop();

		return () => {
			if (animationId !== null) window.cancelAnimationFrame(animationId);
			if (resizeTimer !== null) window.clearTimeout(resizeTimer);
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
			document.removeEventListener("visibilitychange", updateLoop);
			staticLayer = null;
		};
	}, []);

	return <canvas ref={canvasRef} className="galaxy-starfield" />;
};

export default StarField;
