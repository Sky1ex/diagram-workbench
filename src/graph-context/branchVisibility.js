import { buildInlineFlowScene } from '@graphLayout';

import {
	collectInlineSceneContext,
	computeVisibleEdges
} from './filterGraphScene';

function isDescendantOf(
	flowId,
	ancestorFlowId,
	parentHostByFlowId) {
	let parent = parentHostByFlowId.get(flowId);
	while (parent) {
		if (parent === ancestorFlowId) return true;
		parent = parentHostByFlowId.get(parent);
	}
	return false;
}

function buildOutgoingAdjacency(
	edges,
	scopeNodeIds) {
	const adj = new Map();

	for (const edge of edges) {
		if (!scopeNodeIds.has(edge.source) || !scopeNodeIds.has(edge.target)) continue;
		let targets = adj.get(edge.source);
		if (!targets) {
			targets = new Set();
			adj.set(edge.source, targets);
		}
		targets.add(edge.target);
	}

	return adj;
}

/** Обход только по исходящим рёбрам от seed-узлов; anchor не скрывается. */
function collectOutgoingReachable(
	startIds,
	anchorFlowId,
	scopeNodeIds,
	adj
) {
	const hidden = new Set();
	const visited = new Set();
	const queue = [];

	const enqueue = (id) => {
		if (visited.has(id) || !scopeNodeIds.has(id)) return;
		visited.add(id);
		queue.push(id);
	};

	for (const startId of startIds) {
		for (const next of adj.get(startId) ?? []) {
			enqueue(next);
		}
	}

	while (queue.length > 0) {
		const current = queue.shift();
		if (current === anchorFlowId) continue;
		hidden.add(current);
		for (const next of adj.get(current) ?? []) {
			enqueue(next);
		}
	}

	return hidden;
}

/**
 * Узлы, скрываемые при «Скрыть детей» для anchor:
 * иерархические потомки в текущей сцене + исходящая цепочка по рёбрам
 * (без обхода «вверх» к родителям и соседям через входящие рёбра).
 */
export function collectNodesHiddenByBranchAnchor(
	anchorFlowId,
	document,
	expandedHostFlowIds
) {
	const { scopeNodeIds, parentHostByFlowId } = collectInlineSceneContext(
		document,
		expandedHostFlowIds
	);
	if (!scopeNodeIds.has(anchorFlowId)) return new Set();

	const scene = buildInlineFlowScene(document, expandedHostFlowIds);
	const hidden = new Set();

	for (const flowId of scopeNodeIds) {
		if (flowId !== anchorFlowId && isDescendantOf(flowId, anchorFlowId, parentHostByFlowId)) {
			hidden.add(flowId);
		}
	}

	const adj = buildOutgoingAdjacency(scene.edges, scopeNodeIds);
	const edgeReachable = collectOutgoingReachable(
		[anchorFlowId, ...hidden],
		anchorFlowId,
		scopeNodeIds,
		adj
	);
	for (const flowId of edgeReachable) {
		hidden.add(flowId);
	}

	hidden.delete(anchorFlowId);
	return hidden;
}

function collectAllBranchHiddenNodes(
	hiddenBranchAnchors,
	document,
	expandedHostFlowIds
) {
	const result = new Set();
	for (const anchor of hiddenBranchAnchors) {
		for (const flowId of collectNodesHiddenByBranchAnchor(
			anchor,
			document,
			expandedHostFlowIds
		)) {
			result.add(flowId);
		}
	}
	return result;
}

export function applyBranchHidingToVisibility(
	base,
	hiddenBranchAnchors,
	document,
	expandedHostFlowIds
) {
	if (hiddenBranchAnchors.size === 0) return base;

	const branchHidden = collectAllBranchHiddenNodes(
		hiddenBranchAnchors,
		document,
		expandedHostFlowIds
	);
	if (branchHidden.size === 0) return base;

	const scene = buildInlineFlowScene(document, expandedHostFlowIds);
	const { scopeNodeIds } = collectInlineSceneContext(document, expandedHostFlowIds);

	const visibleNodeIds = new Set(
		[...base.visibleNodeIds].filter((flowId) => !branchHidden.has(flowId))
	);

	for (const anchor of hiddenBranchAnchors) {
		if (scopeNodeIds.has(anchor)) {
			visibleNodeIds.add(anchor);
		}
	}

	const visibleEdgeIds = computeVisibleEdges(scene, visibleNodeIds);

	return {
		...base,
		visibleNodeIds,
		visibleEdgeIds,
		shownNodes: visibleNodeIds.size
	};
}