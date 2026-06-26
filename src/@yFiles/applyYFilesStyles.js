import {
	DefaultLabelStyle,
	Font,
	HorizontalTextAlignment,
	ShapeNodeShape,
	ShapeNodeStyle,
	Size,
	Stroke,
	TextWrapping,
	VerticalTextAlignment,
	VoidEdgeStyle,
	VoidLabelStyle,
	VoidNodeStyle
} from 'yfiles';

import { getSharedFolderGroupStyle } from './yFilesFolderConverter';
import {
	createDefaultEdgeStyle,
	rememberDefaultEdgeStyle
} from './yFilesSelectionHighlight';

export const YFILES_DAG_NODE_SIZE = { width: 152, height: 52 };
export const YFILES_FOLDER_NODE_SIZE = { width: 196, height: 64 };

let cachedStyles = null;

function createWrappedLabelStyle(maxWidth, maxHeight) {
	return new DefaultLabelStyle({
		font: new Font({ fontSize: 11 }),
		textFill: '#1a1f36',
		horizontalTextAlignment: HorizontalTextAlignment.CENTER,
		verticalTextAlignment: VerticalTextAlignment.CENTER,
		wrapping: TextWrapping.WORD,
		maximumSize: new Size(maxWidth, maxHeight)
	});
}

function getCachedStyles() {
	if (cachedStyles) return cachedStyles;

	const dagLabelStyle = createWrappedLabelStyle(
		YFILES_DAG_NODE_SIZE.width - 12,
		YFILES_DAG_NODE_SIZE.height - 10
	);
	const folderLabelStyle = createWrappedLabelStyle(
		YFILES_FOLDER_NODE_SIZE.width - 16,
		YFILES_FOLDER_NODE_SIZE.height - 10
	);
	const nodeStyle = new ShapeNodeStyle({
		shape: ShapeNodeShape.ROUND_RECTANGLE,
		fill: '#f4f6fb',
		stroke: new Stroke('#5b6b8c', 1.5)
	});
	const groupStyle = getSharedFolderGroupStyle();
	const edgeStyle = createDefaultEdgeStyle();
	rememberDefaultEdgeStyle(edgeStyle);

	cachedStyles = { nodeStyle, groupStyle, dagLabelStyle, folderLabelStyle, edgeStyle };
	return cachedStyles;
}

function isFolderNode(graph, node, tag) {
	return Boolean(tag?.subgraphId) || graph.getChildren(node).size > 0;
}

export function isVoidNodeStyle(style) {
	return style === VoidNodeStyle.INSTANCE;
}

export function isVoidLabelStyle(style) {
	return style === VoidLabelStyle.INSTANCE;
}

export function isVoidEdgeStyle(style) {
	return style === VoidEdgeStyle.INSTANCE;
}

const voidNodes = new WeakSet();
const voidEdges = new WeakSet();

export function markNodeVoid(node) {
	voidNodes.add(node);
}

export function markNodeVisible(node) {
	voidNodes.delete(node);
}

export function isNodeMarkedVoid(node) {
	return voidNodes.has(node);
}

export function markEdgeVoid(edge) {
	voidEdges.add(edge);
}

export function markEdgeVisible(edge) {
	voidEdges.delete(edge);
}

export function isEdgeMarkedVoid(edge) {
	return voidEdges.has(edge);
}

export function clearVoidMarks(graph) {
	for (const node of graph.nodes) {
		voidNodes.delete(node);
	}
	for (const edge of graph.edges) {
		voidEdges.delete(edge);
	}
}

export function forceRestoreNodeStyle(graph, node) {
	const styles = getCachedStyles();
	const tag = node.tag;
	const isFolder = isFolderNode(graph, node, tag);

	if (isFolder) {
		graph.setStyle(node, styles.groupStyle);
		markNodeVisible(node);
		for (const label of node.labels) {
			graph.setStyle(label, styles.folderLabelStyle);
		}
		return;
	}

	graph.setStyle(node, styles.nodeStyle);
	markNodeVisible(node);
	for (const label of node.labels) {
		graph.setStyle(label, styles.dagLabelStyle);
	}
}

export function restoreVisibleNodeStyle(graph, node) {
	if (!isNodeMarkedVoid(node)) return;
	forceRestoreNodeStyle(graph, node);
}

export function forceRestoreEdgeStyle(graph, edge) {
	const styles = getCachedStyles();
	graph.setStyle(edge, styles.edgeStyle);
	markEdgeVisible(edge);
	for (const label of edge.labels) {
		graph.setStyle(label, styles.dagLabelStyle);
	}
}

export function restoreVisibleEdgeStyle(graph, edge) {
	if (!isEdgeMarkedVoid(edge)) return;
	forceRestoreEdgeStyle(graph, edge);
}

export function hideNode(graph, node) {
	graph.setStyle(node, VoidNodeStyle.INSTANCE);
	markNodeVoid(node);
	for (const label of node.labels) {
		hideLabel(graph, label);
	}
}

export function hideEdge(graph, edge) {
	graph.setStyle(edge, VoidEdgeStyle.INSTANCE);
	markEdgeVoid(edge);
	for (const label of edge.labels) {
		hideLabel(graph, label);
	}
}

function hideLabel(graph, label) {
	graph.setStyle(label, VoidLabelStyle.INSTANCE);
}

export function applyDefaultGraphStyles(
	graph,
	options) {
	clearVoidMarks(graph);
	const styles = getCachedStyles();
	const preserveChrome = options?.preserveExpandedFolderChrome;

	graph.nodeDefaults.style = styles.nodeStyle;
	graph.nodeDefaults.labels.style = styles.dagLabelStyle;
	graph.edgeDefaults.style = styles.edgeStyle;
	graph.edgeDefaults.labels.style = styles.dagLabelStyle;

	for (const node of graph.nodes) {
		const tag = node.tag;
		if (preserveChrome?.(node, tag)) {
			markNodeVisible(node);
			continue;
		}
		forceRestoreNodeStyle(graph, node);
	}

	for (const edge of graph.edges) {
		forceRestoreEdgeStyle(graph, edge);
	}
}