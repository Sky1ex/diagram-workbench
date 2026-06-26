import { toFlowNodeId } from '@graphLayout';

function collectFromGraph(document, graph, out) {
	for (const node of graph.nodes) {
		if (!node.subgraphId) continue;
		out.push(toFlowNodeId(graph.id, node.id));
		const subgraph = document.graphs[node.subgraphId];
		if (subgraph) collectFromGraph(document, subgraph, out);
	}
}

/** Все folder host id (`graphId:localId`) в документе — для «Развернуть все». */
export function collectFolderHostFlowIds(document) {
	const result = [];
	const root = document.graphs[document.rootGraphId];
	if (root) collectFromGraph(document, root, result);
	return result;
}