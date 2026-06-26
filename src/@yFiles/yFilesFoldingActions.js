import { toFlowNodeId } from '@graphLayout';

function folderDepth(graph, node) {
	let depth = 0;
	let parent = graph.getParent(node);
	while (parent) {
		depth += 1;
		parent = graph.getParent(parent);
	}
	return depth;
}

/** Folder-узлы из master graph (view graph не содержит детей у свёрнутых папок). */
export function listFolderNodes(masterGraph) {
	const folders = [];
	for (const node of masterGraph.nodes) {
		if (masterGraph.getChildren(node).size > 0) {
			folders.push(node);
		}
	}
	return folders;
}

function folderFlowId(node) {
	const tag = node.tag;
	if (!tag?.subgraphId) return null;
	return toFlowNodeId(tag.graphId, tag.localId);
}

/**
 * Приводит folding view к `expandedHostFlowIds` (как inline-сцена в Three.js / фильтре).
 * Сначала сворачивает лишнее (глубокие папки), затем раскрывает нужное (мелкие → крупные).
 */
export function syncFoldingViewToExpandedIds(
	foldingView,
	expandedHostFlowIds
) {
	const masterGraph = foldingView.manager.masterGraph;
	const folders = listFolderNodes(masterGraph);
	let changed = false;

	for (const node of folders.sort(
		(a, b) => folderDepth(masterGraph, b) - folderDepth(masterGraph, a)
	)) {
		const flowId = folderFlowId(node);
		if (!flowId || expandedHostFlowIds.has(flowId)) continue;
		if (!foldingView.isExpanded(node)) continue;
		foldingView.collapse(node);
		changed = true;
	}

	for (const node of folders.sort(
		(a, b) => folderDepth(masterGraph, a) - folderDepth(masterGraph, b)
	)) {
		const flowId = folderFlowId(node);
		if (!flowId || !expandedHostFlowIds.has(flowId)) continue;
		if (foldingView.isExpanded(node)) continue;
		foldingView.expand(node);
		changed = true;
	}

	return changed;
}

/** Свернуть все папки (сначала вложенные, затем верхний уровень). */
export function collapseAllFolders(foldingView) {
	const masterGraph = foldingView.manager.masterGraph;
	const folders = listFolderNodes(masterGraph).sort(
		(a, b) => folderDepth(masterGraph, b) - folderDepth(masterGraph, a)
	);
	for (const node of folders) {
		if (foldingView.isExpanded(node)) {
			foldingView.collapse(node);
		}
	}
}

/** Раскрыть все папки (сначала верхний уровень, затем вложенные). */
export function expandAllFolders(foldingView) {
	const masterGraph = foldingView.manager.masterGraph;
	const folders = listFolderNodes(masterGraph).sort(
		(a, b) => folderDepth(masterGraph, a) - folderDepth(masterGraph, b)
	);
	for (const node of folders) {
		if (!foldingView.isExpanded(node)) {
			foldingView.expand(node);
		}
	}
}