import { toFlowNodeId } from '@graphLayout';

export function parseFlowNodeId(flowId) {
	const separator = flowId.indexOf(':');
	if (separator <= 0) return null;
	return {
		graphId: flowId.slice(0, separator),
		localId: flowId.slice(separator + 1)
	};
}

export function findGraphNode(document, flowId) {
	const parsed = parseFlowNodeId(flowId);
	if (!parsed) return null;
	const graph = document.graphs[parsed.graphId];
	return graph?.nodes.find((node) => node.id === parsed.localId) ?? null;
}

export function nodeToHitAttributes(node, graphId) {
	return {
		label: node.label,
		depth: node.depth,
		subgraphId: node.subgraphId,
		start: node.start,
		end: node.end,
		graphId,
		localId: node.id,
		flowId: toFlowNodeId(graphId, node.id)
	};
}