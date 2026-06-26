export function elkGraphFromFlowElements(
	nodes,
	edges,
	layoutOptions
) {
	const graphId = nodes[0]?.data.graphId ?? 'graph';

	return {
		id: `elk-root-${graphId}`,
		layoutOptions,
		children: nodes.map((node) => ({
			id: node.id,
			width: node.data.width,
			height: node.data.height
		})),
		edges: edges.map((edge) => ({
			id: edge.id,
			sources: [edge.source],
			targets: [edge.target]
		}))
	};
}