import { useCallback, useMemo, useState } from 'react';

import { LOD_ZOOM_THRESHOLD } from '@graphLayout';

function applyLodToNodes(
	nodes,
	lodActive) {
	if (!lodActive) return nodes;
	return nodes.map((node) => {
		if (node.type === 'folderNode') return { ...node, type: 'compactFolderNode' };
		if (node.type === 'groupNode') return { ...node, type: 'compactGroupNode' };
		return { ...node, type: 'compactDagNode' };
	});
}

function applyLodToEdges(
	edges,
	lodActive) {
	if (!lodActive) return edges;
	return edges.map((edge) => {
		if (edge.type === 'elkEdge') {
			return {
				...edge,
				type: 'step',
				data: undefined,
				pathOptions: { borderRadius: 0 }
			};
		}
		if (edge.type === 'step') {
			return {
				...edge,
				pathOptions: {
					borderRadius: 0,
					...edge.pathOptions
				}
			};
		}
		return edge;
	});
}

/**
 * LOD переключается только при пересечении порога zoom (onViewportChange),
 * без подписки useViewport — pan/zoom не ре-рендерит всю сцену каждый кадр.
 */
export function useGraphLod(
	nodes,
	edges,
	enableLod) {
	const [lodActive, setLodActive] = useState(false);
	const effectiveLodActive = enableLod && lodActive;

	const onViewportChange = useCallback(
		(viewport) => {
			if (!enableLod) return;
			const next = viewport.zoom < LOD_ZOOM_THRESHOLD;
			setLodActive((prev) => prev === next ? prev : next);
		},
		[enableLod]
	);

	const displayNodes = useMemo(
		() => applyLodToNodes(nodes, effectiveLodActive),
		[nodes, effectiveLodActive]
	);

	const displayEdges = useMemo(
		() => applyLodToEdges(edges, effectiveLodActive),
		[edges, effectiveLodActive]
	);

	return { displayNodes, displayEdges, lodActive: effectiveLodActive, onViewportChange };
}