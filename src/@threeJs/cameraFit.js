import * as THREE from 'three';

/** Минимальный запас по краям кадра (~2%). */
const FIT_PADDING = 1.02;

const DEFAULT_VIEW_DIRECTION = new THREE.Vector3(1, 0.72, 1).normalize();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _viewRight = new THREE.Vector3();
const _viewUp = new THREE.Vector3();
const _corner = new THREE.Vector3();
const _box = new THREE.Box3();

function getBoxCorners(box, corners) {
	const { min, max } = box;
	let i = 0;
	for (const x of [min.x, max.x]) {
		for (const y of [min.y, max.y]) {
			for (const z of [min.z, max.z]) {
				corners[i].set(x, y, z);
				i++;
			}
		}
	}
}

/**
 * Дистанция камеры по углам AABB (плотнее, чем bounding sphere).
 */
function distanceToFitBox(
	camera,
	box,
	viewDirection,
	padding
) {
	const center = box.getCenter(new THREE.Vector3());
	const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
	getBoxCorners(box, corners);

	_viewRight.crossVectors(viewDirection, _worldUp);
	if (_viewRight.lengthSq() < 1e-8) {
		_viewRight.set(1, 0, 0);
	}
	_viewRight.normalize();
	_viewUp.crossVectors(_viewRight, viewDirection).normalize();

	const fovRad = camera.fov * Math.PI / 180;
	const aspect = Math.max(camera.aspect, 0.01);
	const tanHalfVert = Math.tan(fovRad / 2);
	const tanHalfHoriz = Math.tan(halfHorizontalFromAspect(fovRad, aspect));

	let required = 0.5;

	for (const corner of corners) {
		_corner.copy(corner).sub(center);
		const horiz = Math.abs(_corner.dot(_viewRight));
		const vert = Math.abs(_corner.dot(_viewUp));
		const distVert = vert / tanHalfVert;
		const distHoriz = horiz / tanHalfHoriz;
		required = Math.max(required, distVert, distHoriz, 0.01);
	}

	return required * padding;
}

function halfHorizontalFromAspect(fovRad, aspect) {
	return Math.atan(Math.tan(fovRad / 2) * aspect);
}

export function computeSceneBounds(nodes) {
	if (nodes.length === 0) return null;

	_box.makeEmpty();
	for (const node of nodes) {
		const radius = node.isFolder ? 0.65 : 0.48;
		const center = new THREE.Vector3(...node.position);
		_box.expandByPoint(center.clone().addScalar(radius));
		_box.expandByPoint(center.clone().subScalar(radius));
	}
	return _box.isEmpty() ? null : _box.clone();
}

export function fitPerspectiveCameraToBounds(
	camera,
	box,
	controls,
	options
) {
	const padding = options?.padding ?? FIT_PADDING;
	const center = box.getCenter(new THREE.Vector3());
	const viewDir = options?.viewDirection?.clone().normalize() ?? DEFAULT_VIEW_DIRECTION;
	const distance = distanceToFitBox(camera, box, viewDir, padding);

	camera.position.copy(center).add(viewDir.clone().multiplyScalar(distance));
	camera.lookAt(center);

	camera.near = Math.max(0.05, distance / 2000);
	camera.far = Math.max(2000, distance * 80);
	camera.updateProjectionMatrix();

	if (controls) {
		controls.target.copy(center);
		controls.minDistance = Math.max(0.25, distance * 0.015);
		controls.maxDistance = Math.max(controls.minDistance * 4, distance * 30);
		controls.update();
	}

	return { center, distance };
}

export function fitCameraToGraphNodes(
	camera,
	nodes,
	controls
) {
	const box = computeSceneBounds(nodes);
	if (!box) return null;
	return fitPerspectiveCameraToBounds(camera, box, controls);
}