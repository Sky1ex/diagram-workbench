function isGroupNodeType(type) {
	return type === 'groupNode' || type === 'compactGroupNode';
}

/**
 * Фильтр для React Flow: как Three.js — оставляем только visibleNodeIds / visibleEdgeIds.
 * Раскрытые groupNode (обёртка подграфа с «−») сохраняются для навигации.
 */
export function filterFlowScene(
	nodes,
	edges,
	visibleNodeIds,
	visibleEdgeIds,
	visibilityActive,
	expandedHostFlowIds
) {
	if (!visibilityActive) {
		return { nodes, edges };
	}

	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const keepIds = new Set();

	for (const node of nodes) {
		const type = node.type ?? 'dagNode';
		if (type === 'layoutAnchor') continue;

		if (isGroupNodeType(type)) {
			if (expandedHostFlowIds.has(node.id) || visibleNodeIds.has(node.id)) {
				keepIds.add(node.id);
			}
			continue;
		}

		if (visibleNodeIds.has(node.id)) {
			keepIds.add(node.id);
		}
	}

	for (const hostId of expandedHostFlowIds) {
		if (nodeById.has(hostId)) keepIds.add(hostId);
	}

	for (const id of [...keepIds]) {
		let parentId = nodeById.get(id)?.parentId;
		while (parentId) {
			keepIds.add(parentId);
			parentId = nodeById.get(parentId)?.parentId;
		}
	}

	const filteredNodes = nodes.filter((node) => {
		if (node.type === 'layoutAnchor') return false;
		return keepIds.has(node.id);
	});

	const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));
	const filteredEdges = edges.filter(
		(edge) =>
			visibleEdgeIds.has(edge.id) &&
			filteredNodeIds.has(edge.source) &&
			filteredNodeIds.has(edge.target)
	);

	return { nodes: filteredNodes, edges: filteredEdges };
}