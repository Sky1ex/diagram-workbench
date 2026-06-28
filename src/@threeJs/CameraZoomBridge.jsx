import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

import { CAMERA_ZOOM_STEP, dollyOrbitCamera } from './cameraZoom';

export function CameraZoomBridge({ apiRef }) {
	const controls = useThree((state) => state.controls);

	useEffect(() => {
		if (!apiRef) return;

		apiRef.current = {
			zoomIn: () => dollyOrbitCamera(controls, 1 / CAMERA_ZOOM_STEP),
			zoomOut: () => dollyOrbitCamera(controls, CAMERA_ZOOM_STEP)
		};

		return () => {
			apiRef.current = null;
		};
	}, [apiRef, controls]);

	return null;
}
