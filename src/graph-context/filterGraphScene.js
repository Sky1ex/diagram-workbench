import { buildInlineFlowScene } from '@graphLayout';

import { isFilterActive } from './graphFilterTypes';

import { findGraphNode } from './resolveGraphNode';
import { endOfUtcDay, startOfUtcDay } from './filterDateUtils';

export function collectInlineSceneContext(
	document,
	expandedHostFlowIds
) {
	const scene = buildInlineFlowScene(document, expandedHostFlowIds);
	const scopeNodeIds = new Set();
	const scopeEdgeIds = new Set();
	const parentHostByFlowId = new Map();

	for (const node of scene.nodes) {
		if (node.type === 'layoutAnchor') continue;
		scopeNodeIds.add(node.id);
		parentHostByFlowId.set(node.id, node.data.parentHostFlowId);
	}

	for (const edge of scene.edges) {
		scopeEdgeIds.add(edge.id);
	}

	return { scopeNodeIds, scopeEdgeIds, parentHostByFlowId };
}

function nodeMatchesFilter(node, criteria) {
	const labelQuery = criteria.labelContains?.trim().toLowerCase();
	if (labelQuery && !node.label.toLowerCase().includes(labelQuery)) {
		return false;
	}

	if (criteria.maxDepth !== undefined && node.depth > criteria.maxDepth) {
		return false;
	}

	if (criteria.hasSubgraph !== undefined) {
		const hasSubgraph = Boolean(node.subgraphId);
		if (hasSubgraph !== criteria.hasSubgraph) return false;
	}

	if (criteria.startAfter !== undefined) {
		if (node.start === undefined || node.start < startOfUtcDay(criteria.startAfter)) return false;
	}

	if (criteria.startBefore !== undefined) {
		if (node.start === undefined || node.start > endOfUtcDay(criteria.startBefore)) return false;
	}

	if (criteria.endAfter !== undefined) {
		if (node.end === undefined || node.end < startOfUtcDay(criteria.endAfter)) return false;
	}

	if (criteria.endBefore !== undefined) {
		if (node.end === undefined || node.end > endOfUtcDay(criteria.endBefore)) return false;
	}

	return true;
}

function addAncestorFolders(
	flowId,
	parentHostByFlowId,
	scopeNodeIds,
	visibleNodeIds
) {
	let parent = parentHostByFlowId.get(flowId);
	while (parent) {
		if (scopeNodeIds.has(parent)) {
			visibleNodeIds.add(parent);
		}
		parent = parentHostByFlowId.get(parent);
	}
}

export function computeVisibleEdges(
	scene,
	visibleNodeIds
) {
	const visibleEdgeIds = new Set();
	for (const edge of scene.edges) {
		if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
			visibleEdgeIds.add(edge.id);
		}
	}
	return visibleEdgeIds;
}

/**
 * Фильтр работает только по узлам текущей «inline»-сцены (root + раскрытые folder),
 * как Three.js / React Flow. Условия между полями — AND.
 * Папки-предки подходящих узлов остаются видимыми для навигации.
 */
export function computeFilterVisibility(
	document,
	criteria,
	expandedHostFlowIds
) {
	const scene = buildInlineFlowScene(document, expandedHostFlowIds);
	const { scopeNodeIds, scopeEdgeIds, parentHostByFlowId } = collectInlineSceneContext(
		document,
		expandedHostFlowIds
	);
	const totalNodes = scopeNodeIds.size;

	if (!isFilterActive(criteria)) {
		return {
			visibleNodeIds: scopeNodeIds,
			visibleEdgeIds: scopeEdgeIds,
			shownNodes: totalNodes,
			totalNodes,
			matchedNodes: totalNodes,
			noMatchesInView: false
		};
	}

	const matching = new Set();
	for (const flowId of scopeNodeIds) {
		const node = findGraphNode(document, flowId);
		if (node && nodeMatchesFilter(node, criteria)) {
			matching.add(flowId);
		}
	}

	if (matching.size === 0) {
		return {
			visibleNodeIds: scopeNodeIds,
			visibleEdgeIds: scopeEdgeIds,
			shownNodes: totalNodes,
			totalNodes,
			matchedNodes: 0,
			noMatchesInView: true
		};
	}

	const visibleNodeIds = new Set(matching);
	for (const flowId of matching) {
		addAncestorFolders(flowId, parentHostByFlowId, scopeNodeIds, visibleNodeIds);
	}

	const visibleEdgeIds = computeVisibleEdges(scene, visibleNodeIds);

	return {
		visibleNodeIds,
		visibleEdgeIds,
		shownNodes: visibleNodeIds.size,
		totalNodes,
		matchedNodes: matching.size,
		noMatchesInView: false
	};
}

export function collectDistinctDepthsInScope(
	document,
	expandedHostFlowIds
) {
	const { scopeNodeIds } = collectInlineSceneContext(document, expandedHostFlowIds);
	const depths = new Set();
	for (const flowId of scopeNodeIds) {
		const node = findGraphNode(document, flowId);
		if (node) depths.add(node.depth);
	}
	return [...depths].sort((a, b) => a - b);
}

export function documentHasTimeline(document) {
	for (const graph of Object.values(document.graphs)) {
		for (const node of graph.nodes) {
			if (node.start !== undefined && node.end !== undefined) return true;
		}
	}
	return document.timelineStart !== undefined && document.timelineEnd !== undefined;
}