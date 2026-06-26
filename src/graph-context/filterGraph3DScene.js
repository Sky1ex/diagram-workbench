

export function filterGraph3DScene(
	scene,
	visibleNodeIds,
	visibleEdgeIds,
	visibilityActive
) {
	if (!visibilityActive) return scene;

	const nodes = scene.nodes.filter((node) => visibleNodeIds.has(node.id));
	const nodeIds = new Set(nodes.map((node) => node.id));
	const edges = scene.edges.filter(
		(edge) =>
			visibleEdgeIds.has(edge.id) &&
			nodeIds.has(edge.sourceId) &&
			nodeIds.has(edge.targetId)
	);

	const positionsByNodeId = new Map();
	for (const node of nodes) {
		positionsByNodeId.set(node.id, node.position);
	}

	return {
		nodes,
		edges,
		positionsByNodeId
	};
}