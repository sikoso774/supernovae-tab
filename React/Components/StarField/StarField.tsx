import React, { useEffect, useRef } from "react";

interface Star {
	x: number;
	y: number;
	radius: number;
	opacity: number;
	twinkleSpeed: number;
	phase: number;
}

interface ShootingStar {
	x: number;
	y: number;
	angle: number;
	speed: number;
	length: number;
	opacity: number;
}

const StarField = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationId: number;
		let frame = 0;
		const stars: Star[] = [];
		let shootingStar: ShootingStar | null = null;
		let nextShootingStarFrame = 300 + Math.random() * 300;

		const resize = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
			initStars();
		};

		const initStars = () => {
			stars.length = 0;
			const count = Math.floor((canvas.width * canvas.height) / 6000);
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

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Nebula glows
			const nebula1 = ctx.createRadialGradient(
				canvas.width * 0.25, canvas.height * 0.35, 0,
				canvas.width * 0.25, canvas.height * 0.35, canvas.width * 0.45
			);
			nebula1.addColorStop(0, "rgba(70, 20, 140, 0.14)");
			nebula1.addColorStop(0.5, "rgba(40, 10, 90, 0.07)");
			nebula1.addColorStop(1, "rgba(0, 0, 0, 0)");
			ctx.fillStyle = nebula1;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const nebula2 = ctx.createRadialGradient(
				canvas.width * 0.75, canvas.height * 0.65, 0,
				canvas.width * 0.75, canvas.height * 0.65, canvas.width * 0.4
			);
			nebula2.addColorStop(0, "rgba(20, 50, 130, 0.12)");
			nebula2.addColorStop(1, "rgba(0, 0, 0, 0)");
			ctx.fillStyle = nebula2;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Stars
			for (const star of stars) {
				const twinkle = Math.sin(frame * star.twinkleSpeed + star.phase) * 0.25 + 0.75;
				const alpha = star.opacity * twinkle;

				if (star.radius > 1.1) {
					const glow = ctx.createRadialGradient(
						star.x, star.y, 0,
						star.x, star.y, star.radius * 4
					);
					glow.addColorStop(0, `rgba(180, 210, 255, ${alpha * 0.5})`);
					glow.addColorStop(1, "rgba(0, 0, 0, 0)");
					ctx.fillStyle = glow;
					ctx.fillRect(
						star.x - star.radius * 4,
						star.y - star.radius * 4,
						star.radius * 8,
						star.radius * 8
					);
				}

				ctx.beginPath();
				ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(230, 240, 255, ${alpha})`;
				ctx.fill();
			}

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
					const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length;
					const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length;
					const grad = ctx.createLinearGradient(tailX, tailY, shootingStar.x, shootingStar.y);
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
			animationId = requestAnimationFrame(draw);
		};

		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(canvas);
		resize();
		draw();

		return () => {
			cancelAnimationFrame(animationId);
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				pointerEvents: "none",
			}}
		/>
	);
};

export default StarField;
