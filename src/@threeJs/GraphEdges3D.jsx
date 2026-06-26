import { useMemo } from 'react';
import * as THREE from 'three';

function resolvePosition(
	nodeId,
	visibleById,
	positionsByNodeId) {
	const visible = visibleById.get(nodeId);
	if (visible) return visible.position;
	return positionsByNodeId.get(nodeId) ?? null;
}

function buildSegmentPositions(
	edgeList,
	visibleById,
	positionsByNodeId) {
	const positions = [];

	for (const edge of edgeList) {
		const sourcePos = resolvePosition(edge.sourceId, visibleById, positionsByNodeId);
		const targetPos = resolvePosition(edge.targetId, visibleById, positionsByNodeId);
		if (!sourcePos || !targetPos) continue;
		positions.push(...sourcePos, ...targetPos);
	}

	if (positions.length === 0) return null;
	return new Float32Array(positions);
}

function toLineGeometry(positions) {
	if (!positions) return null;
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	return geometry;
}

function isIncident(edge, nodeId) {
	if (!nodeId) return false;
	return edge.sourceId === nodeId || edge.targetId === nodeId;
}

export function GraphEdges3D({
	edges,
	nodes,
	positionsByNodeId,
	selectedNodeId
}) {
	const visibleById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

	const { defaultGeometry, highlightGeometry } = useMemo(() => {
		const defaultEdges = [];
		const highlightEdges = [];

		for (const edge of edges) {
			if (isIncident(edge, selectedNodeId)) {
				highlightEdges.push(edge);
			} else {
				defaultEdges.push(edge);
			}
		}

		return {
			defaultGeometry: toLineGeometry(
				buildSegmentPositions(defaultEdges, visibleById, positionsByNodeId)
			),
			highlightGeometry: toLineGeometry(
				buildSegmentPositions(highlightEdges, visibleById, positionsByNodeId)
			)
		};
	}, [edges, visibleById, positionsByNodeId, selectedNodeId]);

	return (
		<>
			{defaultGeometry &&
				<lineSegments geometry={defaultGeometry}>
					<lineBasicMaterial color="#94a3b8" transparent opacity={0.55} />
				</lineSegments>
			}
			{highlightGeometry &&
				<lineSegments geometry={highlightGeometry}>
					<lineBasicMaterial color="#000000" linewidth={1} />
				</lineSegments>
			}
		</>
	);
}