import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

import * as THREE from 'three';

import { fitCameraToGraphNodes } from './cameraFit';

export function InitialCameraFit({
	nodes,
	fitKey
}) {
	const { camera, controls, size } = useThree();
	const lastFitKey = useRef(null);

	useEffect(() => {
		if (!(camera instanceof THREE.PerspectiveCamera)) return;
		if (size.width <= 0 || size.height <= 0) return;

		const orbit =
			controls && 'target' in controls ? controls : null;

		const runFit = () => {
			camera.aspect = size.width / size.height;
			camera.updateProjectionMatrix();
			fitCameraToGraphNodes(camera, nodes, orbit);
		};

		const shouldFit = fitKey !== lastFitKey.current;
		if (shouldFit) {
			lastFitKey.current = fitKey;
			const id = requestAnimationFrame(() => {
				requestAnimationFrame(runFit);
			});
			return () => cancelAnimationFrame(id);
		}

		// Ресайз: только aspect, без сброса позиции/зума
		camera.aspect = size.width / size.height;
		camera.updateProjectionMatrix();
	}, [camera, controls, fitKey, nodes, size.width, size.height]);

	return null;
}