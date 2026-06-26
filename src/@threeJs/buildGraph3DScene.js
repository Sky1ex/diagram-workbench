import {
	buildInlineFlowScene,
	resolveGraphSizeProfile
} from '@graphLayout';

import { assignDagreLayout3D } from './assignDagreLayout3D';

function toGraph3DNodes(
	flowNodes,
	positionById,
	expandedHostFlowIds
) {
	const result = [];

	for (const node of flowNodes) {
		const position = positionById.get(node.id);
		if (!position) continue;

		const data = node.data;
		const isLayoutAnchor = Boolean(data.isLayoutAnchor);
		const isExpandedHost = isLayoutAnchor && expandedHostFlowIds.has(node.id);

		if (isLayoutAnchor && !isExpandedHost) continue;

		const isFolder =
			Boolean(data.subgraphId) && !isLayoutAnchor || isExpandedHost;

		result.push({
			id: node.id,
			position,
			label: data.fullLabel ?? data.label,
			isFolder,
			subgraphId: data.subgraphId,
			isLayoutAnchor: false,
			parentHostFlowId: data.parentHostFlowId
		});
	}

	return result;
}

function toGraph3DEdges(flowEdges, positionById) {
	const edges = [];

	for (const edge of flowEdges) {
		if (!positionById.has(edge.source) || !positionById.has(edge.target)) {
			continue;
		}
		edges.push({
			id: edge.id,
			sourceId: edge.source,
			targetId: edge.target
		});
	}

	return edges;
}

export function buildGraph3DScene(
	document,
	expandedHostFlowIds,
	layoutMode) {
	const documentNodeCount = Object.values(document.graphs).reduce(
		(sum, graph) => sum + graph.nodes.length,
		0
	);
	const profile = resolveGraphSizeProfile(documentNodeCount);
	const { nodes: flowNodes, edges: flowEdges } = buildInlineFlowScene(document, expandedHostFlowIds, {
		sizeProfile: profile
	});
	const positionById = assignDagreLayout3D(
		flowNodes,
		flowEdges,
		expandedHostFlowIds,
		document,
		layoutMode
	);

	return {
		nodes: toGraph3DNodes(flowNodes, positionById, expandedHostFlowIds),
		edges: toGraph3DEdges(flowEdges, positionById),
		positionsByNodeId: positionById
	};
}