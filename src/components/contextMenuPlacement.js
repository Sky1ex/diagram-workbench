import { useLayoutEffect, useState } from 'react';

export const VIEWPORT_PADDING = 8;

export function fitRectInViewport(
	anchorX,
	anchorY,
	width,
	height,
	padding = VIEWPORT_PADDING
) {
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const maxHeight = viewportHeight - padding * 2;
	const effectiveHeight = Math.min(height, maxHeight);

	let left = anchorX;
	let top = anchorY;

	if (left + width + padding > viewportWidth) {
		left = anchorX - width;
	}

	if (top + effectiveHeight + padding > viewportHeight) {
		top = anchorY - effectiveHeight;
	}

	left = Math.max(padding, Math.min(left, viewportWidth - width - padding));
	top = Math.max(padding, Math.min(top, viewportHeight - effectiveHeight - padding));

	return { left, top };
}

/** @deprecated Prefer useContextMenuPlacement with measured menu size. */
export function computeContextMenuPlacement(
	clientX,
	clientY,
	menuWidth = 180,
	menuHeight = 120
) {
	return fitRectInViewport(clientX, clientY, menuWidth, menuHeight);
}

function placementEqual(a, b) {
	return a.left === b.left && a.top === b.top;
}

export function useContextMenuPlacement(
	anchorX,
	anchorY,
	menuRef,
	layoutKey
) {
	const [placement, setPlacement] = useState({ left: 0, top: 0 });

	useLayoutEffect(() => {
		if (anchorX === null || anchorY === null) return;

		const menu = menuRef.current;
		if (!menu) return;

		const updatePlacement = () => {
			const el = menuRef.current;
			if (!el || anchorX === null || anchorY === null) return;
			const { width, height } = el.getBoundingClientRect();
			if (width <= 0 || height <= 0) return;
			const next = fitRectInViewport(anchorX, anchorY, width, height);
			setPlacement((prev) => placementEqual(prev, next) ? prev : next);
		};

		updatePlacement();

		const observer = new ResizeObserver(updatePlacement);
		observer.observe(menu);
		window.addEventListener('resize', updatePlacement);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', updatePlacement);
		};
	}, [anchorX, anchorY, menuRef, layoutKey]);

	return placement;
}