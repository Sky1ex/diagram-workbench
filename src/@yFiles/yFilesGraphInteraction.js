import {
	GraphEditorInputMode,
	GraphItemTypes,
	IEdge,
	INode,
	Point
} from 'yfiles';

import { findGraphNode, nodeToHitAttributes } from '@graphContext';

import { toFlowEdgeId, toFlowNodeId } from '@graphLayout';

import {
	applyDefaultGraphStyles,
	hideEdge,
	hideNode,
	isEdgeMarkedVoid,
	isNodeMarkedVoid,
	restoreVisibleEdgeStyle,
	restoreVisibleNodeStyle
} from './applyYFilesStyles';

import { reapplyEdgeSelectionHighlight } from './yFilesSelectionHighlight';
import { shouldPreserveFolderChrome } from './yFilesFolderChrome';

export function installYFilesFilterInputGuards(inputMode) {
	inputMode.selectablePredicate = (item) => {
		if (INode.isInstance(item) && isNodeMarkedVoid(item)) return false;
		if (IEdge.isInstance(item) && isEdgeMarkedVoid(item)) return false;
		return true;
	};
}

function resolveEdgeFlowId(
	graphId,
	sourceLocalId,
	targetLocalId
) {
	return toFlowEdgeId(graphId, sourceLocalId, targetLocalId, 0);
}

function isNodeHidden(
	flowId,
	visibleNodeIds,
	visibilityActive
) {
	return visibilityActive && !visibleNodeIds.has(flowId);
}

function isEdgeHidden(
	edge,
	visibleNodeIds,
	visibleEdgeIds,
	visibilityActive
) {
	if (!visibilityActive) return false;

	const sourceTag = edge.sourceNode?.tag;
	const targetTag = edge.targetNode?.tag;
	if (!sourceTag || !targetTag) return true;

	const sourceFlowId = toFlowNodeId(sourceTag.graphId, sourceTag.localId);
	const targetFlowId = toFlowNodeId(targetTag.graphId, targetTag.localId);
	const flowId = resolveEdgeFlowId(sourceTag.graphId, sourceTag.localId, targetTag.localId);

	return (
		!visibleNodeIds.has(sourceFlowId) ||
		!visibleNodeIds.has(targetFlowId) ||
		!visibleEdgeIds.has(flowId));

}

export function applyYFilesFilterVisibility(
	graphComponent,
	foldingView,
	_document,
	visibleNodeIds,
	visibleEdgeIds,
	visibilityActive
) {
	const graph = graphComponent.graph;
	const filter = { visibilityActive, visibleNodeIds, visibleEdgeIds };

	if (!visibilityActive) {
		applyDefaultGraphStyles(graph, {
			preserveExpandedFolderChrome: (node, tag) =>
				shouldPreserveFolderChrome(graph, node, tag, foldingView)
		});
		reapplyEdgeSelectionHighlight(graphComponent, filter);
		graphComponent.invalidate();
		return;
	}

	for (const node of graph.nodes) {
		const tag = node.tag;
		if (!tag) continue;
		if (shouldPreserveFolderChrome(graph, node, tag, foldingView)) continue;

		const flowId = toFlowNodeId(tag.graphId, tag.localId);
		const hidden = isNodeHidden(flowId, visibleNodeIds, visibilityActive);
		const voided = isNodeMarkedVoid(node);

		if (hidden && !voided) {
			hideNode(graph, node);
		} else if (!hidden && voided) {
			restoreVisibleNodeStyle(graph, node);
		}
	}

	for (const edge of graph.edges) {
		const hidden = isEdgeHidden(edge, visibleNodeIds, visibleEdgeIds, visibilityActive);
		const voided = isEdgeMarkedVoid(edge);

		if (hidden && !voided) {
			hideEdge(graph, edge);
		} else if (!hidden && voided) {
			restoreVisibleEdgeStyle(graph, edge);
		}
	}

	reapplyEdgeSelectionHighlight(graphComponent, filter);
	graphComponent.invalidate();
}

function resolveHitItem(
	inputMode,
	graphComponent,
	clientX,
	clientY
) {
	const rect = graphComponent.div.getBoundingClientRect();
	const viewLocation = new Point(clientX - rect.left, clientY - rect.top);
	const worldLocation = graphComponent.toWorldCoordinates(viewLocation);
	const hits = inputMode.findItems(worldLocation, [GraphItemTypes.NODE, GraphItemTypes.EDGE]);

	for (const hit of hits) {
		if (INode.isInstance(hit) || IEdge.isInstance(hit)) {
			return hit;
		}
	}
	return null;
}

function buildContextMenuRequest(
	item,
	clientX,
	clientY,
	isExpanded
) {
	if (INode.isInstance(item)) {
		const tag = item.tag;
		if (!tag) {
			throw new Error('yFiles node is missing tag');
		}
		return {
			clientX,
			clientY,
			target: {
				kind: 'node',
				flowId: toFlowNodeId(tag.graphId, tag.localId),
				label: tag.label,
				isFolder: Boolean(tag.subgraphId),
				isExpanded
			},
			attributes: {
				label: tag.label,
				subgraphId: tag.subgraphId,
				graphId: tag.graphId,
				localId: tag.localId,
				flowId: toFlowNodeId(tag.graphId, tag.localId)
			}
		};
	}

	if (!IEdge.isInstance(item)) {
		throw new Error('Unsupported yFiles context menu item');
	}

	const edge = item;
	const sourceTag = edge.sourceNode?.tag;
	const targetTag = edge.targetNode?.tag;
	const graphId = sourceTag?.graphId ?? targetTag?.graphId ?? '';
	const sourceLocalId = sourceTag?.localId ?? '';
	const targetLocalId = targetTag?.localId ?? '';
	const flowId = resolveEdgeFlowId(graphId, sourceLocalId, targetLocalId);

	return {
		clientX,
		clientY,
		target: {
			kind: 'edge',
			flowId,
			label: `${sourceTag?.label ?? sourceLocalId} → ${targetTag?.label ?? targetLocalId}`
		},
		attributes: {
			label: `${sourceTag?.label ?? sourceLocalId} → ${targetTag?.label ?? targetLocalId}`,
			graphId,
			flowId
		}
	};
}

/** DOM fallback: надёжнее, чем PopulateItemContextMenuListener с showMenu=false. */
export function installYFilesContextMenuHandler(options) {
	const { graphComponent, inputMode, foldingView, document, onOpenContextMenu } = options;

	inputMode.contextMenuInputMode.enabled = false;

	const handleContextMenu = (event) => {
		event.preventDefault();
		event.stopPropagation();

		const item = resolveHitItem(inputMode, graphComponent, event.clientX, event.clientY);
		if (!item) return;

		let isExpanded = false;
		if (INode.isInstance(item)) {
			const tag = item.tag;
			if (tag?.subgraphId) {
				const masterNode = foldingView.getMasterItem(item) ?? item;
				isExpanded = foldingView.isExpanded(masterNode);
			}
		}

		const built = buildContextMenuRequest(item, event.clientX, event.clientY, isExpanded);
		const graphNode = findGraphNode(document, built.target.flowId);
		const attributes =
			graphNode && INode.isInstance(item) ?
				nodeToHitAttributes(graphNode, item.tag.graphId) :
				built.attributes;

		onOpenContextMenu({
			rendererId: 'yfiles',
			...built,
			attributes
		});
	};

	const div = graphComponent.div;
	div.addEventListener('contextmenu', handleContextMenu, true);
	return () => div.removeEventListener('contextmenu', handleContextMenu, true);
}

export function buildYFilesContextMenuRequest(
	graphComponent,
	item,
	queryLocation,
	isExpanded = false
) {
	const viewPoint = graphComponent.toViewCoordinates(queryLocation);
	const rect = graphComponent.div.getBoundingClientRect();
	const clientX = rect.left + viewPoint.x;
	const clientY = rect.top + viewPoint.y;
	return buildContextMenuRequest(item, clientX, clientY, isExpanded);
}