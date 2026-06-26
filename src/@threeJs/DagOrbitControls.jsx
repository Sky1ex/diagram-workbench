import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import * as THREE from 'three';

/** Фиксированный шаг зума за «щелчок» колеса (~10% масштаба). */
const ZOOM_STEP = 1.1;

/** Нормализация deltaY (line/pixel modes). */
function normalizeWheelDelta(event) {
	let delta = event.deltaY;
	if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
	if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= 100;
	return delta;
}

export function DagOrbitControls({ enabled = true }) {
	const controlsRef = useRef(null);
	const { gl } = useThree();

	useEffect(() => {
		const controls = controlsRef.current;
		if (!controls) return;

		const onWheel = (event) => {
			if (!enabled) return;
			event.preventDefault();

			const camera = controls.object;
			if (!(camera instanceof THREE.PerspectiveCamera)) return;

			const delta = normalizeWheelDelta(event);
			if (delta === 0) return;

			const distance = camera.position.distanceTo(controls.target);
			if (distance <= 0) return;

			const steps = Math.min(3, Math.max(1, Math.round(Math.abs(delta) / 100)));
			const scale = delta > 0 ? Math.pow(ZOOM_STEP, steps) : Math.pow(1 / ZOOM_STEP, steps);
			const newDistance = THREE.MathUtils.clamp(
				distance * scale,
				controls.minDistance,
				controls.maxDistance
			);

			const offset = camera.position.clone().sub(controls.target);
			offset.setLength(newDistance);
			camera.position.copy(controls.target).add(offset);
			controls.update();
		};

		const element = gl.domElement;
		element.addEventListener('wheel', onWheel, { passive: false });
		return () => element.removeEventListener('wheel', onWheel);
	}, [gl, enabled]);

	return (
		<OrbitControls
			ref={controlsRef}
			makeDefault
			enabled={enabled}
			enableDamping
			dampingFactor={0.06}
			enableZoom={false}
			rotateSpeed={0.85}
			panSpeed={1}
			screenSpacePanning
			minDistance={0.5}
			maxDistance={800}
		/>
	);
}