import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const LEAF_SCALE = 0.42;
const FOLDER_SCALE = 0.58;
const LEAF_COLOR = '#3b82f6';
const LEAF_SELECTED_COLOR = '#2563eb';
const FOLDER_COLOR = '#d97706';
const FOLDER_EXPANDED_COLOR = '#059669';
const FOLDER_SELECTED_COLOR = '#b45309';
const HOVER_EMISSIVE = '#ffffff';

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _color = new THREE.Color();

function stopPropagation(event) {
	event.stopPropagation();
}

function emitNodeContextMenu(
	event,
	node,
	isFolder,
	isExpanded,
	onNodeContextMenu
) {
	stopPropagation(event);
	const native = event.nativeEvent;
	native.preventDefault();
	onNodeContextMenu({
		clientX: native.clientX,
		clientY: native.clientY,
		nodeId: node.id,
		label: node.label,
		isFolder,
		isExpanded
	});
}

function FolderNodeMesh({
	node,
	shape,
	isExpanded,
	isSelected,
	onNodeSelect,
	onNodeContextMenu
}) {
	const [hovered, setHovered] = useState(false);
	const scale = FOLDER_SCALE;

	const baseColor = isExpanded ? FOLDER_EXPANDED_COLOR : FOLDER_COLOR;
	const color = isSelected ? FOLDER_SELECTED_COLOR : baseColor;

	return (
		<group position={node.position}>
			<mesh
				scale={scale}
				onClick={(event) => {
					stopPropagation(event);
					onNodeSelect(node.id);
				}}
				onContextMenu={(event) =>
					emitNodeContextMenu(event, node, true, isExpanded, onNodeContextMenu)
				}
				onPointerOver={(event) => {
					stopPropagation(event);
					setHovered(true);
				}}
				onPointerOut={() => setHovered(false)}>

				{shape === 'sphere' ?
					<sphereGeometry args={[1, 20, 20]} /> :

					<boxGeometry args={[1.2, 1.2, 1.2]} />
				}
				<meshStandardMaterial
					color={color}
					emissive={hovered || isSelected ? HOVER_EMISSIVE : '#000000'}
					emissiveIntensity={hovered ? 0.25 : isSelected ? 0.15 : 0}
					metalness={0.15}
					roughness={0.45}
				/>
			</mesh>
		</group>
	);
}

function createLeafGeometry(shape) {
	return shape === 'sphere' ?
		new THREE.SphereGeometry(1, 14, 14) :
		new THREE.BoxGeometry(1, 1, 1);
}

function LeafNodesInstanced({
	nodes,
	shape,
	selectedNodeId,
	onNodeSelect,
	onNodeContextMenu
}) {
	const meshRef = useRef(null);
	const geometry = useMemo(() => createLeafGeometry(shape), [shape]);
	const material = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: LEAF_COLOR,
				metalness: 0.1,
				roughness: 0.55
			}),
		[]
	);

	useEffect(() => () => geometry.dispose(), [geometry]);

	useLayoutEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		mesh.geometry = geometry;
		const count = nodes.length;
		mesh.count = count;

		if (count === 0) {
			mesh.instanceMatrix.needsUpdate = true;
			return;
		}

		_scale.set(LEAF_SCALE, LEAF_SCALE, LEAF_SCALE);
		_quaternion.identity();

		for (let i = 0; i < count; i++) {
			const node = nodes[i];
			const [x, y, z] = node.position;
			_position.set(x, y, z);
			_matrix.compose(_position, _quaternion, _scale);
			mesh.setMatrixAt(i, _matrix);

			const isSelected = selectedNodeId === node.id;
			_color.set(isSelected ? LEAF_SELECTED_COLOR : LEAF_COLOR);
			mesh.setColorAt(i, _color);
		}

		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		mesh.computeBoundingSphere();
	}, [nodes, shape, geometry, selectedNodeId]);

	if (nodes.length === 0) return null;

	return (
		<instancedMesh
			ref={meshRef}
			args={[geometry, material, nodes.length]}
			frustumCulled={false}
			onClick={(event) => {
				stopPropagation(event);
				const index = event.instanceId;
				if (index === undefined || index < 0 || index >= nodes.length) return;
				onNodeSelect(nodes[index].id);
			}}
			onContextMenu={(event) => {
				stopPropagation(event);
				const index = event.instanceId;
				if (index === undefined || index < 0 || index >= nodes.length) return;
				emitNodeContextMenu(event, nodes[index], false, false, onNodeContextMenu);
			}}
		/>
	);
}

export function GraphNodes3D({
	nodes,
	shape,
	expandedHostFlowIds,
	selectedNodeId,
	onNodeSelect,
	onNodeContextMenu
}) {
	const { folders, leaves } = useMemo(() => {
		const folderNodes = [];
		const leafNodes = [];
		for (const node of nodes) {
			if (node.isFolder) folderNodes.push(node); else
				leafNodes.push(node);
		}
		return { folders: folderNodes, leaves: leafNodes };
	}, [nodes]);

	return (
		<>
			<LeafNodesInstanced
				nodes={leaves}
				shape={shape}
				selectedNodeId={selectedNodeId}
				onNodeSelect={onNodeSelect}
				onNodeContextMenu={onNodeContextMenu}
			/>
			{folders.map((node) =>
				<FolderNodeMesh
					key={node.id}
					node={node}
					shape={shape}
					isExpanded={expandedHostFlowIds.has(node.id)}
					isSelected={selectedNodeId === node.id}
					onNodeSelect={onNodeSelect}
					onNodeContextMenu={onNodeContextMenu}
				/>
			)}
		</>
	);
}