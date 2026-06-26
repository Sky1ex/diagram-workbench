import { Position } from '@xyflow/react';

import {
	COMPACT_DAG_NODE_SIZE,
	COMPACT_FOLDER_NODE_SIZE,
	DAG_NODE_SIZE,
	FOLDER_NODE_SIZE
} from './constants';

function flowNodeId(graphId, localId) {
	return `${graphId}:${localId}`;
}

function flowEdgeId(graphId, source, target, index) {
	return `${graphId}:${source}->${target}:${index}`;
}

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

/**
 * Строит React Flow nodes/edges из одного уровня GraphDefinition (activeGraph).
 * Позиции — заглушка; раскладку выполняет runElkLayout / runDagreLayout.
 */
export function graphDefToFlowElements(
	graph,
	options = {}
) {
	const profile = options.sizeProfile ?? 'default';
	const compact = profile === 'compact';
	const labelMaxLen = compact ? 14 : 48;

	const nodes = graph.nodes.map((nodeDef) => {
		const isFolder = Boolean(nodeDef.subgraphId);
		const size = nodeSizes(isFolder, profile);
		return {
			id: flowNodeId(graph.id, nodeDef.id),
			type: isFolder ? 'folderNode' : 'dagNode',
			position: { x: 0, y: 0 },
			sourcePosition: Position.Bottom,
			targetPosition: Position.Top,
			data: {
				label: truncateLabel(nodeDef.label, labelMaxLen),
				fullLabel: nodeDef.label,
				localId: nodeDef.id,
				graphId: graph.id,
				subgraphId: nodeDef.subgraphId,
				width: size.width,
				height: size.height,
				compact
			},
			style: { width: size.width, height: size.height }
		};
	});

	const edgeType = compact ? 'step' : 'elkEdge';
	const edgeCount = new Map();
	const edges = graph.edges.map((edgeDef) => {
		const key = `${edgeDef.source}|${edgeDef.target}`;
		const index = edgeCount.get(key) ?? 0;
		edgeCount.set(key, index + 1);
		return {
			id: flowEdgeId(graph.id, edgeDef.source, edgeDef.target, index),
			source: flowNodeId(graph.id, edgeDef.source),
			target: flowNodeId(graph.id, edgeDef.target),
			type: edgeType,
			...(compact ? { pathOptions: { borderRadius: 0 } } : {})
		};
	});

	return { nodes, edges };
}