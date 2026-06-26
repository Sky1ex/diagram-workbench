import {
	PolylineEdgeStyle,
	Stroke
} from 'yfiles';

import { hideEdge, isEdgeMarkedVoid, restoreVisibleEdgeStyle } from './applyYFilesStyles';

const EDGE_STROKE = '#8a96ad';
const EDGE_HIGHLIGHT_STROKE = '#2563eb';

let defaultEdgeStyle = null;

export function createDefaultEdgeStyle() {
	return new PolylineEdgeStyle({
		stroke: new Stroke(EDGE_STROKE, 1.5)
	});
}

export function rememberDefaultEdgeStyle(style) {
	defaultEdgeStyle = style;
}

function highlightEdgeStyle() {
	return new PolylineEdgeStyle({
		stroke: new Stroke(EDGE_HIGHLIGHT_STROKE, 2.5)
	});
}

function isEdgeHiddenByFilter(edge, filter) {
	if (!filter.visibilityActive) return false;

	const sourceTag = edge.sourceNode?.tag;
	const targetTag = edge.targetNode?.tag;
	if (!sourceTag?.graphId || !sourceTag.localId || !targetTag?.graphId || !targetTag.localId) {
		return true;
	}

	const sourceFlowId = `${sourceTag.graphId}:${sourceTag.localId}`;
	const targetFlowId = `${targetTag.graphId}:${targetTag.localId}`;
	const flowId = `${sourceTag.graphId}:${sourceTag.localId}->${targetTag.localId}:0`;

	return (
		!filter.visibleNodeIds.has(sourceFlowId) ||
		!filter.visibleNodeIds.has(targetFlowId) ||
		!filter.visibleEdgeIds.has(flowId)
	);
}

export function applyEdgeSelectionHighlight(
	graph,
	graphComponent,
	selectedNode,
	filter = { visibilityActive: false, visibleNodeIds: new Set(), visibleEdgeIds: new Set() }
) {
	const normal = defaultEdgeStyle ?? createDefaultEdgeStyle();
	const highlight = highlightEdgeStyle();
	const incident = selectedNode ? new Set(graph.edgesAt(selectedNode)) : null;

	for (const edge of graph.edges) {
		if (isEdgeHiddenByFilter(edge, filter)) {
			if (!isEdgeMarkedVoid(edge)) {
				hideEdge(graph, edge);
			}
			continue;
		}

		if (!incident) {
			restoreVisibleEdgeStyle(graph, edge);
			continue;
		}

		graph.setStyle(edge, incident.has(edge) ? highlight : normal);
	}

	graphComponent.invalidate();
}

export function reapplyEdgeSelectionHighlight(
	graphComponent,
	filter = { visibilityActive: false, visibleNodeIds: new Set(), visibleEdgeIds: new Set() }
) {
	const graph = graphComponent.graph;
	const selected = graphComponent.selection.selectedNodes.toArray();
	applyEdgeSelectionHighlight(
		graph,
		graphComponent,
		selected.length === 1 ? selected[0] : null,
		filter
	);
}