function extractEdgePoints(elkEdge) {
	const section = elkEdge?.sections?.[0];
	if (!section) return undefined;
	return [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
}

export function applyElkResult(
	nodes,
	edges,
	layoutedGraph
) {
	const elkNodeById = new Map(layoutedGraph.children?.map((node) => [node.id, node]) ?? []);
	const elkEdgeById = new Map(layoutedGraph.edges?.map((edge) => [edge.id, edge]) ?? []);

	const layoutedNodes = nodes.map((node) => {
		const elkNode = elkNodeById.get(node.id);
		if (elkNode?.x === undefined || elkNode.y === undefined) return node;
		return {
			...node,
			position: { x: elkNode.x, y: elkNode.y }
		};
	});

	const layoutedEdges = edges.map((edge) => {
		const elkEdge = elkEdgeById.get(edge.id);
		const points = extractEdgePoints(elkEdge);
		return {
			...edge,
			type: 'elkEdge',
			data: { points }
		};
	});

	return { nodes: layoutedNodes, edges: layoutedEdges };
}