export function toFlowNodeId(graphId, localId) {
	return `${graphId}:${localId}`;
}

export function toFlowEdgeId(
	graphId,
	source,
	target,
	index
) {
	return `${graphId}:${source}->${target}:${index}`;
}