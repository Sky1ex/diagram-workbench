import { Position } from '@xyflow/react';

import {
	COMPACT_DAG_NODE_SIZE,
	COMPACT_FOLDER_NODE_SIZE,
	DAG_NODE_SIZE,
	FOLDER_NODE_SIZE
} from './constants';

import { toFlowEdgeId, toFlowNodeId } from './flowNodeId';

function truncateLabel(label, maxLen) {
	if (label.length <= maxLen) return label;
	return `${label.slice(0, maxLen - 1)}…`;
}

function nodeSizes(isFolder, profile) {
	if (profile === 'compact') {
		return isFolder ? COMPACT_FOLDER_NODE_SIZE : COMPACT_DAG_NODE_SIZE;
	}
	return isFolder ? FOLDER_NODE_SIZE : DAG_NODE_SIZE;
}

function createFlowNode(
	graphId,
	nodeDef,
	kind,
	profile,
	extra
) {
	const isFolder = kind === 'folder' || kind === 'layoutAnchor';
	const size = nodeSizes(isFolder, profile);
	const compact = profile === 'compact';
	const labelMaxLen = compact ? 14 : 48;

	const type =
		kind === 'layoutAnchor' ? 'layoutAnchor' : kind === 'folder' ? 'folderNode' : 'dagNode';

	return {
		id: toFlowNodeId(graphId, nodeDef.id),
		type,
		position: { x: 0, y: 0 },
		sourcePosition: Position.Bottom,
		targetPosition: Position.Top,
		data: {
			label: truncateLabel(nodeDef.label, labelMaxLen),
			fullLabel: nodeDef.label,
			localId: nodeDef.id,
			graphId,
			subgraphId: nodeDef.subgraphId,
			width: size.width,
			height: size.height,
			compact,
			isLayoutAnchor: kind === 'layoutAnchor',
			...extra
		},
		style: { width: size.width, height: size.height }
	};
}

function buildGraphLevel(
	document,
	graph,
	expandedHostFlowIds,
	profile,
	hostContextFlowId
) {
	const nodes = [];
	const edges = [];
	const edgeType = profile === 'compact' ? 'step' : 'elkEdge';
	const edgeCount = new Map();

	for (const nodeDef of graph.nodes) {
		const flowId = toFlowNodeId(graph.id, nodeDef.id);
		const hasSubgraph = Boolean(nodeDef.subgraphId);
		const expanded = hasSubgraph && expandedHostFlowIds.has(flowId);

		if (expanded && nodeDef.subgraphId) {
			const subgraph = document.graphs[nodeDef.subgraphId];
			if (subgraph) {
				const anchor = createFlowNode(graph.id, nodeDef, 'layoutAnchor', profile);
				nodes.push({
					...anchor,
					data: {
						...anchor.data,
						...(hostContextFlowId && hostContextFlowId !== flowId ?
							{ parentHostFlowId: hostContextFlowId } :
							{})
					}
				});
				const inner = buildGraphLevel(
					document,
					subgraph,
					expandedHostFlowIds,
					profile,
					flowId
				);
				for (const child of inner.nodes) {
					nodes.push({
						...child,
						data: {
							...child.data,
							parentHostFlowId: child.data.parentHostFlowId ?? flowId
						}
					});
				}
				edges.push(...inner.edges);
				continue;
			}
		}

		const node = createFlowNode(graph.id, nodeDef, hasSubgraph ? 'folder' : 'dag', profile, {
			isExpanded: false
		});
		nodes.push({
			...node,
			data: {
				...node.data,
				parentHostFlowId: hostContextFlowId
			}
		});
	}

	for (const edgeDef of graph.edges) {
		const key = `${edgeDef.source}|${edgeDef.target}`;
		const index = edgeCount.get(key) ?? 0;
		edgeCount.set(key, index + 1);
		edges.push({
			id: toFlowEdgeId(graph.id, edgeDef.source, edgeDef.target, index),
			source: toFlowNodeId(graph.id, edgeDef.source),
			target: toFlowNodeId(graph.id, edgeDef.target),
			type: edgeType,
			...(profile === 'compact' ? { pathOptions: { borderRadius: 0 } } : {})
		});
	}

	return { nodes, edges };
}

/**
 * Собирает плоскую RF-сцену с inline expand: раскрытые folder заменяются
 * якорем (для рёбер) + дочерними узлами подграфа. После layout — wrapExpandedGroups.
 */
export function buildInlineFlowScene(
	document,
	expandedHostFlowIds,
	options = {}
) {
	const profile = options.sizeProfile ?? 'default';
	const root = document.graphs[document.rootGraphId];
	if (!root) {
		return { nodes: [], edges: [] };
	}
	return buildGraphLevel(document, root, expandedHostFlowIds, profile);
}