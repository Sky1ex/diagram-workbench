import { toFlowNodeId } from './flowNodeId';

function findHostSubgraph(
	document,
	hostFlowId
) {
	for (const graph of Object.values(document.graphs)) {
		for (const node of graph.nodes) {
			if (!node.subgraphId) continue;
			if (toFlowNodeId(graph.id, node.id) !== hostFlowId) continue;

			const subgraph = document.graphs[node.subgraphId];
			if (!subgraph || subgraph.nodes.length === 0) return null;
			return { hostGraphId: graph.id, subgraph };
		}
	}
	return null;
}

/** Local id entry-узла подграфа (минимальный depth). */
export function getSubgraphEntryNodeId(subgraph) {
	if (subgraph.nodes.length === 0) return null;
	const minDepth = Math.min(...subgraph.nodes.map((node) => node.depth));
	const entry = subgraph.nodes.find((node) => node.depth === minDepth);
	return entry?.id ?? null;
}

/** Local id exit-узла подграфа (максимальный depth, предпочтение sink). */
export function getSubgraphExitNodeId(subgraph) {
	if (subgraph.nodes.length === 0) return null;
	const maxDepth = Math.max(...subgraph.nodes.map((node) => node.depth));
	const candidates = subgraph.nodes.filter((node) => node.depth === maxDepth);
	const sinks = candidates.filter(
		(node) => !subgraph.edges.some((edge) => edge.source === node.id)
	);
	const exit = (sinks.length > 0 ? sinks : candidates)[0];
	return exit?.id ?? null;
}

/** Flow id entry-узла подграфа (минимальный depth). */
export function getSubgraphEntryFlowId(
	document,
	hostFlowId
) {
	const found = findHostSubgraph(document, hostFlowId);
	if (!found) return null;

	const entryId = getSubgraphEntryNodeId(found.subgraph);
	return entryId ? toFlowNodeId(found.subgraph.id, entryId) : null;
}

/** Flow id exit-узла подграфа (максимальный depth, предпочтение sink). */
export function getSubgraphExitFlowId(
	document,
	hostFlowId
) {
	const found = findHostSubgraph(document, hostFlowId);
	if (!found) return null;

	const exitId = getSubgraphExitNodeId(found.subgraph);
	return exitId ? toFlowNodeId(found.subgraph.id, exitId) : null;
}