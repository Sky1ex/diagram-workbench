import { getSubgraphEntryFlowId, getSubgraphExitFlowId } from './subgraphPorts';

/**
 * Рёбра parent-графа, идущие в/из folder, перенаправляет на entry/exit узлы
 * раскрытого подграфа — иначе связь «внешний мир ↔ подграф» теряется после wrap.
 */
export function resolveInlineExpandEdges(
	edges,
	document,
	expandedHostFlowIds
) {
	if (expandedHostFlowIds.size === 0) return edges;

	return edges.map((edge) => {
		let { source, target } = edge;

		if (expandedHostFlowIds.has(source)) {
			source = getSubgraphExitFlowId(document, source) ?? source;
		}
		if (expandedHostFlowIds.has(target)) {
			target = getSubgraphEntryFlowId(document, target) ?? target;
		}

		if (source === edge.source && target === edge.target) return edge;
		return { ...edge, source, target };
	});
}