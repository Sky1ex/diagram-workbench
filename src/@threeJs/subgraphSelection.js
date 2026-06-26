import { getSubgraphEntryFlowId } from '@graphLayout';

export { getSubgraphEntryFlowId };

/** Узел принадлежит поддереву раскрытого host (включая вложенные подграфы). */
export function isNodeUnderHost(
	nodeId,
	hostFlowId,
	nodes
) {
	if (nodeId === hostFlowId) return true;

	const byId = new Map(nodes.map((node) => [node.id, node]));
	let current = byId.get(nodeId);
	while (current?.parentHostFlowId) {
		if (current.parentHostFlowId === hostFlowId) return true;
		current = byId.get(current.parentHostFlowId);
	}
	return false;
}