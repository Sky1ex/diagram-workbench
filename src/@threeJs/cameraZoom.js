import * as THREE from 'three';

/** Фиксированный шаг зума (~10% масштаба). */
export const CAMERA_ZOOM_STEP = 1.1;

export function dollyOrbitCamera(controls, scale) {
	if (!controls?.object || !controls.target) return;

	const camera = controls.object;
	if (!(camera instanceof THREE.PerspectiveCamera)) return;

	const distance = camera.position.distanceTo(controls.target);
	if (distance <= 0) return;

	const newDistance = THREE.MathUtils.clamp(
		distance * scale,
		controls.minDistance,
		controls.maxDistance
	);

	const offset = camera.position.clone().sub(controls.target);
	offset.setLength(newDistance);
	camera.position.copy(controls.target).add(offset);
	controls.update();
}

/** Нормализация deltaY (line/pixel modes). */
export function normalizeWheelDelta(event) {
	let delta = event.deltaY;
	if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
	if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= 100;
	return delta;
}

export function wheelDeltaToZoomScale(delta) {
	if (delta === 0) return 1;
	const steps = Math.min(3, Math.max(1, Math.round(Math.abs(delta) / 100)));
	return delta > 0 ? Math.pow(CAMERA_ZOOM_STEP, steps) : Math.pow(1 / CAMERA_ZOOM_STEP, steps);
}
