import dagre from 'dagre';

import { DAGRE_GRAPH_OPTIONS, DAGRE_LARGE_GRAPH_OPTIONS, isLargeGraph } from './constants';

export function runDagreLayout(
	nodes,
	edges
) {
	if (nodes.length === 0) {
		return { nodes, edges };
	}

	const graph = new dagre.graphlib.Graph();
	graph.setDefaultEdgeLabel(() => ({}));
	const graphOptions = isLargeGraph(nodes.length) ? DAGRE_LARGE_GRAPH_OPTIONS : DAGRE_GRAPH_OPTIONS;
	graph.setGraph(graphOptions);

	for (const node of nodes) {
		graph.setNode(node.id, {
			width: node.data.width,
			height: node.data.height
		});
	}

	for (const edge of edges) {
		graph.setEdge(edge.source, edge.target);
	}

	dagre.layout(graph);

	const layoutedNodes = nodes.map((node) => {
		const layoutNode = graph.node(node.id);
		return {
			...node,
			position: {
				x: layoutNode.x - node.data.width / 2,
				y: layoutNode.y - node.data.height / 2
			}
		};
	});

	return { nodes: layoutedNodes, edges };
}