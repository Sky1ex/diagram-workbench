import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import * as THREE from 'three';

import { dollyOrbitCamera, normalizeWheelDelta, wheelDeltaToZoomScale } from './cameraZoom';

const DESKTOP_TOUCHES = {
	ONE: THREE.TOUCH.ROTATE,
	TWO: THREE.TOUCH.DOLLY_PAN
};

/** Мобильный режим «Панорама»: один палец — сдвиг, два — масштаб. */
const MOBILE_PAN_TOUCHES = {
	ONE: THREE.TOUCH.PAN,
	TWO: THREE.TOUCH.DOLLY_PAN
};

/** Мобильный режим «Орбита»: один палец — поворот, два — масштаб. */
const MOBILE_ORBIT_TOUCHES = {
	ONE: THREE.TOUCH.ROTATE,
	TWO: THREE.TOUCH.DOLLY_PAN
};

function resolveTouches(mobile, touchMode) {
	if (!mobile) return DESKTOP_TOUCHES;
	return touchMode === 'orbit' ? MOBILE_ORBIT_TOUCHES : MOBILE_PAN_TOUCHES;
}

export function DagOrbitControls({
	enabled = true,
	mobile = false,
	touchMode = 'pan'
}) {
	const controlsRef = useRef(null);
	const { gl } = useThree();

	useEffect(() => {
		const controls = controlsRef.current;
		if (!controls) return;
		controls.touches = { ...resolveTouches(mobile, touchMode) };
		controls.enableZoom = mobile;
	}, [mobile, touchMode]);

	useEffect(() => {
		if (mobile) return;

		const controls = controlsRef.current;
		if (!controls) return;

		const onWheel = (event) => {
			if (!enabled) return;
			event.preventDefault();

			const delta = normalizeWheelDelta(event);
			const scale = wheelDeltaToZoomScale(delta);
			if (scale === 1) return;

			dollyOrbitCamera(controls, scale);
		};

		const element = gl.domElement;
		element.addEventListener('wheel', onWheel, { passive: false });
		return () => element.removeEventListener('wheel', onWheel);
	}, [gl, enabled, mobile]);

	return (
		<OrbitControls
			ref={controlsRef}
			makeDefault
			enabled={enabled}
			enableDamping
			dampingFactor={0.06}
			enableZoom={mobile}
			zoomSpeed={mobile ? 1.15 : 1}
			rotateSpeed={0.85}
			panSpeed={mobile && touchMode === 'pan' ? 1.25 : 1}
			screenSpacePanning
			minDistance={0.5}
			maxDistance={800}
		/>
	);
}
